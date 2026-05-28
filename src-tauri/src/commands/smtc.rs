use std::sync::Mutex;

use crate::smtc::{self, SmtcState};

#[tauri::command]
pub fn update_smtc(
    state: tauri::State<'_, Mutex<SmtcState>>,
    title: String,
    artist: String,
    album: String,
    is_playing: bool,
    position_ms: u64,
    duration_ms: u64,
) -> Result<(), String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    smtc::update(
        &mut s,
        &title,
        &artist,
        &album,
        is_playing,
        position_ms,
        duration_ms,
    )
}
