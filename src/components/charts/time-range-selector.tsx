import { useEffect, useRef, useState } from "react"
import type { TimeGranularity } from "@/lib/chart-types"
import { cn } from "@/lib/utils"

interface TimeRangeSelectorProps {
  value: TimeGranularity
  onChange: (granularity: TimeGranularity) => void
}

const MINUTE_OPTIONS: { label: string; value: TimeGranularity }[] = [
  { label: "5m", value: "5min" },
  { label: "10m", value: "10min" },
  { label: "30m", value: "30min" },
]

const isMinuteGranularity = (v: TimeGranularity) =>
  v === "5min" || v === "10min" || v === "30min"

const minuteLabel = (v: TimeGranularity) =>
  MINUTE_OPTIONS.find((o) => o.value === v)?.label ?? "5m"

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  const isMinActive = isMinuteGranularity(value)

  const btnBase = "px-2 py-0.5 font-medium transition-colors"
  const btnActive = "bg-foreground text-background"
  const btnInactive = "text-muted-foreground hover:text-foreground"

  return (
    <div className="flex rounded-md border border-border text-[11px]">
      {/* Minute dropdown */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => {
            if (isMinActive) {
              setOpen(!open)
            } else {
              onChange("5min")
              setOpen(true)
            }
          }}
          className={cn(
            btnBase,
            "rounded-l-[5px] flex items-center gap-0.5",
            isMinActive ? btnActive : btnInactive,
          )}
        >
          {isMinActive ? minuteLabel(value) : "min"}
          <svg
            className={cn("size-2.5 transition-transform", open && "rotate-180")}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-1 rounded-md border border-border bg-background shadow-md overflow-hidden">
            {MINUTE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  "block w-full px-3 py-1 text-left text-[11px] font-medium transition-colors",
                  value === opt.value
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hour button */}
      <button
        type="button"
        onClick={() => { onChange("hour"); setOpen(false) }}
        className={cn(
          btnBase,
          "border-l border-border",
          value === "hour" ? btnActive : btnInactive,
        )}
      >
        1h
      </button>

      {/* Day button */}
      <button
        type="button"
        onClick={() => { onChange("day"); setOpen(false) }}
        className={cn(
          btnBase,
          "rounded-r-[5px] border-l border-border",
          value === "day" ? btnActive : btnInactive,
        )}
      >
        1d
      </button>
    </div>
  )
}
