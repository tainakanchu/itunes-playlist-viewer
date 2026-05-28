use serde::{Deserialize, Serialize};

// === Library models ===

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: i64,
    pub track_id: i64,
    pub persistent_id: Option<String>,
    pub name: Option<String>,
    pub artist: Option<String>,
    pub album_artist: Option<String>,
    pub composer: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i64>,
    pub rating: Option<i64>,
    pub play_count: Option<i64>,
    pub skip_count: Option<i64>,
    pub total_time_ms: Option<i64>,
    pub date_added: Option<String>,
    pub date_modified: Option<String>,
    pub bpm: Option<i64>,
    pub comments: Option<String>,
    pub location_raw: Option<String>,
    pub location_path: Option<String>,
    pub track_type: Option<String>,
    pub disabled: bool,
    pub compilation: bool,
    pub disc_number: Option<i64>,
    pub disc_count: Option<i64>,
    pub track_number: Option<i64>,
    pub track_count: Option<i64>,
    pub file_exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
    pub id: i64,
    pub playlist_id: i64,
    pub persistent_id: Option<String>,
    pub parent_persistent_id: Option<String>,
    pub name: String,
    pub is_folder: bool,
    pub is_smart: bool,
    pub is_user_created: bool,
    pub track_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackState {
    pub is_playing: bool,
    pub current_track_id: Option<i64>,
    pub position_ms: u64,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub track_count: usize,
    pub playlist_count: usize,
    pub missing_files: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub output_path: String,
    pub track_count: usize,
    pub playlist_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryStats {
    pub track_count: i64,
    pub playlist_count: i64,
    pub total_time_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueueState {
    pub track_ids: Vec<i64>,
    pub current_index: Option<i64>,
    pub shuffle: bool,
    pub repeat: String,
    pub volume: f32,
}

/// トラックの編集可能フィールドのパッチ。
/// - `String` 系: `Some("")` で空文字に、`None` で変更なし
/// - 数値系の Option<Option<T>>: `Some(Some(v))` で設定、`Some(None)` で NULL に、`None` で変更なし
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TrackEdit {
    pub name: Option<String>,
    pub artist: Option<String>,
    pub album_artist: Option<String>,
    pub composer: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub comments: Option<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub year: Option<Option<i64>>,
    #[serde(default, deserialize_with = "double_option")]
    pub bpm: Option<Option<i64>>,
    pub rating: Option<i64>,
    #[serde(default, deserialize_with = "double_option")]
    pub track_number: Option<Option<i64>>,
    #[serde(default, deserialize_with = "double_option")]
    pub track_count: Option<Option<i64>>,
    #[serde(default, deserialize_with = "double_option")]
    pub disc_number: Option<Option<i64>>,
    #[serde(default, deserialize_with = "double_option")]
    pub disc_count: Option<Option<i64>>,
}

/// `null` を「明示的にクリア」と扱うために、二重 Option を必要とする。
fn double_option<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: serde::Deserializer<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenreTagCount {
    pub tag: String,
    pub count: i64,
}

// === CD / ripping models ===

/// 物理 CD ドライブから読み取った TOC + disc id。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscToc {
    /// `cd-discid` が返した freedb 形式の disc id (16 進)。
    pub freedb_id: String,
    /// MusicBrainz 形式の disc id (Base64-like)。
    pub musicbrainz_id: Option<String>,
    /// CD ドライブパス (例: /dev/sr0)。
    pub device: String,
    pub track_count: usize,
    /// 各トラックのフレーム単位の長さ (75 frames/sec)。
    pub track_lengths_sec: Vec<u32>,
    /// CD 全体のセクタ長 (info 用)。
    pub total_sectors: u32,
}

/// MusicBrainz から取得したリリース候補。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseCandidate {
    pub release_id: String,
    pub title: String,
    pub artist: String,
    pub date: Option<String>,
    pub country: Option<String>,
    pub barcode: Option<String>,
    pub track_count: usize,
    pub tracks: Vec<ReleaseTrack>,
    pub cover_art_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseTrack {
    pub position: usize,
    pub title: String,
    pub artist: String,
    pub length_ms: Option<u64>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum EncodeFormat {
    Flac,
    Mp3,
    Alac,
    Wav,
}

impl EncodeFormat {
    pub fn extension(&self) -> &'static str {
        match self {
            EncodeFormat::Flac => "flac",
            EncodeFormat::Mp3 => "mp3",
            EncodeFormat::Alac => "m4a",
            EncodeFormat::Wav => "wav",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RipRequest {
    pub device: String,
    pub output_dir: String,
    pub format: EncodeFormat,
    /// 1-based トラック番号 (空なら全件)。
    pub tracks: Vec<usize>,
    /// 適用するメタデータ (見つからなければ None — その場合はトラック番号で命名)。
    pub release: Option<ReleaseCandidate>,
    /// 取り込み完了後にライブラリに追加するか。
    pub add_to_library: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum RipProgress {
    Start { total: usize },
    TrackStart { index: usize, total: usize, label: String },
    TrackProgress { index: usize, percent: u8 },
    TrackDone { index: usize, output_path: String },
    Done { written_files: Vec<String>, added_tracks: usize },
    Error { message: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportFileResult {
    pub added_tracks: usize,
    pub skipped: usize,
}
