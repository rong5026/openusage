import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjectUsage, type ProjectTimeRange } from "@/hooks/use-project-usage"
import type { ProjectUsageEntry } from "@/lib/chart-types"
import { cn, formatCountNumber, formatFixedPrecisionNumber } from "@/lib/utils"

interface ProviderProjectsPageProps {
  providerId: string
}

const TIME_RANGE_OPTIONS: { label: string; value: ProjectTimeRange }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
]

type ViewMode = "cost" | "tokens"

function formatCost(value: number): string {
  return `$${formatFixedPrecisionNumber(value)}`
}

function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return formatCountNumber(value)
}

function ProjectBar({
  project,
  maxValue,
  mode,
}: {
  project: ProjectUsageEntry
  maxValue: number
  mode: ViewMode
}) {
  const value = mode === "cost" ? project.totalCost : project.totalTokens
  const width = maxValue > 0 ? (value / maxValue) * 100 : 0
  const formattedValue = mode === "cost" ? formatCost(value) : formatTokens(value)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-foreground" title={project.projectId}>
          {project.displayName}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {formattedValue}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-foreground/70 transition-all duration-300"
          style={{ width: `${Math.max(width, 0.5)}%` }}
        />
      </div>
      <div className="flex gap-2 text-[10px] text-muted-foreground">
        {project.modelsUsed.map((model) => (
          <span key={model} className="truncate">
            {model.replace(/^claude-/, "").replace(/-\d{8}$/, "")}
          </span>
        ))}
      </div>
    </div>
  )
}

function ProjectDetail({ project }: { project: ProjectUsageEntry }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-foreground" title={project.projectId}>
            {project.displayName}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {formatCost(project.totalCost)} · {formatTokens(project.totalTokens)} tokens
          </div>
        </div>
        <svg
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-1 pt-1 border-t border-border/40">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] text-muted-foreground font-medium pb-0.5">
            <span>Date</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Tokens</span>
          </div>
          {project.daily.map((day) => (
            <div
              key={day.date}
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] text-foreground/80"
            >
              <span>{day.date}</span>
              <span className="text-right tabular-nums">{formatCost(day.totalCost)}</span>
              <span className="text-right tabular-nums">{formatTokens(day.totalTokens)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ProviderProjectsPage({ providerId }: ProviderProjectsPageProps) {
  const [timeRange, setTimeRange] = useState<ProjectTimeRange>("30d")
  const [mode, setMode] = useState<ViewMode>("cost")

  const { data, loading, error, refetch } = useProjectUsage({
    provider: providerId,
    timeRange,
  })

  const projects = data?.projects ?? []
  const maxValue = projects.length > 0
    ? Math.max(...projects.map((p) => (mode === "cost" ? p.totalCost : p.totalTokens)))
    : 0

  return (
    <div className="py-2 space-y-2">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-2">
        {/* View mode toggle */}
        <div className="flex rounded-md border border-border text-[11px]">
          {(["cost", "tokens"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setMode(opt)}
              className={cn(
                "px-2 py-0.5 font-medium transition-colors",
                "first:rounded-l-[5px] last:rounded-r-[5px]",
                "not(:first-child):border-l not(:first-child):border-border",
                mode === opt
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt === "cost" ? "$" : "T"}
            </button>
          ))}
        </div>

        {/* Time range selector */}
        <div className="flex rounded-md border border-border text-[11px]">
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTimeRange(opt.value)}
              className={cn(
                "px-2 py-0.5 font-medium transition-colors",
                "first:rounded-l-[5px] last:rounded-r-[5px]",
                "not(:first-child):border-l not(:first-child):border-border",
                timeRange === opt.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-3/4 rounded-full" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-1/2 rounded-full" />
        </div>
      ) : error ? (
        <div className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">Failed to load project usage</p>
          <p className="text-xs text-muted-foreground break-all">{error}</p>
          <Button size="xs" variant="outline" onClick={refetch}>Retry</Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-7 text-center text-xs text-muted-foreground">
          No project usage data found for this period.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-baseline gap-2 text-xs">
            <span className="text-muted-foreground">{projects.length} projects</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-foreground">{formatCost(data?.totalCost ?? 0)}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{formatTokens(data?.totalTokens ?? 0)} tokens</span>
          </div>

          {/* Bar chart overview */}
          <div className="space-y-2.5">
            {projects.map((project) => (
              <ProjectBar
                key={project.projectId}
                project={project}
                maxValue={maxValue}
                mode={mode}
              />
            ))}
          </div>

          {/* Expandable detail list */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Daily breakdown
            </div>
            {projects.map((project) => (
              <ProjectDetail
                key={project.projectId}
                project={project}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
