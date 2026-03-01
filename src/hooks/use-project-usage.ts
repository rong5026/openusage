import { useCallback, useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import type { ProjectUsageResponse } from "@/lib/chart-types"

export type ProjectTimeRange = "7d" | "30d" | "90d"

const SINCE_MAP: Record<ProjectTimeRange, string> = {
  "7d": formatSince(7),
  "30d": formatSince(30),
  "90d": formatSince(90),
}

function formatSince(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}${m}${d}`
}

type UseProjectUsageOptions = {
  provider: string
  timeRange: ProjectTimeRange
}

type UseProjectUsageReturn = {
  data: ProjectUsageResponse | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProjectUsage({
  provider,
  timeRange,
}: UseProjectUsageOptions): UseProjectUsageReturn {
  const [data, setData] = useState<ProjectUsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await invoke<ProjectUsageResponse>("get_project_usage", {
        provider,
        since: SINCE_MAP[timeRange],
      })
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [provider, timeRange])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
