use base64::{engine::general_purpose::STANDARD, Engine as _};
use libsql::{Connection, Error as LibsqlError, Value};
use serde::{ser::Serializer, Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::{collections::HashMap, fs::create_dir_all, path::PathBuf};
use tauri::{
    command,
    plugin::{Builder as PluginBuilder, PluginApi, TauriPlugin},
    AppHandle, Manager, RunEvent, Runtime, State,
};
use tokio::sync::Mutex;

type LastInsertId = i64;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Sql(#[from] LibsqlError),
    #[error("database {0} not loaded")]
    DatabaseNotLoaded(String),
    #[error("unsupported datatype: {0}")]
    UnsupportedDatatype(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

type Result<T> = std::result::Result<T, Error>;

/// Resolves the App's **file path** from the `AppHandle` context
/// object
fn app_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    app.path().app_data_dir().expect("No App path was found!")
}

/// Maps the user supplied DB connection string to a connection string
/// with a fully qualified file path to the App's designed "app_path"
fn path_mapper(mut app_path: PathBuf, connection_string: &str) -> String {
    app_path.push(
        connection_string
            .split_once(':')
            .expect("Couldn't parse the connection string for DB!")
            .1,
    );

    app_path
        .to_str()
        .expect("Problem creating fully qualified path to Database file!")
        .to_string()
}

#[derive(Default)]
struct DbInstances(Mutex<HashMap<String, Connection>>);

#[derive(Default, Deserialize, Clone)]
pub struct PluginConfig {
    #[serde(default)]
    preload: Vec<String>,
}

#[command]
async fn load<R: Runtime>(
    app: AppHandle<R>,
    db_instances: State<'_, DbInstances>,
    db: String,
) -> Result<String> {
    let fqdb = path_mapper(app_path(&app), &db);

    // Ensure directory exists
    if let Some(parent) = PathBuf::from(&fqdb).parent() {
        create_dir_all(parent).expect("Problem creating App directory!");
    }

    let database = libsql::Builder::new_local(&fqdb).build().await?;
    let conn = database.connect()?;

    db_instances.0.lock().await.insert(db.clone(), conn);
    Ok(db)
}

/// Allows the database connection(s) to be closed; if no database
/// name is passed in then _all_ database connection pools will be
/// shut down.
#[command]
async fn close(db_instances: State<'_, DbInstances>, db: Option<String>) -> Result<bool> {
    let mut instances = db_instances.0.lock().await;

    let dbs = if let Some(db) = db {
        vec![db]
    } else {
        instances.keys().cloned().collect()
    };

    for db_name in dbs {
        instances
            .remove(&db_name)
            .ok_or(Error::DatabaseNotLoaded(db_name))?;
    }

    Ok(true)
}

/// Execute a command against the database
#[command]
async fn execute(
    db_instances: State<'_, DbInstances>,
    db: String,
    query: String,
    values: Vec<JsonValue>,
) -> Result<(u64, LastInsertId)> {
    let mut instances = db_instances.0.lock().await;

    let conn = instances.get_mut(&db).ok_or(Error::DatabaseNotLoaded(db))?;
    let mut stmt = conn.prepare(&query).await?;

    // Create parameter values from JSON
    let params = create_params(&values)?;

    // Pass params directly, not as reference
    let affected = stmt.execute(params).await?;

    // libsql just returns the count as usize, no result object
    // We'll use 0 for last_insert_id (or implement another query to get it)
    let rows_affected = affected as u64;
    let last_insert_id = 0; // Would need separate "SELECT last_insert_rowid()" to get this

    Ok((rows_affected, last_insert_id))
}

#[command]
async fn select(
    db_instances: State<'_, DbInstances>,
    db: String,
    query: String,
    values: Vec<JsonValue>,
) -> Result<Vec<HashMap<String, JsonValue>>> {
    let mut instances = db_instances.0.lock().await;
    let conn = instances.get_mut(&db).ok_or(Error::DatabaseNotLoaded(db))?;

    let mut stmt = conn.prepare(&query).await?;

    // Create parameter values from JSON
    let params = create_params(&values)?;

    // Pass params directly, not as reference
    let mut rows = stmt.query(params).await?;

    let mut results = Vec::new();
    while let Some(row) = rows.next().await? {
        let mut value = HashMap::default();
        for i in 0..row.column_count() {
            let column_name = row.column_name(i).unwrap_or_default().to_string();
            let v = match row.get::<Value>(i) {
                Ok(v) => value_to_json(v),
                Err(_) => JsonValue::Null,
            };
            value.insert(column_name, v);
        }
        results.push(value);
    }

    Ok(results)
}

// Replace bind_values with this function to create params
fn create_params(values: &[JsonValue]) -> Result<Vec<libsql::Value>> {
    let mut params = Vec::with_capacity(values.len());

    for value in values {
        if value.is_null() {
            params.push(Value::Null);
        } else if let Some(s) = value.as_str() {
            params.push(Value::Text(s.to_string()));
        } else if let Some(n) = value.as_i64() {
            params.push(Value::Integer(n));
        } else if let Some(n) = value.as_f64() {
            params.push(Value::Real(n));
        } else if let Some(b) = value.as_bool() {
            params.push(Value::Integer(if b { 1 } else { 0 }));
        } else {
            // For complex types, serialize to JSON string
            params.push(Value::Text(value.to_string()));
        }
    }

    Ok(params)
}

fn value_to_json(value: Value) -> JsonValue {
    match value {
        Value::Null => JsonValue::Null,
        Value::Integer(i) => JsonValue::Number(i.into()),
        Value::Real(f) => {
            if let Some(n) = serde_json::Number::from_f64(f) {
                JsonValue::Number(n)
            } else {
                JsonValue::Null
            }
        }
        Value::Text(s) => JsonValue::String(s),
        Value::Blob(b) => {
            // Convert blob to base64 string
            let base64 = STANDARD.encode(&b);
            JsonValue::String(base64)
        }
    }
}

/// Tauri SQL plugin builder.
#[derive(Default)]
pub struct Builder {}

impl Builder {
    pub fn new() -> Self {
        Self {}
    }

    pub fn build<R: Runtime>(self) -> TauriPlugin<R, Option<PluginConfig>> {
        PluginBuilder::new("libsql")
            .invoke_handler(tauri::generate_handler![load, execute, select, close])
            .setup(|app, api: PluginApi<R, Option<PluginConfig>>| {
                let config = api.config().as_ref().cloned().unwrap_or_default();

                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    let instances = DbInstances::default();
                    let mut lock = instances.0.lock().await;
                    for db in &config.preload {
                        let fqdb = path_mapper(app_path(&app_handle), db);

                        // Ensure directory exists
                        if let Some(parent) = PathBuf::from(&fqdb).parent() {
                            create_dir_all(parent).expect("Problem creating App directory!");
                        }

                        let database = libsql::Builder::new_local(&fqdb).build().await.unwrap();
                        let conn = database.connect().unwrap();

                        lock.insert(db.to_string(), conn);
                    }
                    drop(lock);

                    app_handle.manage(instances);
                });

                Ok(())
            })
            .on_event(|app, event| {
                if let RunEvent::Exit = event {
                    tauri::async_runtime::block_on(async move {
                        let instances = app.state::<DbInstances>();
                        let mut instances = instances.0.lock().await;
                        instances.clear();
                    });
                }
            })
            .build()
    }
}
