import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { ProviderCard } from "@/components/provider-card"
import { ProviderAnalyticsPage } from "@/pages/provider-analytics"
import { ProviderProjectsPage } from "@/pages/provider-projects"
import type { PluginDisplayState } from "@/lib/plugin-types"
import type { DisplayMode, ResetTimerDisplayMode } from "@/lib/settings"

const PROJECT_PROVIDERS = new Set(["claude"])

type TabId = "overview" | "analytics" | "projects"

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
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  const showProjectsTab = useMemo(
    () => plugin != null && PROJECT_PROVIDERS.has(plugin.meta.id),
    [plugin],
  )

  if (!plugin) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Provider not found
      </div>
    )
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "analytics", label: "Analytics" },
    ...(showProjectsTab ? [{ id: "projects" as TabId, label: "Projects" }] : []),
  ]

  return (
    <div>
      <div className="flex gap-1 px-1 pt-2 pb-1 border-b border-border/50">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            className={activeTab === tab.id ? "bg-muted text-foreground" : "text-muted-foreground"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
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
      ) : activeTab === "analytics" ? (
        <ProviderAnalyticsPage providerId={plugin.meta.id} />
      ) : (
        <ProviderProjectsPage providerId={plugin.meta.id} />
      )}
    </div>
  )
}
