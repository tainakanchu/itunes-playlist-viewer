use tauri::{AppHandle, Manager};

use crate::db::Database;
use crate::importer;
use crate::itunes_xml::{parser, writer};
use crate::models::{ExportResult, ImportFileResult, ImportResult, LibraryStats, Track};

fn get_db(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Database::open(&app_dir).map_err(|e| format!("Failed to open database: {}", e))
}

#[tauri::command]
pub fn import_library(app: AppHandle, xml_path: String) -> Result<ImportResult, String> {
    let db = get_db(&app)?;
    let (track_count, playlist_count, missing_files) = parser::import_library(&xml_path, &db)?;

    db.set_state("last_xml_path", &xml_path)
        .map_err(|e| e.to_string())?;

    Ok(ImportResult {
        track_count,
        playlist_count,
        missing_files,
    })
}

#[tauri::command]
pub fn export_library(app: AppHandle, output_path: String) -> Result<ExportResult, String> {
    let db = get_db(&app)?;
    writer::export_library(&db, &output_path)
}

#[tauri::command]
pub fn import_files(app: AppHandle, paths: Vec<String>) -> Result<ImportFileResult, String> {
    let db = get_db(&app)?;
    Ok(importer::import_files(&db, &paths))
}

#[tauri::command]
pub fn get_tracks(
    app: AppHandle,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Track>, String> {
    let db = get_db(&app)?;
    db.get_tracks(limit.unwrap_or(500), offset.unwrap_or(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_tracks(
    app: AppHandle,
    query: String,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Track>, String> {
    let db = get_db(&app)?;
    db.search_tracks(&query, limit.unwrap_or(500), offset.unwrap_or(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_library_stats(app: AppHandle) -> Result<LibraryStats, String> {
    let db = get_db(&app)?;
    db.library_stats().map_err(|e| e.to_string())
}

pub(crate) fn open_db(app: &AppHandle) -> Result<Database, String> {
    get_db(app)
}
