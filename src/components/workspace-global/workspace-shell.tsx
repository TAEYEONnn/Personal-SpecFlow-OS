"use client"

import { usePathname } from 'next/navigation'

import { ActiveTeamProvider } from '@/components/workspace-global/active-team-provider'
import { WorkspaceSidebar } from '@/components/workspace-global/workspace-sidebar'
import { Toaster } from '@/components/ui/toast'
import type { TeamSummary } from '@/lib/workspace/active-team'

const publicPaths = ['/login', '/signup', '/invitations']

export function GlobalWorkspaceShell({
  children,
  initialTeams,
}: {
  children: React.ReactNode
  initialTeams?: TeamSummary[]
}) {
  const pathname = usePathname()
  const publicPage = publicPaths.some((path) => pathname.startsWith(path))
  const projectEditor = /^\/projects\/[^/]+$/.test(pathname)
  if (publicPage || projectEditor) return children

  return (
    <ActiveTeamProvider initialTeams={initialTeams}>
      <div className="global-workspace">
        <WorkspaceSidebar />
        <div className="global-workspace-main">{children}</div>
      </div>
      <Toaster />
    </ActiveTeamProvider>
  )
}
