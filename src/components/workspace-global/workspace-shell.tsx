"use client"

import { usePathname } from 'next/navigation'

import { ActiveTeamProvider } from '@/components/workspace-global/active-team-provider'
import { WorkspaceSidebar } from '@/components/workspace-global/workspace-sidebar'

const publicPaths = ['/login', '/signup', '/invitations']

export function GlobalWorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const publicPage = publicPaths.some((path) => pathname.startsWith(path))
  const projectEditor = /^\/projects\/[^/]+$/.test(pathname)
  if (publicPage || projectEditor) return children

  return (
    <ActiveTeamProvider>
      <div className="global-workspace">
        <WorkspaceSidebar />
        <div className="global-workspace-main">{children}</div>
      </div>
    </ActiveTeamProvider>
  )
}
