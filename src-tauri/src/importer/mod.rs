use std::path::Path;

use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::Accessor;

use crate::db::Database;
use crate::itunes_xml::writer::path_to_file_url;
use crate::models::ImportFileResult;

/// 任意の音声ファイル群をライブラリ DB に追加する。
/// 既存パスとの重複検査は行わない (UI 側で確認することを想定)。
pub fn import_files(db: &Database, paths: &[String]) -> ImportFileResult {
    let mut added = 0usize;
    let mut skipped = 0usize;

    for raw_path in paths {
        let path = Path::new(raw_path);
        if !path.exists() {
            skipped += 1;
            continue;
        }

        match read_and_insert(db, path) {
            Ok(()) => added += 1,
            Err(e) => {
                eprintln!("import_files: skipped {} ({})", raw_path, e);
                skipped += 1;
            }
        }
    }

    ImportFileResult {
        added_tracks: added,
        skipped,
    }
}

fn read_and_insert(db: &Database, path: &Path) -> Result<(), String> {
    let tagged = Probe::open(path)
        .map_err(|e| format!("open failed: {}", e))?
        .read()
        .map_err(|e| format!("probe failed: {}", e))?;

    let properties = tagged.properties();
    let total_time_ms = Some(properties.duration().as_millis() as i64);

    let tag = tagged.primary_tag().or_else(|| tagged.first_tag());

    let (title, artist, album_artist, album, genre, year, track_number, track_count): (
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<i64>,
        Option<i64>,
        Option<i64>,
    ) = match tag {
        Some(t) => (
            t.title().map(|s| s.to_string()),
            t.artist().map(|s| s.to_string()),
            // lofty doesn't expose album_artist uniformly; we let it default to None
            // and fall back to artist in the DB call below.
            None,
            t.album().map(|s| s.to_string()),
            t.genre().map(|s| s.to_string()),
            t.year().map(|y| y as i64),
            t.track().map(|n| n as i64),
            t.track_total().map(|n| n as i64),
        ),
        None => (None, None, None, None, None, None, None, None),
    };

    // Fall back to filename if no title tag.
    let fallback_title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .map(String::from);
    let title = title.or(fallback_title);

    // Fall back: parent dir = album, grandparent = artist (Music/Artist/Album/Track.mp3).
    let parent = path.parent().and_then(|p| p.file_name()).and_then(|s| s.to_str());
    let grandparent = path
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.file_name())
        .and_then(|s| s.to_str());
    let album = album.or_else(|| parent.map(String::from));
    let artist = artist.or_else(|| grandparent.map(String::from));

    let location_path = path.to_string_lossy().to_string();
    let location_url = path_to_file_url(&location_path);

    db.add_imported_track(
        title.as_deref(),
        artist.as_deref(),
        album_artist.as_deref().or(artist.as_deref()),
        album.as_deref(),
        genre.as_deref(),
        year,
        track_number,
        track_count,
        None,
        None,
        total_time_ms,
        &location_path,
        &location_url,
    )
    .map_err(|e| format!("db insert failed: {}", e))?;

    Ok(())
}
