pub mod analysis;
pub mod playlists;
pub mod schema;
pub mod stats;
pub mod tracks;

use std::path::Path;

use rusqlite::functions::FunctionFlags;
use rusqlite::{Connection, Result};

pub struct Database {
    pub(crate) conn: Connection,
    #[allow(dead_code)]
    pub path: String,
}

impl Database {
    pub fn open(app_dir: &Path) -> Result<Self> {
        std::fs::create_dir_all(app_dir).ok();
        let db_path = app_dir.join("library.db");
        let path_str = db_path.to_string_lossy().to_string();
        let conn = Connection::open(&db_path)?;
        // busy_timeout: バックグラウンド解析ワーカと UI コマンドが別コネクションで
        // 同時アクセスしても SQLITE_BUSY で即失敗しないように待つ。
        conn.execute_batch(
            "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;",
        )?;
        let db = Database {
            conn,
            path: path_str,
        };
        register_functions(&db.conn)?;
        schema::create_tables(&db.conn)?;
        migrate(&db.conn)?;
        Ok(db)
    }
}

/// SQL から呼べるアプリ定義スカラー関数を登録する。`open` / `open_memory` の両方で使う。
/// `fold(text, level)`: CJK 字体ゆれを `level` (0=Off/1=Light/2=Standard) まで畳む。
/// NULL 列は NULL のまま返す。決定的なので SQLITE_DETERMINISTIC を付ける。
fn register_functions(conn: &Connection) -> Result<()> {
    conn.create_scalar_function(
        "fold",
        2,
        FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
        |ctx| {
            let text: Option<String> = ctx.get(0)?;
            let level: i64 = ctx.get(1)?;
            Ok(text.map(|t| {
                crate::text_fold::fold(&t, crate::text_fold::FoldLevel::from_i64(level))
            }))
        },
    )?;
    Ok(())
}

#[cfg(test)]
impl Database {
    /// テスト用のインメモリ DB (スキーマ + マイグレーション適用済み)。
    pub fn open_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Database {
            conn,
            path: ":memory:".to_string(),
        };
        register_functions(&db.conn)?;
        schema::create_tables(&db.conn)?;
        migrate(&db.conn)?;
        Ok(db)
    }
}

/// 指定テーブルに列が存在するか (PRAGMA table_info)。
fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool> {
    // table 名はコード内リテラルのみ (ユーザー入力ではない) なので format! で安全。
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name == column {
            return Ok(true);
        }
    }
    Ok(false)
}

/// `CREATE TABLE IF NOT EXISTS` では既存 DB に新カラムが追加されないため、
/// 後付けカラムは冪等な `ALTER TABLE ADD COLUMN` でここに集約する。
fn migrate(conn: &Connection) -> Result<()> {
    if !column_exists(conn, "tracks", "last_played")? {
        conn.execute_batch("ALTER TABLE tracks ADD COLUMN last_played TEXT;")?;
    }
    if !column_exists(conn, "playlists", "smart_criteria")? {
        conn.execute_batch("ALTER TABLE playlists ADD COLUMN smart_criteria TEXT;")?;
    }
    Ok(())
}
