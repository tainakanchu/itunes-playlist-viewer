//! 内部モデル + フロントに返すシリアライズ用構造体。

use serde::Serialize;

use super::schema::SortRule;

/// rule 1 つを評価した結果の生成プレイリスト。
/// `path` と `track_ids` 以外はデバッグ・将来拡張用。
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct GeneratedPlaylist {
    pub name: String,
    /// namespace を含まない相対パス。
    pub path: String,
    /// namespace を含む絶対パス。
    pub full_path: String,
    pub parent_path: Option<String>,
    pub track_ids: Vec<i64>,
    pub sort: Option<Vec<SortRule>>,
}

/// 階層描画用のツリーノード (フォルダ or プレイリスト)。フロントにそのまま返す。
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TreeNodeOut {
    Folder(FolderNodeOut),
    Playlist(PlaylistNodeOut),
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderNodeOut {
    pub name: String,
    pub full_path: String,
    pub parent_path: Option<String>,
    pub children: Vec<TreeNodeOut>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistNodeOut {
    pub name: String,
    pub full_path: String,
    pub parent_path: Option<String>,
    pub track_ids: Vec<i64>,
}

/// Preview コマンドが返す結果。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluationResult {
    pub tree: FolderNodeOut,
    pub playlist_count: usize,
    pub folder_count: usize,
    /// プレイリストが参照しているユニークなトラック数。
    pub referenced_track_count: usize,
}

/// Apply コマンドが返す結果。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyResult {
    pub generated_playlist_count: usize,
    pub generated_folder_count: usize,
    pub removed_existing: bool,
}
