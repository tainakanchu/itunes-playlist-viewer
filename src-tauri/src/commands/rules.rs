use tauri::AppHandle;

use crate::commands::library::open_db;
use crate::playlist_rules::{self, ApplyResult, EvaluationResult};

#[tauri::command]
pub fn validate_rules(yaml: String) -> Result<(), String> {
    playlist_rules::validate_rules(&yaml)
}

#[tauri::command]
pub fn preview_rules(app: AppHandle, yaml: String) -> Result<EvaluationResult, String> {
    let db = open_db(&app)?;
    playlist_rules::preview_rules(&db, &yaml)
}

#[tauri::command]
pub fn apply_rules(app: AppHandle, yaml: String) -> Result<ApplyResult, String> {
    let db = open_db(&app)?;
    playlist_rules::apply_rules(&db, &yaml)
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| format!("Failed to write {}: {}", path, e))
}
