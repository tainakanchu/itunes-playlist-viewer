//! 宣言的プレイリストビルダー。
//!
//! YAML で書かれたルールセットを受け取り、トラック条件評価 → ジェネレーター展開
//! → 階層フォルダ構築 → DB への書き込み、をまとめてやる。
//!
//! 詳細仕様は [tainakanchu/itunes-playlist-builder] の `doc.md` を参照。

pub mod condition;
pub mod evaluator;
pub mod folder_tree;
pub mod generator;
pub mod models;
pub mod registry;
pub mod runner;
pub mod schema;
pub mod sorter;

// Public for serde (referenced via EvaluationResult tree types in commands).
#[allow(unused_imports)]
pub use models::{ApplyResult, EvaluationResult, FolderNodeOut, PlaylistNodeOut, TreeNodeOut};
pub use runner::{apply_rules, preview_rules, validate_rules};
