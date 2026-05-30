//! 音声ファイルに埋め込まれたジャケット画像 (embedded picture) を取り出す。
//!
//! iTunes XML はアートワークを含まないため、トラックの実ファイルに埋め込まれた
//! 先頭の picture を読む。`artwork://localhost/<percent-encoded path>` のカスタム
//! URI スキーム経由でフロントの `<img>` から遅延ロードされる (lib.rs で登録)。

use lofty::file::TaggedFileExt;
use lofty::probe::Probe;

/// 指定ファイルの先頭埋め込み画像を `(バイト列, MIME)` で返す。無ければ `None`。
pub fn extract_picture(path: &str) -> Option<(Vec<u8>, String)> {
    let tagged = Probe::open(path).ok()?.read().ok()?;
    let tag = tagged.primary_tag().or_else(|| tagged.first_tag())?;
    let pic = tag.pictures().first()?;
    let mime = pic
        .mime_type()
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "image/jpeg".to_string());
    Some((pic.data().to_vec(), mime))
}
