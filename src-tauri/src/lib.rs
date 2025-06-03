pub mod commands;
pub mod db_pool;
pub mod embedding;
pub mod libsql;
pub mod settings;
pub mod state;

use anyhow::Result;
use tauri::{Manager};
use tokio::sync::Mutex;
use crate::state::AppState;

// Import all commands from commands module
use crate::commands::{
    toggle_dock_icon,
    init_imap,
    init_imap_sync,
    list_mailboxes,
    fetch_inbox,
    fetch_messages,
    sync_mailbox,
    get_env,
    init_bridge,
    set_bridge_enabled,
    get_bridge_status,
    get_bridge_connection_status,
};

// Shared app builder function
pub fn create_app() -> tauri::Builder<tauri::Wry> {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            app.manage(Mutex::new(AppState::default()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_dock_icon,
            libsql::init_libsql,
            libsql::execute,
            libsql::select,
            init_imap,
            init_imap_sync,
            fetch_inbox,
            fetch_messages,
            list_mailboxes,
            sync_mailbox,
            embedding::generate_embeddings,
            embedding::init_embedder,
            get_env,
            init_bridge,
            set_bridge_enabled,
            get_bridge_status,
            get_bridge_connection_status
        ]);

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_devtools::init());
    }

    builder
}

// For iOS - this is the function that the iOS bindings expect
#[no_mangle]
pub extern "C" fn start_app() {
    std::env::set_var("RUST_BACKTRACE", "1");
    
    tauri::async_runtime::block_on(async {
        create_app()
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}
