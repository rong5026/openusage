use super::UsageDb;
use crate::plugin_engine::runtime::{MetricLine, PluginOutput};

impl UsageDb {
    /// Record all metric lines from a probe result.
    pub fn record_probe(&self, output: &PluginOutput, timestamp_ms: i64) {
        let conn = self.conn();
        let provider_id = &output.provider_id;

        for line in &output.lines {
            let result = match line {
                MetricLine::Progress {
                    label,
                    used,
                    limit,
                    ..
                } => conn.execute(
                    "INSERT INTO usage_snapshots (timestamp_ms, provider_id, metric_label, metric_type, used, total)
                     VALUES (?1, ?2, ?3, 'progress', ?4, ?5)",
                    rusqlite::params![timestamp_ms, provider_id, label, used, limit],
                ),
                MetricLine::Text {
                    label, value, ..
                } => {
                    let (cost_usd, tokens) = parse_text_value(value);
                    conn.execute(
                        "INSERT INTO usage_snapshots (timestamp_ms, provider_id, metric_label, metric_type, value_text, cost_usd, tokens)
                         VALUES (?1, ?2, ?3, 'text', ?4, ?5, ?6)",
                        rusqlite::params![timestamp_ms, provider_id, label, value, cost_usd, tokens],
                    )
                }
                MetricLine::Badge { label, text, .. } => {
                    // Skip error badges — don't pollute history
                    if label == "Error" {
                        continue;
                    }
                    conn.execute(
                        "INSERT INTO usage_snapshots (timestamp_ms, provider_id, metric_label, metric_type, value_text)
                         VALUES (?1, ?2, ?3, 'badge', ?4)",
                        rusqlite::params![timestamp_ms, provider_id, label, text],
                    )
                }
            };

            if let Err(e) = result {
                log::warn!(
                    "failed to record usage snapshot for {}/{}: {}",
                    provider_id,
                    match line {
                        MetricLine::Progress { label, .. }
                        | MetricLine::Text { label, .. }
                        | MetricLine::Badge { label, .. } => label.as_str(),
                    },
                    e
                );
            }
        }
    }
}

/// Parse cost and token values from text like "$0.41 · 244K tokens" or "$34.48 · 45M tokens"
fn parse_text_value(value: &str) -> (Option<f64>, Option<i64>) {
    let mut cost_usd: Option<f64> = None;
    let mut tokens: Option<i64> = None;

    for part in value.split('·') {
        let trimmed = part.trim();
        if trimmed.starts_with('$') {
            if let Ok(v) = trimmed[1..].replace(',', "").parse::<f64>() {
                cost_usd = Some(v);
            }
        } else if trimmed.ends_with("tokens") {
            let num_part = trimmed.replace("tokens", "").trim().to_string();
            tokens = parse_suffixed_number(&num_part);
        }
    }

    (cost_usd, tokens)
}

fn parse_suffixed_number(s: &str) -> Option<i64> {
    let s = s.trim();
    if s.is_empty() {
        return None;
    }

    let last = s.chars().last()?;
    let (num_str, multiplier) = match last {
        'B' | 'b' => (&s[..s.len() - 1], 1_000_000_000i64),
        'M' | 'm' => (&s[..s.len() - 1], 1_000_000i64),
        'K' | 'k' => (&s[..s.len() - 1], 1_000i64),
        _ => (s, 1i64),
    };

    let val: f64 = num_str.trim().replace(',', "").parse().ok()?;
    Some((val * multiplier as f64) as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_cost_and_tokens() {
        let (cost, tokens) = parse_text_value("$0.41 · 244K tokens");
        assert_eq!(cost, Some(0.41));
        assert_eq!(tokens, Some(244_000));
    }

    #[test]
    fn parse_millions() {
        let (cost, tokens) = parse_text_value("$34.48 · 45M tokens");
        assert_eq!(cost, Some(34.48));
        assert_eq!(tokens, Some(45_000_000));
    }

    #[test]
    fn parse_cost_only() {
        let (cost, tokens) = parse_text_value("$310.23");
        assert_eq!(cost, Some(310.23));
        assert_eq!(tokens, None);
    }

    #[test]
    fn parse_no_data() {
        let (cost, tokens) = parse_text_value("No usage data");
        assert_eq!(cost, None);
        assert_eq!(tokens, None);
    }

    #[test]
    fn parse_suffixed_number_variants() {
        assert_eq!(parse_suffixed_number("244K"), Some(244_000));
        assert_eq!(parse_suffixed_number("1.5M"), Some(1_500_000));
        assert_eq!(parse_suffixed_number("2B"), Some(2_000_000_000));
        assert_eq!(parse_suffixed_number("500"), Some(500));
        assert_eq!(parse_suffixed_number(""), None);
    }
}
