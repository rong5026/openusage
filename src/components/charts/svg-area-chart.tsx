import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface SvgAreaChartProps {
  data: { x: number; y: number }[]
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
const X_TICK_COUNT = 5

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

export function SvgAreaChart({
  data,
  width: widthProp,
  height = 160,
  color = "var(--color-chart-1)",
  yLabel,
  xFormatter = defaultXFormatter,
  yFormatter = defaultYFormatter,
  className,
}: SvgAreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState(0)
  const [hover, setHover] = useState<{ idx: number; svgX: number; svgY: number } | null>(null)

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

  const xMin = data.length > 0 ? Math.min(...data.map((d) => d.x)) : 0
  const xMax = data.length > 0 ? Math.max(...data.map((d) => d.x)) : 1
  const yValues = data.map((d) => d.y)
  const yDataMax = yValues.length > 0 ? Math.max(...yValues) : 1

  const step = niceStep(yDataMax, Y_TICK_COUNT)
  const yMax = Math.ceil(yDataMax / step) * step || 1

  const scaleX = useCallback(
    (v: number) => PADDING.left + ((v - xMin) / (xMax - xMin || 1)) * plotW,
    [xMin, xMax, plotW],
  )
  const scaleY = useCallback(
    (v: number) => PADDING.top + plotH - (v / yMax) * plotH,
    [plotH, yMax],
  )

  // Build line path
  const linePath =
    data.length > 0
      ? data.map((d, i) => `${i === 0 ? "M" : "L"}${scaleX(d.x).toFixed(2)},${scaleY(d.y).toFixed(2)}`).join(" ")
      : ""

  // Build area path (line path + close to bottom)
  const areaPath =
    data.length > 0
      ? `${linePath} L${scaleX(data[data.length - 1].x).toFixed(2)},${scaleY(0).toFixed(2)} L${scaleX(data[0].x).toFixed(2)},${scaleY(0).toFixed(2)} Z`
      : ""

  // Y-axis ticks
  const yTicks: number[] = []
  for (let i = 0; i <= Y_TICK_COUNT; i++) {
    yTicks.push((yMax / Y_TICK_COUNT) * i)
  }

  // X-axis ticks
  const xTicks: number[] = []
  if (data.length > 0) {
    for (let i = 0; i < X_TICK_COUNT; i++) {
      xTicks.push(xMin + ((xMax - xMin) / (X_TICK_COUNT - 1)) * i)
    }
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (data.length === 0 || plotW === 0) return
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      // Find nearest data point
      let nearest = 0
      let nearestDist = Infinity
      for (let i = 0; i < data.length; i++) {
        const dist = Math.abs(scaleX(data[i].x) - mouseX)
        if (dist < nearestDist) {
          nearestDist = dist
          nearest = i
        }
      }
      setHover({
        idx: nearest,
        svgX: scaleX(data[nearest].x),
        svgY: scaleY(data[nearest].y),
      })
    },
    [data, plotW, scaleX, scaleY],
  )

  const handleMouseLeave = useCallback(() => setHover(null), [])

  const gradientId = "area-grad"

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
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

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

        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <text
            key={i}
            x={scaleX(tick)}
            y={height - 4}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {xFormatter(tick)}
          </text>
        ))}

        {/* Area fill */}
        {areaPath && (
          <path d={areaPath} fill={`url(#${gradientId})`} />
        )}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Hover crosshair */}
        {hover && (
          <>
            <line
              x1={hover.svgX}
              y1={PADDING.top}
              x2={hover.svgX}
              y2={PADDING.top + plotH}
              className="stroke-muted-foreground/50"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <circle
              cx={hover.svgX}
              cy={hover.svgY}
              r={3}
              fill={color}
              className="stroke-background"
              strokeWidth={1.5}
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hover && data[hover.idx] && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm"
          style={{
            left: Math.min(hover.svgX, width - 100),
            top: Math.max(hover.svgY - 36, 0),
          }}
        >
          <span className="text-muted-foreground">{xFormatter(data[hover.idx].x)}</span>
          {" "}
          <span className="font-medium">
            {yFormatter(data[hover.idx].y)}
            {yLabel ? ` ${yLabel}` : ""}
          </span>
        </div>
      )}
    </div>
  )
}
