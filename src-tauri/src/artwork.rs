//! 音声ファイルに埋め込まれたジャケット画像 (embedded picture) を取り出す。
//!
//! iTunes XML はアートワークを含まないため、トラックの実ファイルに埋め込まれた
//! 先頭の picture を読む。`artwork://localhost/<percent-encoded path>` のカスタム
//! URI スキーム経由でフロントの `<img>` から遅延ロードされる (lib.rs で登録)。

use lofty::config::WriteOptions;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::picture::{MimeType, Picture, PictureType};
use lofty::probe::Probe;
use lofty::tag::Tag;

/// 指定ファイルの先頭埋め込み画像を `(バイト列, MIME)` で返す。無ければ `None`。
pub fn extract_picture(path: &str) -> Option<(Vec<u8>, String)> {
    let tagged = Probe::open(path).ok()?.read().ok()?;
    let tag = tagged.primary_tag().or_else(|| tagged.first_tag())?;
    // CoverFront を優先（複数枚や型ゆらぎに強くする）。無ければ先頭。
    let pic = tag
        .pictures()
        .iter()
        .find(|p| p.pic_type() == PictureType::CoverFront)
        .or_else(|| tag.pictures().first())?;
    let mime = pic
        .mime_type()
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "image/jpeg".to_string());
    Some((pic.data().to_vec(), mime))
}

/// 埋め込み用に画像を PNG/JPEG へ正規化して `(バイト列, MIME)` を返す。
/// - PNG / JPEG はそのまま（再エンコードしない）。
/// - それ以外（WebP/GIF/BMP 等）は decode して JPEG(品質90) に変換する。
///   埋め込みカバーは MP4(covr) 等が JPEG/PNG しか確実に表示できないため。
fn normalize_for_embed(data: Vec<u8>) -> Result<(Vec<u8>, MimeType), String> {
    // PNG マジック
    if data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        return Ok((data, MimeType::Png));
    }
    // JPEG マジック (FF D8 FF)
    if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Ok((data, MimeType::Jpeg));
    }
    // それ以外は image でデコード → JPEG 再エンコード（JPEG はアルファ非対応なので RGB8 に落とす）。
    let img = image::ImageReader::new(std::io::Cursor::new(&data))
        .with_guessed_format()
        .map_err(|e| format!("image format guess failed: {e}"))?
        .decode()
        .map_err(|e| format!("image decode failed: {e}"))?;
    let rgb = img.to_rgb8();
    let mut out: Vec<u8> = Vec::new();
    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 90)
        .encode_image(&rgb)
        .map_err(|e| format!("jpeg encode failed: {e}"))?;
    Ok((out, MimeType::Jpeg))
}

/// 指定ファイルのカバーアートを差し替える (既存の CoverFront を消して新規追加)。
pub fn set_picture(path: &str, data: Vec<u8>) -> Result<(), String> {
    if data.len() < 4 {
        return Err("Empty image data".to_string());
    }
    let mut tagged = Probe::open(path)
        .map_err(|e| format!("open failed: {e}"))?
        .read()
        .map_err(|e| format!("probe failed: {e}"))?;

    if tagged.primary_tag_mut().is_none() {
        let tt = tagged.primary_tag_type();
        tagged.insert_tag(Tag::new(tt));
    }
    let tag = tagged.primary_tag_mut().ok_or("no primary tag")?;

    let (data, mime) = normalize_for_embed(data)?;
    // 既存カバー（形式により CoverFront/Other 等まちまち）を取りこぼさないよう全削除してから追加。
    for i in (0..tag.pictures().len()).rev() {
        tag.remove_picture(i);
    }
    tag.push_picture(Picture::new_unchecked(
        PictureType::CoverFront,
        Some(mime),
        None,
        data,
    ));

    tagged
        .save_to_path(path, WriteOptions::default())
        .map_err(|e| format!("save artwork failed: {e}"))?;
    Ok(())
}

/// 指定ファイルの埋め込みカバー(front)を削除する（新規画像は追加しない）。
/// カバーが無い場合は何もせず Ok（無駄な mtime 更新を避ける）。
pub fn remove_cover(path: &str) -> Result<(), String> {
    let mut tagged = Probe::open(path)
        .map_err(|e| format!("open failed: {e}"))?
        .read()
        .map_err(|e| format!("probe failed: {e}"))?;

    let Some(tag) = tagged.primary_tag_mut() else {
        return Ok(()); // タグ無し = カバー無し
    };

    // ピクチャが無ければ書き換えない（mtime を無駄に更新しない）。
    if tag.pictures().is_empty() {
        return Ok(());
    }
    // 形式による型ゆらぎに取りこぼさないよう全カバーを削除する。
    for i in (0..tag.pictures().len()).rev() {
        tag.remove_picture(i);
    }
    tagged
        .save_to_path(path, WriteOptions::default())
        .map_err(|e| format!("save artwork failed: {e}"))?;
    Ok(())
}
