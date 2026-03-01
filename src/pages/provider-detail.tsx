import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProviderCard } from "@/components/provider-card"
import { ProviderAnalyticsPage } from "@/pages/provider-analytics"
import type { PluginDisplayState } from "@/lib/plugin-types"
import type { DisplayMode, ResetTimerDisplayMode } from "@/lib/settings"

interface ProviderDetailPageProps {
  plugin: PluginDisplayState | null
  onRetry?: () => void
  displayMode: DisplayMode
  resetTimerDisplayMode: ResetTimerDisplayMode
  onResetTimerDisplayModeToggle?: () => void
}

export function ProviderDetailPage({
  plugin,
  onRetry,
  displayMode,
  resetTimerDisplayMode,
  onResetTimerDisplayModeToggle,
}: ProviderDetailPageProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview")

  if (!plugin) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Provider not found
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-1 px-1 pt-2 pb-1 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className={activeTab === "overview" ? "bg-muted text-foreground" : "text-muted-foreground"}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={activeTab === "analytics" ? "bg-muted text-foreground" : "text-muted-foreground"}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </Button>
      </div>

      {activeTab === "overview" ? (
        <ProviderCard
          name={plugin.meta.name}
          plan={plugin.data?.plan}
          links={plugin.meta.links}
          showSeparator={false}
          loading={plugin.loading}
          error={plugin.error}
          lines={plugin.data?.lines ?? []}
          skeletonLines={plugin.meta.lines}
          lastManualRefreshAt={plugin.lastManualRefreshAt}
          onRetry={onRetry}
          scopeFilter="all"
          displayMode={displayMode}
          resetTimerDisplayMode={resetTimerDisplayMode}
          onResetTimerDisplayModeToggle={onResetTimerDisplayModeToggle}
        />
      ) : (
        <ProviderAnalyticsPage providerId={plugin.meta.id} />
      )}
    </div>
  )
}
