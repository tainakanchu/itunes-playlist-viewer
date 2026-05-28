use std::sync::Mutex;

use tauri::AppHandle;

use crate::audio::AudioPlayer;
use crate::commands::library::open_db;
use crate::models::{PlaybackState, Track};

#[tauri::command]
pub fn play_track(
    app: AppHandle,
    track_id: i64,
    player: tauri::State<'_, Mutex<AudioPlayer>>,
) -> Result<(), String> {
    let db = open_db(&app)?;
    let track = db
        .get_track_by_track_id(track_id)
        .map_err(|e| e.to_string())?
        .ok_or("Track not found")?;

    let path = track.location_path.as_deref().unwrap_or("");
    if path.is_empty() {
        return Err("No file path for this track".to_string());
    }

    let duration = track.total_time_ms.unwrap_or(0) as u64;
    player
        .lock()
        .map_err(|e| e.to_string())?
        .play(path, track_id, duration)?;

    db.add_recent_track(track_id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pause(player: tauri::State<'_, Mutex<AudioPlayer>>) -> Result<(), String> {
    player.lock().map_err(|e| e.to_string())?.pause();
    Ok(())
}

#[tauri::command]
pub fn resume(player: tauri::State<'_, Mutex<AudioPlayer>>) -> Result<(), String> {
    player.lock().map_err(|e| e.to_string())?.resume();
    Ok(())
}

#[tauri::command]
pub fn stop(player: tauri::State<'_, Mutex<AudioPlayer>>) -> Result<(), String> {
    player.lock().map_err(|e| e.to_string())?.stop();
    Ok(())
}

#[tauri::command]
pub fn seek(
    player: tauri::State<'_, Mutex<AudioPlayer>>,
    position_ms: u64,
) -> Result<(), String> {
    player.lock().map_err(|e| e.to_string())?.seek(position_ms);
    Ok(())
}

#[tauri::command]
pub fn get_playback_state(
    player: tauri::State<'_, Mutex<AudioPlayer>>,
) -> Result<PlaybackState, String> {
    Ok(player.lock().map_err(|e| e.to_string())?.get_state())
}

#[tauri::command]
pub fn get_recent_tracks(app: AppHandle, limit: Option<i64>) -> Result<Vec<Track>, String> {
    let db = open_db(&app)?;
    db.get_recent_tracks(limit.unwrap_or(50))
        .map_err(|e| e.to_string())
}
