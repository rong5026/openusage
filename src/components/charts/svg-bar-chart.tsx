import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface SvgBarChartProps {
  data: { x: number; y: number; label?: string }[]
  width?: number
  height?: number
  color?: string
  yLabel?: string
  xFormatter?: (ts: number) => string
  yFormatter?: (val: number) => string
  className?: string
}

const PADDING = { top: 8, right: 12, bottom: 24, left: 40 }
const Y_TICK_COUNT = 5
const X_LABEL_MAX = 6
const BAR_GAP_RATIO = 0.3

function defaultXFormatter(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

function defaultYFormatter(val: number): string {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`
  return val % 1 === 0 ? val.toString() : val.toFixed(1)
}

function niceStep(range: number, tickCount: number): number {
  const rough = range / tickCount
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / mag
  if (norm <= 1.5) return mag
  if (norm <= 3) return 2 * mag
  if (norm <= 7) return 5 * mag
  return 10 * mag
}

export function SvgBarChart({
  data,
  width: widthProp,
  height = 160,
  color = "var(--color-chart-1)",
  yLabel,
  xFormatter = defaultXFormatter,
  yFormatter = defaultYFormatter,
  className,
}: SvgBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState(0)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setMeasuredWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const width = widthProp ?? measuredWidth

  const plotW = Math.max(width - PADDING.left - PADDING.right, 0)
  const plotH = Math.max(height - PADDING.top - PADDING.bottom, 0)

  const yValues = data.map((d) => d.y)
  const yDataMax = yValues.length > 0 ? Math.max(...yValues) : 1

  const step = niceStep(yDataMax, Y_TICK_COUNT)
  const yMax = Math.ceil(yDataMax / step) * step || 1

  const scaleY = useCallback(
    (v: number) => PADDING.top + plotH - (v / yMax) * plotH,
    [plotH, yMax],
  )

  const barCount = data.length || 1
  const slotWidth = plotW / barCount
  const barWidth = Math.max(slotWidth * (1 - BAR_GAP_RATIO), 1)

  // Y-axis ticks
  const yTicks: number[] = []
  for (let i = 0; i <= Y_TICK_COUNT; i++) {
    yTicks.push((yMax / Y_TICK_COUNT) * i)
  }

  // X-axis label indices (evenly spaced subset)
  const xLabelIndices: number[] = []
  if (data.length > 0) {
    const labelStep = Math.max(1, Math.floor(data.length / X_LABEL_MAX))
    for (let i = 0; i < data.length; i += labelStep) {
      xLabelIndices.push(i)
    }
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (data.length === 0 || plotW === 0) return
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const mouseX = e.clientX - rect.left - PADDING.left
      const idx = Math.floor(mouseX / slotWidth)
      setHoverIdx(idx >= 0 && idx < data.length ? idx : null)
    },
    [data.length, plotW, slotWidth],
  )

  const handleMouseLeave = useCallback(() => setHoverIdx(null), [])

  if (width === 0) {
    return <div ref={containerRef} className={cn("w-full", className)} style={{ height }} />
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <svg
        width={width}
        height={height}
        className="select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Y-axis gridlines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              y1={scaleY(tick)}
              x2={width - PADDING.right}
              y2={scaleY(tick)}
              className="stroke-border"
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : "2,3"}
            />
            <text
              x={PADDING.left - 6}
              y={scaleY(tick) + 3}
              textAnchor="end"
              className="fill-muted-foreground text-[9px]"
            >
              {yFormatter(tick)}
              {tick === yTicks[yTicks.length - 1] && yLabel ? ` ${yLabel}` : ""}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const barX = PADDING.left + i * slotWidth + (slotWidth - barWidth) / 2
          const barH = (d.y / yMax) * plotH
          const barY = PADDING.top + plotH - barH
          return (
            <rect
              key={i}
              x={barX}
              y={barY}
              width={barWidth}
              height={Math.max(barH, 0)}
              rx={Math.min(barWidth / 4, 3)}
              fill={color}
              opacity={hoverIdx === null || hoverIdx === i ? 0.85 : 0.4}
            />
          )
        })}

        {/* X-axis labels */}
        {xLabelIndices.map((i) => (
          <text
            key={i}
            x={PADDING.left + i * slotWidth + slotWidth / 2}
            y={height - 4}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {data[i].label ?? xFormatter(data[i].x)}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && data[hoverIdx] && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm"
          style={{
            left: Math.min(
              PADDING.left + hoverIdx * slotWidth + slotWidth / 2,
              width - 100,
            ),
            top: Math.max(scaleY(data[hoverIdx].y) - 36, 0),
          }}
        >
          <span className="text-muted-foreground">
            {data[hoverIdx].label ?? xFormatter(data[hoverIdx].x)}
          </span>
          {" "}
          <span className="font-medium">
            {yFormatter(data[hoverIdx].y)}
            {yLabel ? ` ${yLabel}` : ""}
          </span>
        </div>
      )}
    </div>
  )
}
