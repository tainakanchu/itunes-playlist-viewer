use base64::Engine;
use sha1::{Digest, Sha1};

/// MusicBrainz disc ID を TOC から計算する。
///
/// 仕様: <https://musicbrainz.org/doc/Disc_ID_Calculation>
///
/// - `first_track`: 通常 1
/// - `last_track`: トラック数
/// - `leadout`: leadout (= データ末尾) のフレームオフセット (150 を含む絶対値)
/// - `offsets`: 各トラックの 1 始まりフレームオフセット (絶対値)。最大 99 要素。
pub fn calculate_musicbrainz_id(
    first_track: u8,
    last_track: u8,
    leadout: u32,
    offsets: &[u32],
) -> String {
    let mut input = String::with_capacity(2 + 2 + 8 + 8 * 99);
    input.push_str(&format!("{:02X}", first_track));
    input.push_str(&format!("{:02X}", last_track));
    input.push_str(&format!("{:08X}", leadout));

    for i in 1..=99 {
        let offset = if i <= last_track as usize {
            offsets.get(i - 1).copied().unwrap_or(0)
        } else {
            0
        };
        input.push_str(&format!("{:08X}", offset));
    }

    let mut hasher = Sha1::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();

    let encoded = base64::engine::general_purpose::STANDARD.encode(result);
    encoded
        .chars()
        .map(|c| match c {
            '+' => '.',
            '/' => '_',
            '=' => '-',
            other => other,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Round-trip プロパティ: 同じ入力なら同じ出力。長さは MB disc-id の 28 文字。
    /// (公式の比較ベクトルが手元に無いため、実機との比較は integration test で行う。)
    #[test]
    fn produces_28_char_id() {
        let offsets = [150, 17510, 33275, 45910, 57805];
        let id = calculate_musicbrainz_id(1, 5, 200000, &offsets);
        assert_eq!(id.len(), 28);
        // Custom alphabet excludes '+' and '/' (but uses '.' and '_').
        assert!(!id.contains('+'));
        assert!(!id.contains('/'));
    }

    #[test]
    fn is_deterministic() {
        let offsets = [150, 17510, 33275];
        let a = calculate_musicbrainz_id(1, 3, 100000, &offsets);
        let b = calculate_musicbrainz_id(1, 3, 100000, &offsets);
        assert_eq!(a, b);
    }
}
