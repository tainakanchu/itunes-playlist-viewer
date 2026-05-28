pub mod playlists;
pub mod schema;
pub mod stats;
pub mod tracks;

use std::path::Path;

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
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")?;
        let db = Database {
            conn,
            path: path_str,
        };
        schema::create_tables(&db.conn)?;
        Ok(db)
    }
}
