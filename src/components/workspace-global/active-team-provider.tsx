"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

import {
  ACTIVE_TEAM_STORAGE_KEY,
  ACTIVE_TEAM_COOKIE_KEY,
  resolveInitialTeamId,
  type TeamSummary,
} from '@/lib/workspace/active-team'

type ActiveTeamValue = {
  teams: TeamSummary[]
  activeTeam: TeamSummary | null
  loading: boolean
  setActiveTeamId: (id: string | null) => void
  refreshTeams: () => void
}

const ActiveTeamContext = createContext<ActiveTeamValue | null>(null)

export function ActiveTeamProvider({
  children,
  initialTeams,
}: {
  children: React.ReactNode
  initialTeams?: TeamSummary[]
}) {
  // Start with server-provided teams immediately — no loading flash
  const [teams, setTeams] = useState<TeamSummary[]>(initialTeams ?? [])
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null)
  // Show loading only when we have no teams at all yet
  const [loading, setLoading] = useState(!(initialTeams && initialTeams.length > 0))
  const fetchedRef = useRef(false)

  function fetchTeams(onDone?: (nextTeams: TeamSummary[]) => void) {
    fetch('/api/teams', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { teams: [] })
      .then((data) => {
        const nextTeams: TeamSummary[] = Array.isArray(data.teams)
          ? data.teams.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))
          : []
        setTeams(nextTeams)
        onDone?.(nextTeams)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const savedId = typeof window !== 'undefined'
      ? window.localStorage.getItem(ACTIVE_TEAM_STORAGE_KEY)
      : null

    if (initialTeams && initialTeams.length > 0) {
      // Resolve active team immediately from server data + localStorage
      setActiveTeamIdState(resolveInitialTeamId(initialTeams, savedId))
      setLoading(false)
      // Background refresh to pick up any team changes during the session
      fetchTeams((nextTeams) => {
        setActiveTeamIdState((prev) =>
          nextTeams.some((t) => t.id === prev) ? prev : resolveInitialTeamId(nextTeams, savedId)
        )
      })
    } else {
      // No server data — must fetch before we can resolve
      fetchTeams((nextTeams) => {
        setActiveTeamIdState(resolveInitialTeamId(nextTeams, savedId))
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function setActiveTeamId(id: string | null) {
    if (id) {
      window.localStorage.setItem(ACTIVE_TEAM_STORAGE_KEY, id)
      // Cookie lets the server preload data for the selected team
      document.cookie = `${ACTIVE_TEAM_COOKIE_KEY}=${id}; path=/; max-age=31536000; SameSite=Lax`
    } else {
      window.localStorage.removeItem(ACTIVE_TEAM_STORAGE_KEY)
      document.cookie = `${ACTIVE_TEAM_COOKIE_KEY}=; path=/; max-age=0`
    }
    setActiveTeamIdState(id)
  }

  function refreshTeams() {
    fetchTeams((nextTeams) => {
      setActiveTeamIdState((prev) =>
        nextTeams.some((t) => t.id === prev)
          ? prev
          : resolveInitialTeamId(nextTeams, window.localStorage.getItem(ACTIVE_TEAM_STORAGE_KEY))
      )
    })
  }

  const value = useMemo<ActiveTeamValue>(() => ({
    teams,
    activeTeam: teams.find((t) => t.id === activeTeamId) ?? null,
    loading,
    setActiveTeamId,
    refreshTeams,
  }), [teams, activeTeamId, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  return <ActiveTeamContext.Provider value={value}>{children}</ActiveTeamContext.Provider>
}

export function useActiveTeam() {
  const value = useContext(ActiveTeamContext)
  if (!value) throw new Error('useActiveTeam must be used inside ActiveTeamProvider')
  return value
}
