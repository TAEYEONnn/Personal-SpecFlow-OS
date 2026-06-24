"use client"

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Plus } from '@phosphor-icons/react'

import { useActiveTeam } from '@/components/workspace-global/active-team-provider'
import type { ChatMessageView } from '@/lib/chat/service'
import type { WorkspaceNoteView } from '@/lib/notes/service'
import type { WorkspaceTaskView } from '@/lib/tasks/service'
import { formatKoreanDateTime } from '@/lib/format-date'

type ProjectSummary = {
  id: string
  name: string
  revision: number
  updatedAt: string
  teamId?: string | null
  teamName?: string | null
}

type ActivityItem = {
  id: string
  text: string
  time: string
  href: string
}

export function WorkspaceHome({
  username,
  projects,
}: {
  username: string
  projects: ProjectSummary[]
}) {
  const { activeTeam } = useActiveTeam()
  const [personalTasks, setPersonalTasks] = useState<WorkspaceTaskView[]>([])
  const [teamTasks, setTeamTasks] = useState<WorkspaceTaskView[]>([])
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [notes, setNotes] = useState<WorkspaceNoteView[]>([])
  const [quickTitle, setQuickTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [greeting, setGreeting] = useState('안녕하세요')
  const menuRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      setLoadError('')
      const requests: Promise<Response>[] = [
        fetch('/api/tasks?personal=true', { credentials: 'include' }),
      ]
      if (activeTeam) {
        requests.push(
          fetch(`/api/tasks?teamId=${activeTeam.id}`, { credentials: 'include' }),
          fetch(`/api/chat?teamId=${activeTeam.id}&limit=5`, { credentials: 'include' }),
          fetch(`/api/notes?teamId=${activeTeam.id}`, { credentials: 'include' }),
        )
      }
      const responses = await Promise.all(requests)
      const data = await Promise.all(responses.map((r) => r.json()))
      setPersonalTasks(data[0]?.tasks ?? [])
      if (activeTeam) {
        setTeamTasks(data[1]?.tasks ?? [])
        setMessages([...(data[2]?.messages ?? [])].reverse())
        setNotes(data[3]?.notes ?? [])
      } else {
        setTeamTasks([])
        setMessages([])
        setNotes([])
      }
    } catch {
      setLoadError('데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }, [activeTeam])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [load])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const hour = new Date().getHours()
      setGreeting(hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim() || creating) return
    setCreating(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: quickTitle, isPersonal: true }),
    })
    setQuickTitle('')
    setCreating(false)
    await load()
  }

  async function toggleTask(task: WorkspaceTaskView) {
    const nextStatus: WorkspaceTaskView['status'] = task.status === 'done' ? 'todo' : 'done'
    const patch = (prev: WorkspaceTaskView[]) =>
      prev.map((t) => t.id === task.id ? { ...t, status: nextStatus } : t)
    setPersonalTasks(patch)
    setTeamTasks(patch)
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: nextStatus }),
    })
  }

  const displayName = username.split('@')[0]

  const todayTasks = [
    ...personalTasks.filter((t) => t.status !== 'done'),
    ...teamTasks.filter((t) => t.status !== 'done'),
  ].slice(0, 5)

  const activity: ActivityItem[] = [
    ...messages.slice(-5).map((m): ActivityItem => ({
      id: `msg-${m.id}`,
      text: `${m.authorName || m.authorEmail}님이 메시지를 남겼어요.`,
      time: m.createdAt,
      href: '/chat',
    })),
    ...notes.slice(0, 3).map((n): ActivityItem => ({
      id: `note-${n.id}`,
      text: `메모 "${n.title || '빠른 메모'}"이(가) 수정됐어요.`,
      time: n.updatedAt,
      href: '/notes',
    })),
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 5)

  const recentProjects = projects
    .filter((p) => !activeTeam || p.teamId === activeTeam.id)
    .slice(0, 4)

  const PRIORITY_LABEL: Record<string, string> = { high: '높음', medium: '보통', low: '낮음' }

  return (
    <main className="workspace-page home-dashboard">
      {loadError && <p className="form-error" role="alert">{loadError}</p>}
      {/* 인사 + 빠른 생성 */}
      <header className="home-greeting">
        <div className="home-greeting-text">
          <p>{greeting}, {displayName}님</p>
          <h1>
            {todayTasks.length > 0
              ? `오늘 할 일이 ${todayTasks.length}개 있어요.`
              : '오늘 할 일을 모두 끝냈어요 🎉'}
          </h1>
        </div>
        <div className="home-create-wrap" ref={menuRef}>
          <button
            className="button button-primary home-create-btn"
            onClick={() => setShowMenu((v) => !v)}
          >
            <Plus size={15} weight="bold" />새로 만들기
          </button>
          {showMenu && (
            <div className="home-create-menu" role="menu">
              <Link href="/my/tasks" className="home-create-option" onClick={() => setShowMenu(false)}>할 일</Link>
              <Link href="/notes" className="home-create-option" onClick={() => setShowMenu(false)}>메모</Link>
              <Link href="/projects/new" className="home-create-option" onClick={() => setShowMenu(false)}>프로젝트</Link>
            </div>
          )}
        </div>
      </header>

      <div className="home-body">
        <div className="home-main">
          {/* 오늘의 할 일 */}
          <section className="home-section">
            <div className="home-section-head">
              <h2>오늘의 할 일</h2>
              <Link href="/my/tasks" className="home-view-all">전체 보기 <ArrowRight size={13} /></Link>
            </div>
            {todayTasks.length > 0 ? (
              <ul className="home-task-list">
                {todayTasks.map((task) => (
                  <li key={task.id} className={`home-task-row${task.status === 'done' ? ' is-done' : ''}`}>
                    <button
                      className="task-check"
                      onClick={() => toggleTask(task)}
                      aria-label={task.status === 'done' ? '완료 취소' : '완료 처리'}
                    >{task.status === 'done' ? '✓' : ''}</button>
                    <span className="home-task-title">{task.title}</span>
                    <span className={`priority-badge priority-${task.priority}`}>
                      {PRIORITY_LABEL[task.priority] ?? task.priority}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="home-empty-inline">오늘 할 일이 없어요.</p>
            )}
            <form className="home-quick-row" onSubmit={createTask}>
              <input
                className="field"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="할 일 빠르게 추가"
              />
              <button className="button" type="submit" disabled={creating || !quickTitle.trim()}>추가</button>
            </form>
          </section>

          {/* 최근 팀 활동 */}
          {activeTeam && (
            <section className="home-section">
              <div className="home-section-head">
                <h2>최근 팀 활동</h2>
                <Link href="/chat" className="home-view-all">대화 보기 <ArrowRight size={13} /></Link>
              </div>
              {activity.length > 0 ? (
                <ul className="home-activity-list">
                  {activity.map((item) => (
                    <li key={item.id} className="home-activity-row">
                      <Link href={item.href}>{item.text}</Link>
                      <time>{formatKoreanDateTime(item.time)}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="home-empty-inline">팀 활동이 없어요. <Link href="/chat">먼저 한마디 남겨보세요.</Link></p>
              )}
            </section>
          )}
        </div>

        {/* 최근 프로젝트 */}
        <section className="home-section home-projects-section">
          <div className="home-section-head">
            <h2>최근 프로젝트</h2>
            <Link href="/projects" className="home-view-all">모두 보기 <ArrowRight size={13} /></Link>
          </div>
          {recentProjects.length > 0 ? (
            <ul className="home-project-list">
              {recentProjects.map((project) => (
                <li key={project.id}>
                  <Link className="home-project-row" href={`/projects/${project.id}`}>
                    <div className="home-project-info">
                      <strong>{project.name}</strong>
                      <span>{project.teamName ?? '개인 프로젝트'} · {formatKoreanDateTime(project.updatedAt)}</span>
                    </div>
                    <ArrowRight size={15} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="home-empty-inline">
              아직 프로젝트가 없어요.{' '}
              <Link href="/projects/new">첫 프로젝트 만들기</Link>
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
