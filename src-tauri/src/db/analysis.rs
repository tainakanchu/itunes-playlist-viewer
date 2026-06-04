//! `track_analysis` テーブルの読み書き。
//!
//! 解析結果 (BPM / Camelot key / energy / loudness / 特徴ベクトル) を曲と 1:1 で保存する。
//! 特徴ベクトルは `Vec<f64>` を JSON 文字列にして `vector` 列に格納する
//! (BLOB より可読・移植性が高く、~20 次元なのでサイズも問題にならない)。

use rusqlite::{params, OptionalExtension, Result};

use super::Database;
use crate::models::TrackAnalysis;

/// 解析アルゴリズムのバージョン。ロジックを更新したら +1 して再解析を促す。
pub const ANALYSIS_VERSION: i64 = 1;

fn row_to_analysis(row: &rusqlite::Row) -> rusqlite::Result<TrackAnalysis> {
    let vector_json: Option<String> = row.get(9)?;
    let vector = vector_json
        .and_then(|s| serde_json::from_str::<Vec<f64>>(&s).ok())
        .unwrap_or_default();
    Ok(TrackAnalysis {
        track_id: row.get(0)?,
        version: row.get(1)?,
        analyzed_at: row.get(2)?,
        bpm: row.get(3)?,
        key_camelot: row.get(4)?,
        key_name: row.get(5)?,
        energy: row.get(6)?,
        loudness_lufs: row.get(7)?,
        replaygain_db: row.get(8)?,
        vector,
    })
}

const SELECT_COLS: &str = "track_id, version, analyzed_at, bpm, key_camelot, key_name, \
                           energy, loudness_lufs, replaygain_db, vector";

impl Database {
    /// 解析結果を挿入 / 更新する (track_id を主キーに upsert)。
    pub fn upsert_analysis(&self, a: &TrackAnalysis) -> Result<()> {
        let vector_json = serde_json::to_string(&a.vector).unwrap_or_else(|_| "[]".to_string());
        self.conn.execute(
            "INSERT INTO track_analysis
                (track_id, version, analyzed_at, bpm, key_camelot, key_name,
                 energy, loudness_lufs, replaygain_db, vector)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(track_id) DO UPDATE SET
                version = excluded.version,
                analyzed_at = excluded.analyzed_at,
                bpm = excluded.bpm,
                key_camelot = excluded.key_camelot,
                key_name = excluded.key_name,
                energy = excluded.energy,
                loudness_lufs = excluded.loudness_lufs,
                replaygain_db = excluded.replaygain_db,
                vector = excluded.vector",
            params![
                a.track_id,
                a.version,
                a.analyzed_at,
                a.bpm,
                a.key_camelot,
                a.key_name,
                a.energy,
                a.loudness_lufs,
                a.replaygain_db,
                vector_json,
            ],
        )?;
        Ok(())
    }

    /// 1 曲の解析結果を取得 (未解析なら None)。
    pub fn get_analysis(&self, track_id: i64) -> Result<Option<TrackAnalysis>> {
        let sql = format!("SELECT {SELECT_COLS} FROM track_analysis WHERE track_id = ?1");
        self.conn
            .query_row(&sql, params![track_id], row_to_analysis)
            .optional()
    }

    /// 解析済みの全曲を取得 (類似度計算の母集合に使う)。
    pub fn get_all_analysis(&self) -> Result<Vec<TrackAnalysis>> {
        let sql = format!("SELECT {SELECT_COLS} FROM track_analysis");
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map([], row_to_analysis)?;
        rows.collect()
    }

    /// 指定曲が「現行バージョンで解析済み」かどうか。未解析・旧バージョンなら true。
    pub fn needs_analysis(&self, track_id: i64) -> Result<bool> {
        let v: Option<i64> = self
            .conn
            .query_row(
                "SELECT version FROM track_analysis WHERE track_id = ?1",
                params![track_id],
                |r| r.get(0),
            )
            .optional()?;
        Ok(v != Some(ANALYSIS_VERSION))
    }

    /// (現行バージョンで解析済みの曲数, ファイルが存在する曲の総数)。
    pub fn analysis_status(&self) -> Result<(i64, i64)> {
        let analyzed: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM track_analysis WHERE version = ?1",
            params![ANALYSIS_VERSION],
            |r| r.get(0),
        )?;
        let total: i64 =
            self.conn
                .query_row("SELECT COUNT(*) FROM tracks WHERE file_exists = 1", [], |r| {
                    r.get(0)
                })?;
        Ok((analyzed, total))
    }
}
