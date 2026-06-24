"use client"

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import {
  ACTIVE_TEAM_STORAGE_KEY,
  resolveInitialTeamId,
  type TeamSummary,
} from '@/lib/workspace/active-team'

type ActiveTeamValue = {
  teams: TeamSummary[]
  activeTeam: TeamSummary | null
  loading: boolean
  setActiveTeamId: (id: string | null) => void
}

const ActiveTeamContext = createContext<ActiveTeamValue | null>(null)

export function ActiveTeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/teams', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : { teams: [] })
      .then((data) => {
        if (cancelled) return
        const nextTeams = Array.isArray(data.teams) ? data.teams : []
        setTeams(nextTeams)
        setActiveTeamIdState(resolveInitialTeamId(
          nextTeams,
          window.localStorage.getItem(ACTIVE_TEAM_STORAGE_KEY),
        ))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  function setActiveTeamId(id: string | null) {
    if (id) window.localStorage.setItem(ACTIVE_TEAM_STORAGE_KEY, id)
    else window.localStorage.removeItem(ACTIVE_TEAM_STORAGE_KEY)
    setActiveTeamIdState(id)
  }

  const value = useMemo<ActiveTeamValue>(() => ({
    teams,
    activeTeam: teams.find((team) => team.id === activeTeamId) ?? null,
    loading,
    setActiveTeamId,
  }), [teams, activeTeamId, loading])

  return <ActiveTeamContext.Provider value={value}>{children}</ActiveTeamContext.Provider>
}

export function useActiveTeam() {
  const value = useContext(ActiveTeamContext)
  if (!value) throw new Error('useActiveTeam must be used inside ActiveTeamProvider')
  return value
}
