export type UsageDataPoint = {
  timestampMs: number
  used: number | null
  total: number | null
  costUsd: number | null
  tokens: number | null
  valueText: string | null
}

export type UsageHistoryResponse = {
  providerId: string
  metricLabel: string
  metricType: string
  dataPoints: UsageDataPoint[]
}

export type UsageSummaryPoint = {
  bucketStartMs: number
  avgUsed: number | null
  maxUsed: number | null
  minUsed: number | null
  avgTotal: number | null
  sumCostUsd: number | null
  sumTokens: number | null
  sampleCount: number
}

export type UsageSummaryResponse = {
  providerId: string
  metricLabel: string
  metricType: string
  granularity: string
  buckets: UsageSummaryPoint[]
}

export type AvailableMetric = {
  label: string
  metricType: string
  dataPointCount: number
  earliestMs: number
  latestMs: number
}

export type TimeGranularity = "5min" | "10min" | "30min" | "hour" | "day"

// ── Project Usage Types ─────────────────────────────────────────────────────

export type ProjectDailyEntry = {
  date: string
  totalTokens: number
  totalCost: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

export type ModelBreakdown = {
  modelName: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  cost: number
}

export type ProjectUsageEntry = {
  projectId: string
  displayName: string
  totalTokens: number
  totalCost: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  modelsUsed: string[]
  daily: ProjectDailyEntry[]
  modelBreakdowns: ModelBreakdown[]
}

export type ProjectUsageResponse = {
  provider: string
  projects: ProjectUsageEntry[]
  totalTokens: number
  totalCost: number
  modelBreakdowns: ModelBreakdown[]
}