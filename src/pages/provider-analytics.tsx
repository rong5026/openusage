import { useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { SvgAreaChart } from "@/components/charts/svg-area-chart"
import { SvgBarChart } from "@/components/charts/svg-bar-chart"
import { TimeRangeSelector } from "@/components/charts/time-range-selector"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useUsageHistory } from "@/hooks/use-usage-history"
import type { AvailableMetric, TimeGranularity, UsageSummaryPoint } from "@/lib/chart-types"
import { formatCountNumber, formatFixedPrecisionNumber } from "@/lib/utils"

interface ProviderAnalyticsPageProps {
  providerId: string
}

type ChartMode = "progress" | "tokens" | "cost"

function formatTimestamp(timestampMs: number, granularity: TimeGranularity): string {
  const date = new Date(timestampMs)

  if (granularity === "5min" || granularity === "10min" || granularity === "30min") {
    const hour = date.getHours().toString().padStart(2, "0")
    const minute = date.getMinutes().toString().padStart(2, "0")
    return `${hour}:${minute}`
  }

  if (granularity === "hour") {
    const hour = date.getHours().toString().padStart(2, "0")
    return `${hour}:00`
  }

  const month = date.toLocaleString(undefined, { month: "short" })
  const day = date.getDate().toString().padStart(2, "0")
  return `${month} ${day}`
}

function inferChartMode(metric: AvailableMetric | null, buckets: UsageSummaryPoint[]): ChartMode {
  if (metric?.metricType === "progress") {
    return "progress"
  }

  const hasTokenValues = buckets.some((bucket) => bucket.sumTokens !== null)
  if (hasTokenValues) {
    return "tokens"
  }

  return "cost"
}

function hasValueForBucket(bucket: UsageSummaryPoint, mode: ChartMode): boolean {
  if (mode === "progress") {
    return bucket.avgUsed !== null || bucket.avgTotal !== null
  }

  if (mode === "tokens") {
    return bucket.sumTokens !== null
  }

  return bucket.sumCostUsd !== null
}

export function ProviderAnalyticsPage({ providerId }: ProviderAnalyticsPageProps) {
  const [selectedMetricLabel, setSelectedMetricLabel] = useState("")
  const [granularity, setGranularity] = useState<TimeGranularity>("hour")

  const {
    summary,
    availableMetrics,
    loading,
    error,
    refetch,
  } = useUsageHistory({
    providerId,
    metricLabel: selectedMetricLabel,
    granularity,
  })

  useEffect(() => {
    if (availableMetrics.length === 0) return
    const hasSelectedMetric = availableMetrics.some((metric) => metric.label === selectedMetricLabel)
    if (hasSelectedMetric) return
    setSelectedMetricLabel(availableMetrics[0].label)
  }, [availableMetrics, selectedMetricLabel])

  const selectedMetric = useMemo(
    () => availableMetrics.find((metric) => metric.label === selectedMetricLabel) ?? null,
    [availableMetrics, selectedMetricLabel],
  )

  const chartMode = useMemo(
    () => inferChartMode(selectedMetric, summary?.buckets ?? []),
    [selectedMetric, summary],
  )

  const chartData = useMemo(() => {
    const buckets = summary?.buckets ?? []
    return buckets
      .filter((bucket) => hasValueForBucket(bucket, chartMode))
      .map((bucket) => {
        if (chartMode === "progress") {
          const used = bucket.avgUsed ?? 0
          const total = bucket.avgTotal ?? 0
          const percent = total > 0
            ? (used / total) * 100
            : used

          return {
            x: bucket.bucketStartMs,
            y: Math.max(0, Math.min(100, percent)),
          }
        }

        if (chartMode === "tokens") {
          return {
            x: bucket.bucketStartMs,
            y: Math.max(0, bucket.sumTokens ?? 0),
          }
        }

        return {
          x: bucket.bucketStartMs,
          y: Math.max(0, bucket.sumCostUsd ?? 0),
        }
      })
  }, [summary, chartMode])

  const hasData = chartData.length > 0

  const yFormatter = useMemo(() => {
    if (chartMode === "progress") {
      return (value: number) => `${Math.round(value)}%`
    }

    if (chartMode === "tokens") {
      return (value: number) => formatCountNumber(value)
    }

    return (value: number) => `$${formatFixedPrecisionNumber(value)}`
  }, [chartMode])

  const yLabel = chartMode === "progress"
    ? "%"
    : chartMode === "tokens"
      ? "tokens"
      : "USD"

  return (
    <div className="py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <select
            value={selectedMetricLabel}
            onChange={(e) => setSelectedMetricLabel(e.target.value)}
            disabled={loading || availableMetrics.length === 0}
            className="appearance-none rounded-md border border-border bg-background pl-2 pr-7 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            {availableMetrics.map((metric) => (
              <option key={metric.label} value={metric.label}>
                {metric.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
        </div>
        <TimeRangeSelector value={granularity} onChange={setGranularity} />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">Failed to load analytics data</p>
          <p className="text-xs text-muted-foreground break-all">{error}</p>
          <Button size="xs" variant="outline" onClick={refetch}>Retry</Button>
        </div>
      ) : (
        <>

          {!hasData ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-7 text-center text-xs text-muted-foreground">
              No usage data recorded yet. Data will appear after the next refresh.
            </div>
          ) : chartMode === "tokens" ? (
            <SvgBarChart
              data={chartData}
              height={220}
              yLabel={yLabel}
              yFormatter={yFormatter}
              xFormatter={(timestampMs) => formatTimestamp(timestampMs, granularity)}
              className="rounded-lg border border-border/60 bg-muted/20 p-2"
            />
          ) : (
            <SvgAreaChart
              data={chartData}
              height={220}
              yLabel={yLabel}
              yFormatter={yFormatter}
              xFormatter={(timestampMs) => formatTimestamp(timestampMs, granularity)}
              className="rounded-lg border border-border/60 bg-muted/20 p-2"
            />
          )}
        </>
      )}
    </div>
  )
}
