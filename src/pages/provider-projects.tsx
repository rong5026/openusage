import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjectUsage, type ProjectTimeRange } from "@/hooks/use-project-usage"
import type { ModelBreakdown, ProjectUsageEntry } from "@/lib/chart-types"
import { cn, formatCountNumber, formatFixedPrecisionNumber } from "@/lib/utils"
import { useProjectAliasStore } from "@/stores/project-alias-store"

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

const MODEL_OPACITY = [1, 0.7, 0.45, 0.25]

function shortenModelName(name: string): string {
  return name
    .replace(/^claude-/, "")
    .replace(/-\d{8}$/, "")
}

function ModelBreakdownSection({
  breakdowns,
  totalCost,
  mode,
}: {
  breakdowns: ModelBreakdown[]
  totalCost: number
  mode: ViewMode
}) {
  if (breakdowns.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Model usage
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/30">
        {breakdowns.map((mb, i) => {
          const pct = totalCost > 0 ? (mb.cost / totalCost) * 100 : 0
          if (pct < 0.5) return null
          return (
            <div
              key={mb.modelName}
              className="h-full transition-all bg-primary"
              style={{ width: `${pct}%`, opacity: MODEL_OPACITY[i % MODEL_OPACITY.length] }}
              title={`${shortenModelName(mb.modelName)}: ${formatCost(mb.cost)}`}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="space-y-1">
        {breakdowns.map((mb, i) => {
          const pct = totalCost > 0 ? ((mb.cost / totalCost) * 100).toFixed(1) : "0.0"
          return (
            <div key={mb.modelName} className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="size-2 shrink-0 rounded-sm bg-primary" style={{ opacity: MODEL_OPACITY[i % MODEL_OPACITY.length] }} />
                <span className="truncate text-foreground/80">{shortenModelName(mb.modelName)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 tabular-nums text-muted-foreground">
                <span>{pct}%</span>
                <span>{mode === "cost" ? formatCost(mb.cost) : formatTokens(mb.inputTokens + mb.outputTokens + mb.cacheCreationTokens + mb.cacheReadTokens)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EditableProjectName({
  projectId,
  displayName,
}: {
  projectId: string
  displayName: string
}) {
  const { aliases, setAlias } = useProjectAliasStore()
  const aliasName = aliases[projectId] || ""
  const shownName = aliasName || displayName
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(shownName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(aliasName || displayName)
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [editing, aliasName, displayName])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== displayName) {
      setAlias(projectId, trimmed)
    } else {
      setAlias(projectId, "")
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
        className="truncate text-xs font-medium text-foreground bg-transparent border-b border-foreground/30 outline-none w-full"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      className="truncate text-xs font-medium text-foreground text-left hover:text-foreground/70 transition-colors"
      title={`${projectId}\nClick to rename`}
    >
      {shownName}
      {aliasName ? (
        <span className="ml-1 text-[10px] text-muted-foreground font-normal">✎</span>
      ) : null}
    </button>
  )
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
        <EditableProjectName projectId={project.projectId} displayName={project.displayName} />
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {formattedValue}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
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
  const aliases = useProjectAliasStore((s) => s.aliases)
  const displayName = aliases[project.projectId] || project.displayName
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="size-2 shrink-0 rounded-full bg-primary" />
            <div className="truncate text-xs font-medium text-foreground" title={project.projectId}>
              {displayName}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground pl-3.5">
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
  const hydrate = useProjectAliasStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])
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

          {/* Model breakdown */}
          <ModelBreakdownSection
            breakdowns={data?.modelBreakdowns ?? []}
            totalCost={data?.totalCost ?? 0}
            mode={mode}
          />

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
