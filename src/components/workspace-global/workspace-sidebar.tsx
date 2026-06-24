"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  ChatCircleDots,
  CheckSquare,
  FolderSimple,
  House,
  Note,
  Plus,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react'

import { useActiveTeam } from '@/components/workspace-global/active-team-provider'

function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.role === 'admin') setIsAdmin(true) })
      .catch(() => undefined)
  }, [])
  return isAdmin
}

const groups = [
  {
    label: '워크스페이스',
    items: [
      { href: '/', label: '홈', icon: House },
      { href: '/chat', label: '대화', icon: ChatCircleDots },
      { href: '/tasks', label: '할 일', icon: CheckSquare },
      { href: '/notes', label: '메모', icon: Note },
    ],
  },
  {
    label: '프로젝트',
    items: [
      { href: '/projects', label: '전체 프로젝트', icon: FolderSimple },
      { href: '/projects/new', label: '프로젝트 만들기', icon: Plus },
    ],
  },
  {
    label: '내 공간',
    items: [
      { href: '/my/tasks', label: '내 할 일', icon: CheckSquare },
      { href: '/my/notes', label: '내 메모', icon: Note },
    ],
  },
] as const

export function WorkspaceSidebar() {
  const pathname = usePathname()
  const { teams, activeTeam, setActiveTeamId } = useActiveTeam()
  const isAdmin = useIsAdmin()

  return (
    <aside className="global-sidebar">
      <Link className="global-brand" href="/">SpecFlow OS</Link>
      <label className="global-team-label">
        작업 팀
        <select
          className="global-team-select"
          value={activeTeam?.id ?? ''}
          onChange={(event) => setActiveTeamId(event.target.value || null)}
        >
          <option value="">개인 공간</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
      </label>
      <nav aria-label="전역 메뉴">
        {groups.map((group) => (
          <section className="global-nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  className={`global-nav-item${active ? ' global-nav-item--active' : ''}`}
                  href={href}
                  key={href}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
          </section>
        ))}
        <section className="global-nav-group">
          <p>팀</p>
          <Link className="global-nav-item" href={activeTeam ? `/teams/${activeTeam.id}` : '/teams/new'}>
            <UsersThree size={18} />멤버·팀 설정
          </Link>
          <Link className="global-nav-item" href="/profile">
            <UserCircle size={18} />프로필
          </Link>
          {isAdmin && (
            <a
              className="global-nav-item"
              href="/admin"
              target="_blank"
              rel="noreferrer"
            >
              <UserCircle size={18} />관리자 화면 열기 ↗
            </a>
          )}
        </section>
      </nav>
    </aside>
  )
}
