use tauri::AppHandle;

use crate::ffmpeg;

/// 変換用 ffmpeg の現在の状態（場所・取得元・自動DL可否）を返す。
#[tauri::command]
pub fn get_ffmpeg_status(app: AppHandle) -> ffmpeg::FfmpegStatus {
    ffmpeg::status(&app)
}

/// ffmpeg を取得する（既にあればその場所を返す）。進捗は `ffmpeg-progress` で配信。
#[tauri::command]
pub async fn download_ffmpeg(app: AppHandle) -> Result<String, String> {
    let p = ffmpeg::ensure(&app).await?;
    Ok(p.display().to_string())
}
