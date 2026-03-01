import type { TimeGranularity } from "@/lib/chart-types"
import { cn } from "@/lib/utils"

interface TimeRangeSelectorProps {
  value: TimeGranularity
  onChange: (granularity: TimeGranularity) => void
}

const OPTIONS: { label: string; value: TimeGranularity }[] = [
  { label: "1m", value: "minute" },
  { label: "1h", value: "hour" },
  { label: "1d", value: "day" },
]

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex rounded-md border border-border text-[11px]">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2 py-0.5 font-medium transition-colors",
            "first:rounded-l-[5px] last:rounded-r-[5px]",
            "not(:first-child):border-l not(:first-child):border-border",
            value === opt.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
