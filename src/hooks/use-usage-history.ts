import { useCallback, useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import type {
  AvailableMetric,
  TimeGranularity,
  UsageSummaryResponse,
} from "@/lib/chart-types"

const RANGE_MS: Record<TimeGranularity, number> = {
  minute: 60 * 60 * 1000,        // 1 hour
  hour: 24 * 60 * 60 * 1000,     // 24 hours
  day: 30 * 24 * 60 * 60 * 1000, // 30 days
}

type UseUsageHistoryOptions = {
  providerId: string
  metricLabel: string
  granularity: TimeGranularity
}

type UseUsageHistoryReturn = {
  summary: UsageSummaryResponse | null
  availableMetrics: AvailableMetric[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useUsageHistory({
  providerId,
  metricLabel,
  granularity,
}: UseUsageHistoryOptions): UseUsageHistoryReturn {
  const [summary, setSummary] = useState<UsageSummaryResponse | null>(null)
  const [availableMetrics, setAvailableMetrics] = useState<AvailableMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const toMs = Date.now()
    const fromMs = toMs - RANGE_MS[granularity]

    try {
      const [summaryResult, metricsResult] = await Promise.all([
        invoke<UsageSummaryResponse>("get_usage_summary", {
          providerId,
          metricLabel,
          fromMs,
          toMs,
          granularity,
        }),
        invoke<AvailableMetric[]>("get_available_metrics", {
          providerId,
        }),
      ])
      setSummary(summaryResult)
      setAvailableMetrics(metricsResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [providerId, metricLabel, granularity])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return { summary, availableMetrics, loading, error, refetch: fetchData }
}
