use super::UsageDb;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageDataPoint {
    pub timestamp_ms: i64,
    pub used: Option<f64>,
    pub total: Option<f64>,
    pub cost_usd: Option<f64>,
    pub tokens: Option<i64>,
    pub value_text: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageHistoryResponse {
    pub provider_id: String,
    pub metric_label: String,
    pub metric_type: String,
    pub data_points: Vec<UsageDataPoint>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSummaryPoint {
    pub bucket_start_ms: i64,
    pub avg_used: Option<f64>,
    pub max_used: Option<f64>,
    pub min_used: Option<f64>,
    pub avg_total: Option<f64>,
    pub sum_cost_usd: Option<f64>,
    pub sum_tokens: Option<i64>,
    pub sample_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSummaryResponse {
    pub provider_id: String,
    pub metric_label: String,
    pub metric_type: String,
    pub granularity: String,
    pub buckets: Vec<UsageSummaryPoint>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailableMetric {
    pub label: String,
    pub metric_type: String,
    pub data_point_count: i64,
    pub earliest_ms: i64,
    pub latest_ms: i64,
}

impl UsageDb {
    /// Get raw data points for a specific provider and metric within a time range.
    pub fn get_history(
        &self,
        provider_id: &str,
        metric_label: &str,
        from_ms: i64,
        to_ms: i64,
    ) -> Result<UsageHistoryResponse, String> {
        let conn = self.conn();

        let mut stmt = conn
            .prepare(
                "SELECT timestamp_ms, metric_type, used, total, cost_usd, tokens, value_text
                 FROM usage_snapshots
                 WHERE provider_id = ?1 AND metric_label = ?2
                   AND timestamp_ms >= ?3 AND timestamp_ms <= ?4
                 ORDER BY timestamp_ms ASC",
            )
            .map_err(|e| e.to_string())?;

        let mut metric_type = String::new();
        let data_points: Vec<UsageDataPoint> = stmt
            .query_map(
                rusqlite::params![provider_id, metric_label, from_ms, to_ms],
                |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, Option<f64>>(2)?,
                        row.get::<_, Option<f64>>(3)?,
                        row.get::<_, Option<f64>>(4)?,
                        row.get::<_, Option<i64>>(5)?,
                        row.get::<_, Option<String>>(6)?,
                    ))
                },
            )
            .map_err(|e| e.to_string())?
            .filter_map(|row| {
                let (ts, mt, used, total, cost, tokens, text) = row.ok()?;
                if metric_type.is_empty() {
                    metric_type = mt;
                }
                Some(UsageDataPoint {
                    timestamp_ms: ts,
                    used,
                    total,
                    cost_usd: cost,
                    tokens,
                    value_text: text,
                })
            })
            .collect();

        Ok(UsageHistoryResponse {
            provider_id: provider_id.to_string(),
            metric_label: metric_label.to_string(),
            metric_type,
            data_points,
        })
    }

    /// Get aggregated summary data, bucketed by granularity.
    /// Granularity: "minute", "hour", "day"
    pub fn get_summary(
        &self,
        provider_id: &str,
        metric_label: &str,
        from_ms: i64,
        to_ms: i64,
        granularity: &str,
    ) -> Result<UsageSummaryResponse, String> {
        let bucket_ms: i64 = match granularity {
            "minute" => 60_000,
            "hour" => 3_600_000,
            "day" => 86_400_000,
            _ => return Err(format!("invalid granularity: {}", granularity)),
        };

        let conn = self.conn();

        let mut stmt = conn
            .prepare(
                "SELECT
                    (timestamp_ms / ?5) * ?5 AS bucket_start,
                    AVG(used) AS avg_used,
                    MAX(used) AS max_used,
                    MIN(used) AS min_used,
                    AVG(total) AS avg_total,
                    SUM(cost_usd) AS sum_cost,
                    SUM(tokens) AS sum_tokens,
                    COUNT(*) AS cnt,
                    metric_type
                 FROM usage_snapshots
                 WHERE provider_id = ?1 AND metric_label = ?2
                   AND timestamp_ms >= ?3 AND timestamp_ms <= ?4
                 GROUP BY bucket_start
                 ORDER BY bucket_start ASC",
            )
            .map_err(|e| e.to_string())?;

        let mut metric_type = String::new();
        let buckets: Vec<UsageSummaryPoint> = stmt
            .query_map(
                rusqlite::params![provider_id, metric_label, from_ms, to_ms, bucket_ms],
                |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, Option<f64>>(1)?,
                        row.get::<_, Option<f64>>(2)?,
                        row.get::<_, Option<f64>>(3)?,
                        row.get::<_, Option<f64>>(4)?,
                        row.get::<_, Option<f64>>(5)?,
                        row.get::<_, Option<i64>>(6)?,
                        row.get::<_, i64>(7)?,
                        row.get::<_, String>(8)?,
                    ))
                },
            )
            .map_err(|e| e.to_string())?
            .filter_map(|row| {
                let (bucket, avg_used, max_used, min_used, avg_total, sum_cost, sum_tokens, cnt, mt) =
                    row.ok()?;
                if metric_type.is_empty() {
                    metric_type = mt;
                }
                Some(UsageSummaryPoint {
                    bucket_start_ms: bucket,
                    avg_used,
                    max_used,
                    min_used,
                    avg_total,
                    sum_cost_usd: sum_cost,
                    sum_tokens,
                    sample_count: cnt,
                })
            })
            .collect();

        Ok(UsageSummaryResponse {
            provider_id: provider_id.to_string(),
            metric_label: metric_label.to_string(),
            metric_type,
            granularity: granularity.to_string(),
            buckets,
        })
    }

    /// List available metrics for a provider that have recorded data.
    pub fn available_metrics(&self, provider_id: &str) -> Result<Vec<AvailableMetric>, String> {
        let conn = self.conn();

        let mut stmt = conn
            .prepare(
                "SELECT metric_label, metric_type, COUNT(*) as cnt,
                        MIN(timestamp_ms) as earliest, MAX(timestamp_ms) as latest
                 FROM usage_snapshots
                 WHERE provider_id = ?1
                 GROUP BY metric_label, metric_type
                 ORDER BY cnt DESC",
            )
            .map_err(|e| e.to_string())?;

        let metrics: Vec<AvailableMetric> = stmt
            .query_map([provider_id], |row| {
                Ok(AvailableMetric {
                    label: row.get(0)?,
                    metric_type: row.get(1)?,
                    data_point_count: row.get(2)?,
                    earliest_ms: row.get(3)?,
                    latest_ms: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(metrics)
    }
}
