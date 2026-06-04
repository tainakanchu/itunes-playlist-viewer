use tauri::AppHandle;

use crate::analyzer::Analyzer;
use crate::commands::library::open_db;
use crate::models::{AnalysisStatus, TrackAnalysis};

/// 指定トラックの解析をバックグラウンドキューへ投入する。
/// `force` で解析済みでも再解析する。進捗は `analysis-progress` イベントで届く。
#[tauri::command]
pub fn analyze_tracks(
    track_ids: Vec<i64>,
    force: Option<bool>,
    analyzer: tauri::State<'_, Analyzer>,
) -> Result<(), String> {
    analyzer.submit(track_ids, force.unwrap_or(false));
    Ok(())
}

/// 1 曲の解析結果を取得 (未解析なら null)。
#[tauri::command]
pub fn get_analysis(app: AppHandle, track_id: i64) -> Result<Option<TrackAnalysis>, String> {
    let db = open_db(&app)?;
    db.get_analysis(track_id).map_err(|e| e.to_string())
}

/// 解析の進捗サマリ (解析済み / 総数)。
#[tauri::command]
pub fn get_analysis_status(app: AppHandle) -> Result<AnalysisStatus, String> {
    let db = open_db(&app)?;
    let (analyzed, total) = db.analysis_status().map_err(|e| e.to_string())?;
    Ok(AnalysisStatus { analyzed, total })
}

/// 解析済みの全曲を返す (フロントが key/energy 列をまとめて引く / 類似度の母集合)。
#[tauri::command]
pub fn get_all_analyses(app: AppHandle) -> Result<Vec<TrackAnalysis>, String> {
    let db = open_db(&app)?;
    db.get_all_analysis().map_err(|e| e.to_string())
}
