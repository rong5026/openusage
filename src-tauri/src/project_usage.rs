use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ffi::{OsStr, OsString};
use std::path::PathBuf;

const CCUSAGE_VERSION: &str = "18.0.8";
const CCUSAGE_TIMEOUT_SECS: u64 = 30;
const CCUSAGE_POLL_INTERVAL_MS: u64 = 100;

#[derive(Copy, Clone, Debug)]
enum Provider {
    Claude,
    Codex,
}

struct ProviderConfig {
    package_name: &'static str,
    npm_exec_bin: &'static str,
}

fn provider_config(provider: Provider) -> ProviderConfig {
    match provider {
        Provider::Claude => ProviderConfig {
            package_name: "ccusage",
            npm_exec_bin: "ccusage",
        },
        Provider::Codex => ProviderConfig {
            package_name: "@ccusage/codex",
            npm_exec_bin: "ccusage-codex",
        },
    }
}

fn parse_provider(id: &str) -> Provider {
    match id {
        "codex" => Provider::Codex,
        _ => Provider::Claude,
    }
}

// ── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectUsageEntry {
    pub project_id: String,
    pub display_name: String,
    pub total_tokens: i64,
    pub total_cost: f64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cache_creation_tokens: i64,
    pub cache_read_tokens: i64,
    pub models_used: Vec<String>,
    pub daily: Vec<ProjectDailyEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDailyEntry {
    pub date: String,
    pub total_tokens: i64,
    pub total_cost: f64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cache_creation_tokens: i64,
    pub cache_read_tokens: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectUsageResponse {
    pub provider: String,
    pub projects: Vec<ProjectUsageEntry>,
    pub total_tokens: i64,
    pub total_cost: f64,
}

// Raw ccusage JSON shapes
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CcusageDailyRaw {
    date: String,
    #[serde(default)]
    total_tokens: i64,
    #[serde(default)]
    total_cost: f64,
    #[serde(default)]
    input_tokens: i64,
    #[serde(default)]
    output_tokens: i64,
    #[serde(default)]
    cache_creation_tokens: i64,
    #[serde(default)]
    cache_read_tokens: i64,
    #[serde(default)]
    models_used: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CcusageTotals {
    #[serde(default)]
    total_tokens: i64,
    #[serde(default)]
    total_cost: f64,
}

#[derive(Debug, Deserialize)]
struct CcusageInstancesOutput {
    projects: HashMap<String, Vec<CcusageDailyRaw>>,
    #[serde(default)]
    totals: Option<CcusageTotals>,
}

// ── Runner infrastructure (mirrors host_api.rs pattern) ────────────────────

#[derive(Copy, Clone, Debug)]
enum RunnerKind {
    Bunx,
    PnpmDlx,
    YarnDlx,
    NpmExec,
    Npx,
}

fn runner_order() -> [RunnerKind; 5] {
    [
        RunnerKind::Bunx,
        RunnerKind::PnpmDlx,
        RunnerKind::YarnDlx,
        RunnerKind::NpmExec,
        RunnerKind::Npx,
    ]
}

fn runner_label(kind: RunnerKind) -> &'static str {
    match kind {
        RunnerKind::Bunx => "bunx",
        RunnerKind::PnpmDlx => "pnpm dlx",
        RunnerKind::YarnDlx => "yarn dlx",
        RunnerKind::NpmExec => "npm exec",
        RunnerKind::Npx => "npx",
    }
}

fn runner_candidates(kind: RunnerKind) -> Vec<String> {
    match kind {
        RunnerKind::Bunx => vec!["bunx".into(), "bun".into()],
        RunnerKind::PnpmDlx => vec!["pnpm".into()],
        RunnerKind::YarnDlx => vec!["yarn".into()],
        RunnerKind::NpmExec => vec!["npm".into()],
        RunnerKind::Npx => vec!["npx".into()],
    }
}

fn path_entries() -> Vec<PathBuf> {
    let mut entries = Vec::new();
    if let Some(home) = dirs::home_dir() {
        entries.push(home.join(".bun").join("bin"));
        entries.push(home.join(".local").join("bin"));
        entries.push(home.join(".volta").join("bin"));
        entries.push(home.join(".nvm").join("current").join("bin"));
        entries.push(home.join(".fnm").join("current").join("bin"));
        entries.push(home.join(".cargo").join("bin"));
    }
    entries.push(PathBuf::from("/usr/local/bin"));
    entries.push(PathBuf::from("/opt/homebrew/bin"));
    entries.push(PathBuf::from("/usr/bin"));
    if let Some(existing) = std::env::var_os("PATH") {
        for p in std::env::split_paths(&existing) {
            if !entries.contains(&p) {
                entries.push(p);
            }
        }
    }
    entries
}

fn enriched_path() -> Option<OsString> {
    let entries = path_entries();
    if entries.is_empty() {
        return None;
    }
    Some(std::env::join_paths(entries).ok()?)
}

fn runner_available(candidate: &str, enriched_path: Option<&OsStr>) -> bool {
    let mut cmd = std::process::Command::new("which");
    cmd.arg(candidate)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());
    if let Some(path) = enriched_path {
        cmd.env("PATH", path);
    }
    cmd.status().map(|s| s.success()).unwrap_or(false)
}

fn resolve_runner(kind: RunnerKind) -> Option<String> {
    let path = enriched_path();
    for candidate in runner_candidates(kind) {
        if runner_available(&candidate, path.as_deref()) {
            return Some(candidate);
        }
    }
    None
}

fn collect_runners() -> Vec<(RunnerKind, String)> {
    let mut runners = Vec::new();
    for kind in runner_order() {
        if let Some(program) = resolve_runner(kind) {
            runners.push((kind, program));
        }
    }
    runners
}

fn build_args(kind: RunnerKind, provider: Provider, since: Option<&str>) -> Vec<String> {
    let config = provider_config(provider);
    let package_spec = format!("{}@{}", config.package_name, CCUSAGE_VERSION);
    let mut args: Vec<String> = match kind {
        RunnerKind::Bunx => vec!["--silent".into(), package_spec.clone()],
        RunnerKind::PnpmDlx => vec!["-s".into(), "dlx".into(), package_spec.clone()],
        RunnerKind::YarnDlx => vec!["dlx".into(), "-q".into(), package_spec.clone()],
        RunnerKind::NpmExec => vec![
            "exec".into(),
            "--yes".into(),
            format!("--package={package_spec}"),
            "--".into(),
            config.npm_exec_bin.into(),
        ],
        RunnerKind::Npx => vec!["--yes".into(), package_spec],
    };

    args.extend([
        "daily".into(),
        "--json".into(),
        "--instances".into(),
        "--order".into(),
        "desc".into(),
    ]);

    if let Some(since) = since {
        let trimmed = since.trim();
        if !trimmed.is_empty() {
            args.push("--since".into());
            args.push(trimmed.into());
        }
    }

    args
}

fn run_with_runner(
    kind: RunnerKind,
    program: &str,
    provider: Provider,
    since: Option<&str>,
) -> Option<String> {
    let args = build_args(kind, provider, since);
    let path = enriched_path();

    let mut command = std::process::Command::new(program);
    command
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    if let Some(ref path) = path {
        command.env("PATH", path);
    }

    log::info!(
        "[project_usage] ccusage query via {} ({})",
        program,
        runner_label(kind),
    );

    let mut child = match command.spawn() {
        Ok(c) => c,
        Err(e) => {
            log::warn!(
                "[project_usage] ccusage spawn failed for {}: {}",
                runner_label(kind),
                e
            );
            return None;
        }
    };

    let deadline =
        std::time::Instant::now() + std::time::Duration::from_secs(CCUSAGE_TIMEOUT_SECS);
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let out = child
                    .stdout
                    .take()
                    .map(|mut s| {
                        let mut buf = String::new();
                        std::io::Read::read_to_string(&mut s, &mut buf).ok();
                        buf
                    })
                    .unwrap_or_default();

                if !status.success() {
                    log::warn!(
                        "[project_usage] ccusage failed for {}: exit {}",
                        runner_label(kind),
                        status
                    );
                    return None;
                }

                return extract_last_json(&out);
            }
            Ok(None) => {
                if std::time::Instant::now() >= deadline {
                    let _ = child.kill();
                    log::warn!(
                        "[project_usage] ccusage timed out after {}s for {}",
                        CCUSAGE_TIMEOUT_SECS,
                        runner_label(kind)
                    );
                    return None;
                }
                std::thread::sleep(std::time::Duration::from_millis(CCUSAGE_POLL_INTERVAL_MS));
            }
            Err(e) => {
                log::warn!(
                    "[project_usage] ccusage wait failed for {}: {}",
                    runner_label(kind),
                    e
                );
                return None;
            }
        }
    }
}

fn extract_last_json(stdout: &str) -> Option<String> {
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return None;
    }
    if serde_json::from_str::<serde_json::Value>(trimmed).is_ok() {
        return Some(trimmed.to_string());
    }
    let mut starts: Vec<usize> = trimmed
        .char_indices()
        .filter(|(_, c)| *c == '{' || *c == '[')
        .map(|(idx, _)| idx)
        .collect();
    starts.reverse();
    for start in starts {
        let candidate = trimmed[start..].trim();
        if serde_json::from_str::<serde_json::Value>(candidate).is_ok() {
            return Some(candidate.to_string());
        }
    }
    None
}

// ── Project name resolution ────────────────────────────────────────────────

fn humanize_project_id(raw: &str) -> String {
    // ccusage project IDs look like:
    // "-Users-hong-yeonghwan-Desktop---------openusage"
    // The dashes replace path separators and non-ASCII characters.
    // Strategy: take last non-empty segment when split by '-'
    let segments: Vec<&str> = raw.split('-').filter(|s| !s.is_empty()).collect();
    if let Some(last) = segments.last() {
        last.to_string()
    } else {
        raw.to_string()
    }
}

// ── Public API ─────────────────────────────────────────────────────────────

pub fn query_project_usage(
    provider: &str,
    since: Option<&str>,
) -> Result<ProjectUsageResponse, String> {
    let ccusage_provider = parse_provider(provider);
    let runners = collect_runners();
    if runners.is_empty() {
        return Err("No package runner (bunx/npx/pnpm/yarn) found. Install Node.js or Bun.".into());
    }

    for (kind, program) in &runners {
        if let Some(json_str) = run_with_runner(*kind, program, ccusage_provider, since) {
            let parsed: CcusageInstancesOutput = serde_json::from_str(&json_str)
                .map_err(|e| format!("Failed to parse ccusage output: {}", e))?;

            let mut projects: Vec<ProjectUsageEntry> = parsed
                .projects
                .into_iter()
                .map(|(project_id, daily_entries)| {
                    let display_name = humanize_project_id(&project_id);

                    let mut total_tokens: i64 = 0;
                    let mut total_cost: f64 = 0.0;
                    let mut input_tokens: i64 = 0;
                    let mut output_tokens: i64 = 0;
                    let mut cache_creation_tokens: i64 = 0;
                    let mut cache_read_tokens: i64 = 0;
                    let mut all_models: Vec<String> = Vec::new();

                    let daily: Vec<ProjectDailyEntry> = daily_entries
                        .into_iter()
                        .map(|d| {
                            total_tokens += d.total_tokens;
                            total_cost += d.total_cost;
                            input_tokens += d.input_tokens;
                            output_tokens += d.output_tokens;
                            cache_creation_tokens += d.cache_creation_tokens;
                            cache_read_tokens += d.cache_read_tokens;
                            for m in &d.models_used {
                                if !all_models.contains(m) {
                                    all_models.push(m.clone());
                                }
                            }
                            ProjectDailyEntry {
                                date: d.date,
                                total_tokens: d.total_tokens,
                                total_cost: d.total_cost,
                                input_tokens: d.input_tokens,
                                output_tokens: d.output_tokens,
                                cache_creation_tokens: d.cache_creation_tokens,
                                cache_read_tokens: d.cache_read_tokens,
                            }
                        })
                        .collect();

                    ProjectUsageEntry {
                        project_id,
                        display_name,
                        total_tokens,
                        total_cost,
                        input_tokens,
                        output_tokens,
                        cache_creation_tokens,
                        cache_read_tokens,
                        models_used: all_models,
                        daily,
                    }
                })
                .collect();

            // Sort by total cost descending
            projects.sort_by(|a, b| {
                b.total_cost
                    .partial_cmp(&a.total_cost)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            let grand_total_tokens = parsed
                .totals
                .as_ref()
                .map(|t| t.total_tokens)
                .unwrap_or_else(|| projects.iter().map(|p| p.total_tokens).sum());
            let grand_total_cost = parsed
                .totals
                .as_ref()
                .map(|t| t.total_cost)
                .unwrap_or_else(|| projects.iter().map(|p| p.total_cost).sum());

            return Ok(ProjectUsageResponse {
                provider: provider.to_string(),
                projects,
                total_tokens: grand_total_tokens,
                total_cost: grand_total_cost,
            });
        }
    }

    Err("ccusage query failed with all available runners".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn humanize_project_id_extracts_last_segment() {
        assert_eq!(
            humanize_project_id("-Users-hong-yeonghwan-Desktop---------openusage"),
            "openusage"
        );
    }

    #[test]
    fn humanize_project_id_handles_simple_name() {
        assert_eq!(humanize_project_id("subagents"), "subagents");
    }

    #[test]
    fn humanize_project_id_handles_nested_path() {
        assert_eq!(
            humanize_project_id("-Users-hong-yeonghwan-Desktop-AI-everything-claude-code"),
            "code"
        );
    }

    #[test]
    fn humanize_project_id_handles_empty() {
        assert_eq!(humanize_project_id("---"), "---");
    }

    #[test]
    fn parse_instances_output() {
        let json = r#"{
            "projects": {
                "test-project": [
                    {
                        "date": "2026-03-01",
                        "inputTokens": 100,
                        "outputTokens": 200,
                        "cacheCreationTokens": 300,
                        "cacheReadTokens": 400,
                        "totalTokens": 1000,
                        "totalCost": 0.5,
                        "modelsUsed": ["claude-opus-4-6"]
                    }
                ]
            },
            "totals": {
                "totalTokens": 1000,
                "totalCost": 0.5,
                "inputTokens": 100,
                "outputTokens": 200,
                "cacheCreationTokens": 300,
                "cacheReadTokens": 400
            }
        }"#;

        let parsed: CcusageInstancesOutput = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.projects.len(), 1);
        assert!(parsed.projects.contains_key("test-project"));
        assert_eq!(parsed.totals.unwrap().total_tokens, 1000);
    }
}
