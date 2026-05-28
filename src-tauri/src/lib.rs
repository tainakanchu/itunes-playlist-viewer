mod audio;
mod cd_ripper;
mod commands;
mod db;
mod importer;
mod itunes_xml;
mod metadata;
mod models;

use std::sync::Mutex;

pub fn run() {
    let audio_player = Mutex::new(audio::AudioPlayer::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(audio_player)
        .invoke_handler(tauri::generate_handler![
            // library
            commands::library::import_library,
            commands::library::export_library,
            commands::library::import_files,
            commands::library::get_tracks,
            commands::library::search_tracks,
            commands::library::get_library_stats,
            // playlists
            commands::playlists::get_playlists,
            commands::playlists::get_playlist_tracks,
            commands::playlists::create_playlist,
            commands::playlists::rename_playlist,
            commands::playlists::delete_playlist,
            commands::playlists::add_tracks_to_playlist,
            commands::playlists::remove_track_from_playlist,
            commands::playlists::reorder_playlist_tracks,
            // playback
            commands::playback::play_track,
            commands::playback::pause,
            commands::playback::resume,
            commands::playback::stop,
            commands::playback::seek,
            commands::playback::get_playback_state,
            commands::playback::get_recent_tracks,
            // ripping
            commands::ripping::detect_disc,
            commands::ripping::lookup_release_by_disc_id,
            commands::ripping::lookup_release_by_toc,
            commands::ripping::compute_disc_id,
            commands::ripping::rip_cd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
