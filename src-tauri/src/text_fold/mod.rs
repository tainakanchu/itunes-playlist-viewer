//! CJK 字体ゆれ吸収。検索・スマートプレイリストのテキストマッチで、
//! 繁体字/簡体字/日本語漢字・かな(ひら↔カタ)・全角半角・英大小の「ゆれ」を吸収する。
//! 強度はユーザー設定 (Off/軽量/標準)。Off は恒等で従来挙動を完全に維持する。

use std::collections::HashMap;
use std::sync::OnceLock;

use unicode_normalization::UnicodeNormalization;

/// 検索・マッチの字体ゆれ吸収レベル。数値は app_state / SQL に渡す際の表現。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FoldLevel {
    Off,
    Light,
    Standard,
}

impl FoldLevel {
    /// app_state 文字列から。未知・未設定は既定 Standard。
    pub fn from_state(s: Option<&str>) -> Self {
        match s {
            Some("off") => FoldLevel::Off,
            Some("light") => FoldLevel::Light,
            _ => FoldLevel::Standard, // "standard" / None / 不明 → 既定
        }
    }
    /// app_state へ書き込む際の文字列表現。設定コマンド/フロント連携で使う。
    #[allow(dead_code)]
    pub fn as_str(self) -> &'static str {
        match self {
            FoldLevel::Off => "off",
            FoldLevel::Light => "light",
            FoldLevel::Standard => "standard",
        }
    }
    pub fn as_i64(self) -> i64 {
        match self {
            FoldLevel::Off => 0,
            FoldLevel::Light => 1,
            FoldLevel::Standard => 2,
        }
    }
    pub fn from_i64(n: i64) -> Self {
        match n {
            0 => FoldLevel::Off,
            1 => FoldLevel::Light,
            _ => FoldLevel::Standard,
        }
    }
}

/// 漢字字体フォールド表 (繁体字 / 日本語新字体 → 簡体字代表字)。
/// `han_table.txt` から初回アクセス時に一度だけ構築する。
fn han_map() -> &'static HashMap<char, char> {
    static MAP: OnceLock<HashMap<char, char>> = OnceLock::new();
    MAP.get_or_init(|| {
        let mut m = HashMap::new();
        for line in include_str!("han_table.txt").lines() {
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let mut it = line.splitn(2, '\t');
            let (Some(k), Some(v)) = (it.next(), it.next()) else {
                continue;
            };
            let (Some(kc), Some(vc)) = (k.chars().next(), v.chars().next()) else {
                continue;
            };
            m.insert(kc, vc);
        }
        m
    })
}

/// カタカナ(U+30A1..=30F6) を対応するひらがなへ。それ以外はそのまま。
fn kata_to_hira(c: char) -> char {
    let u = c as u32;
    if (0x30A1..=0x30F6).contains(&u) {
        char::from_u32(u - 0x60).unwrap_or(c)
    } else {
        c
    }
}

/// 文字列を指定レベルまで正規化 (畳み込み) する。冪等。
pub fn fold(s: &str, level: FoldLevel) -> String {
    if level == FoldLevel::Off {
        return s.to_owned();
    }
    // Light: NFKC (全/半角・互換を吸収) → 小文字化 → カタカナ→ひらがな
    let mut t: String = s
        .nfkc()
        .collect::<String>()
        .to_lowercase()
        .chars()
        .map(kata_to_hira)
        .collect();
    if level == FoldLevel::Standard {
        let m = han_map();
        t = t.chars().map(|c| m.get(&c).copied().unwrap_or(c)).collect();
    }
    t
}

#[cfg(test)]
mod tests {
    use super::*;
    use FoldLevel::{Light, Off, Standard};

    #[test]
    fn standard_folds_han_variants() {
        // 繁/簡/日 が同じ代表字に畳まれる。
        assert_eq!(fold("國", Standard), fold("国", Standard));
        assert_eq!(fold("桜", Standard), fold("櫻", Standard));
        assert_eq!(fold("櫻", Standard), fold("樱", Standard));
        assert_eq!(fold("図", Standard), fold("圖", Standard));
        assert_eq!(fold("圖", Standard), fold("图", Standard));
        assert_eq!(fold("売", Standard), fold("卖", Standard));
    }

    #[test]
    fn kana_hira_kata_equal() {
        assert_eq!(fold("サクラ", Light), fold("さくら", Light));
        assert_eq!(fold("サクラ", Standard), fold("さくら", Standard));
    }

    #[test]
    fn fullwidth_and_halfwidth() {
        assert_eq!(fold("ＡＢＣ", Light), "abc");
        // 半角カナ → 全角相当 → ひらがな。
        assert_eq!(fold("ｻｸﾗ", Light), fold("さくら", Light));
    }

    #[test]
    fn case_insensitive() {
        assert_eq!(fold("House", Light), "house");
        assert_eq!(fold("HOUSE", Standard), "house");
    }

    #[test]
    fn light_does_not_fold_han() {
        assert_eq!(fold("國", Light), "國");
        // Light では繁/簡が別物のまま。
        assert_ne!(fold("國", Light), fold("国", Light));
    }

    #[test]
    fn off_is_identity() {
        assert_eq!(fold("國", Off), "國");
        assert_eq!(fold("House", Off), "House");
        assert_eq!(fold("サクラ", Off), "サクラ");
        assert_eq!(fold("ＡＢＣ", Off), "ＡＢＣ");
    }

    #[test]
    fn idempotent() {
        for s in ["國", "桜の樱", "House Music", "ｻｸﾗ ＡＢＣ", "圖書館"] {
            assert_eq!(fold(&fold(s, Standard), Standard), fold(s, Standard));
            assert_eq!(fold(&fold(s, Light), Light), fold(s, Light));
        }
    }

    #[test]
    fn level_conversions_roundtrip() {
        for lvl in [Off, Light, Standard] {
            assert_eq!(FoldLevel::from_i64(lvl.as_i64()), lvl);
            assert_eq!(FoldLevel::from_state(Some(lvl.as_str())), lvl);
        }
        // 未設定 / 不明は Standard 既定。
        assert_eq!(FoldLevel::from_state(None), Standard);
        assert_eq!(FoldLevel::from_state(Some("nonsense")), Standard);
    }
}
