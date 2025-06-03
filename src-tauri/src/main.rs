// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db_pool;
mod embedding;
mod libsql;
mod state;

use anyhow::Result;
use thunderbolt_lib::create_app;

#[tokio::main]
async fn main() -> Result<()> {
    create_app()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
