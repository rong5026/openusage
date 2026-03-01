pub mod reader;
pub mod writer;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

pub struct UsageDb {
    conn: Mutex<Connection>,
}

impl UsageDb {
    pub fn open(app_data_dir: &Path) -> Result<Self, String> {
        let db_path = app_data_dir.join("usage_history.db");
        let conn =
            Connection::open(&db_path).map_err(|e| format!("failed to open usage db: {}", e))?;

        run_migrations(&conn).map_err(|e| format!("migration failed: {}", e))?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().expect("usage db lock poisoned")
    }

    /// Remove old data according to retention policy:
    /// - minute-level (raw): 7 days
    /// - beyond 90 days: delete all
    pub fn cleanup(&self) {
        let conn = self.conn();
        let now_ms = now_millis();
        let seven_days_ago = now_ms - 7 * 24 * 60 * 60 * 1000;
        let ninety_days_ago = now_ms - 90 * 24 * 60 * 60 * 1000;

        // Delete very old data unconditionally
        if let Err(e) = conn.execute(
            "DELETE FROM usage_snapshots WHERE timestamp_ms < ?1",
            [ninety_days_ago],
        ) {
            log::warn!("cleanup (90d) failed: {}", e);
        }

        // For data older than 7 days, keep only one snapshot per hour per metric
        // by deleting duplicates within the same hour bucket
        if let Err(e) = conn.execute(
            "DELETE FROM usage_snapshots WHERE timestamp_ms < ?1 AND id NOT IN (
                SELECT MIN(id) FROM usage_snapshots
                WHERE timestamp_ms < ?1
                GROUP BY provider_id, metric_label, (timestamp_ms / 3600000)
            )",
            [seven_days_ago],
        ) {
            log::warn!("cleanup (7d dedup) failed: {}", e);
        }

        log::info!("usage history cleanup complete");
    }
}

fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS usage_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp_ms INTEGER NOT NULL,
            provider_id TEXT NOT NULL,
            metric_label TEXT NOT NULL,
            metric_type TEXT NOT NULL,
            used REAL,
            total REAL,
            value_text TEXT,
            cost_usd REAL,
            tokens INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_snapshots_provider_time
            ON usage_snapshots(provider_id, timestamp_ms);

        CREATE INDEX IF NOT EXISTS idx_snapshots_time
            ON usage_snapshots(timestamp_ms);",
    )
}

pub fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
