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

export type TimeGranularity = "minute" | "hour" | "day"
