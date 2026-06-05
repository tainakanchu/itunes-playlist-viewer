use tauri::AppHandle;

use crate::updater;

#[tauri::command]
pub async fn check_for_update() -> Result<updater::UpdateInfo, String> {
    updater::check_for_update().await
}

/// アップデートを取得して適用する。
/// インストーラなら起動し、ポータブル zip なら exe を差し替えて再起動し、
/// 現プロセスを終了して新しい exe へ入れ替える。
#[tauri::command]
pub async fn download_and_run_update(app: AppHandle, url: String) -> Result<String, String> {
    let out = updater::download_and_run(&url).await?;
    if updater::is_portable_zip_url(&url) {
        // 新プロセス起動済み。現プロセスを終了して置き換える。
        app.exit(0);
    }
    Ok(out)
}
