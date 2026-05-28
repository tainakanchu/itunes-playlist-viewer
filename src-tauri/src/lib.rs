mod audio;
mod cd_ripper;
mod commands;
mod db;
mod importer;
mod itunes_xml;
mod metadata;
mod models;
mod playlist_rules;

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
            commands::library::update_track,
            commands::library::set_track_rating,
            commands::library::add_genre_tag,
            commands::library::remove_genre_tag,
            commands::library::get_all_genre_tags,
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
            commands::playback::set_queue,
            commands::playback::enqueue_track,
            commands::playback::clear_queue,
            commands::playback::get_queue,
            commands::playback::play_next,
            commands::playback::play_prev,
            commands::playback::set_shuffle,
            commands::playback::set_repeat,
            commands::playback::set_volume,
            commands::playback::check_advance,
            // ripping
            commands::ripping::detect_disc,
            commands::ripping::lookup_release_by_disc_id,
            commands::ripping::lookup_release_by_toc,
            commands::ripping::compute_disc_id,
            commands::ripping::rip_cd,
            // declarative playlist rules
            commands::rules::validate_rules,
            commands::rules::preview_rules,
            commands::rules::apply_rules,
            commands::rules::read_text_file,
            commands::rules::write_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
