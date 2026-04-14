import { useCallback, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import type { ProjectUsageResponse } from "@/lib/chart-types"

export type ProjectTimeRange = "1d" | "7d" | "30d" | "90d"

const DAYS_AGO: Record<ProjectTimeRange, number> = {
  "1d": 0,
  "7d": 6,
  "30d": 29,
  "90d": 89,
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
  // Incremented on each fetch to discard stale responses
  const requestIdRef = useRef(0)

  const fetchData = useCallback(async (forceRefresh = false) => {
    const id = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const result = await invoke<ProjectUsageResponse>("get_project_usage", {
        provider,
        since: formatSince(DAYS_AGO[timeRange]),
        forceRefresh,
      })
      // Only apply if this is still the latest request
      if (id === requestIdRef.current) {
        setData(result)
      }
    } catch (err) {
      if (id === requestIdRef.current) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
      }
    } finally {
      if (id === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [provider, timeRange])

  // Debounce fetch to prevent rapid time-range switching from spawning
  // many concurrent ccusage (Node) processes
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchData])

  // Listen for background refresh results
  useEffect(() => {
    const unlisten = listen<ProjectUsageResponse>("project-usage:updated", (event) => {
      if (event.payload.provider === provider) {
        setData(event.payload)
      }
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [provider])

  const forceRefetch = useCallback(() => fetchData(true), [fetchData])

  return { data, loading, error, refetch: forceRefetch }
}
