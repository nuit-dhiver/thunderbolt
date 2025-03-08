// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use anyhow::Result;
use migration::{Migrator, MigratorTrait};
use sea_orm::{Database, DatabaseConnection};
use std::{env, sync::Mutex};
use tauri::{command, ActivationPolicy, Manager, State};

use entity::{message::Model as Message, *};

const openai_api_key: &str = "";

#[derive(Default)]
struct AppState {
    db: DatabaseConnection,
}

#[command]
async fn init_db(state: State<'_, Mutex<AppState>>, path: String) -> Result<(), String> {
    let conn = Database::connect(path)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    Migrator::up(&conn, None)
        .await
        .map_err(|e| format!("Failed to run migrations: {}", e))?;

    let mut state = state
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    state.db = conn;

    Ok(())
}

#[command]
fn get_openai_api_key() -> String {
    // println!(
    //     "get_openai_api_key {}",
    //     env::var("OPENAI_API_KEY").unwrap_or_default()
    // );

    // if let Ok(path) = env::var("CARGO_MANIFEST_DIR") {
    //     let env_path = std::path::Path::new(&path).join(".env");
    //     if env_path.exists() {
    //         dotenv::from_path(env_path).ok();
    //     }
    // }

    // let open_ai_api_key =
    //     env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY environment variable must be set");

    openai_api_key.to_string()
}

#[command]
async fn get_setting(
    state: State<'_, Mutex<AppState>>,
    id: String,
) -> Result<Option<setting::Model>, String> {
    use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

    let db = state
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?
        .db
        .clone();

    setting::Entity::find()
        .filter(setting::Column::Id.eq(id))
        .one(&db)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

#[command]
async fn set_setting(
    state: State<'_, Mutex<AppState>>,
    key: String,
    value: String,
) -> Result<setting::Model, String> {
    use chrono::Utc;
    use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

    let db = state
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?
        .db
        .clone();

    // Check if setting exists
    let setting_exists = setting::Entity::find()
        .filter(setting::Column::Id.eq(&key))
        .one(&db)
        .await
        .map_err(|e| format!("Failed to query setting: {}", e))?
        .is_some();

    let active_model = if setting_exists {
        // Update existing setting
        let existing = setting::Entity::find()
            .filter(setting::Column::Id.eq(&key))
            .one(&db)
            .await
            .map_err(|e| format!("Failed to retrieve existing setting: {}", e))?
            .ok_or_else(|| "Setting unexpectedly not found".to_string())?;

        let mut active_model = existing.into_active_model();
        active_model.value = Set(value);
        active_model.updated_at = Set(Utc::now());
        active_model
    } else {
        // Create new setting
        setting::ActiveModel {
            id: Set(key),
            value: Set(value),
            updated_at: Set(Utc::now()),
            ..Default::default()
        }
    };

    // Save to database
    if setting_exists {
        active_model
            .update(&db)
            .await
            .map_err(|e| format!("Failed to update setting: {}", e))
    } else {
        active_model
            .insert(&db)
            .await
            .map_err(|e| format!("Failed to insert setting: {}", e))
    }
}

#[command]
async fn toggle_dock_icon(app_handle: tauri::AppHandle, show: bool) -> Result<(), String> {
    if cfg!(target_os = "macos") {
        let policy = if show {
            ActivationPolicy::Regular
        } else {
            ActivationPolicy::Accessory
        };

        let _ = app_handle.set_activation_policy(policy);
    }

    Ok(())
}

#[command]
async fn fetch_inbox_top(count: Option<usize>) -> Result<Vec<Message>, String> {
    println!("fetch_inbox_top {:?}", count);
    // imap_client::fetch_inbox_top(Some(3)).map_err(|e| e.to_string())
    Ok(vec![])
}

#[command]
async fn get_or_create_stronghold_password(
    service_name: String,
    username: String,
) -> Result<String, String> {
    return Ok("password".to_string());
}

#[command]
async fn process_message(message: message::Model) -> Result<(), String> {
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    // This should be called as early in the execution of the app as possible
    #[cfg(debug_assertions)] // only enable instrumentation in development builds
    let devtools = tauri_plugin_devtools::init();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .plugin(mozilla_assist_lib::libsql_plugin::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            app.manage(Mutex::new(AppState::default()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_openai_api_key,
            toggle_dock_icon, // Add the new command
            fetch_inbox_top,
            get_or_create_stronghold_password,
            process_message,
            get_setting,
            set_setting,
            init_db,
        ]);

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(devtools);
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
