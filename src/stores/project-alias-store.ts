import { create } from "zustand"
import { loadProjectAliases, saveProjectAliases, type ProjectAliases } from "@/lib/settings"

type ProjectAliasStore = {
  aliases: ProjectAliases
  _hydrated: boolean
  hydrate: () => Promise<void>
  setAlias: (projectId: string, alias: string) => void
  removeAlias: (projectId: string) => void
  getDisplayName: (projectId: string, fallback: string) => string
}

export const useProjectAliasStore = create<ProjectAliasStore>((set, get) => ({
  aliases: {},
  _hydrated: false,

  hydrate: async () => {
    if (get()._hydrated) return
    try {
      const aliases = await loadProjectAliases()
      set({ aliases, _hydrated: true })
    } catch (e) {
      console.error("Failed to load project aliases:", e)
      set({ _hydrated: true })
    }
  },

  setAlias: (projectId, alias) => {
    const trimmed = alias.trim()
    const next = { ...get().aliases }
    if (trimmed) {
      next[projectId] = trimmed
    } else {
      delete next[projectId]
    }
    set({ aliases: next })
    saveProjectAliases(next).catch((e) =>
      console.error("Failed to save project alias:", e),
    )
  },

  removeAlias: (projectId) => {
    const next = { ...get().aliases }
    delete next[projectId]
    set({ aliases: next })
    saveProjectAliases(next).catch((e) =>
      console.error("Failed to save project alias:", e),
    )
  },

  getDisplayName: (projectId, fallback) => {
    return get().aliases[projectId] || fallback
  },
}))
