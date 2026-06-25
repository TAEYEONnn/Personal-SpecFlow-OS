"use client"

import { useCallback, useEffect, useState } from 'react'

import { useActiveTeam } from '@/components/workspace-global/active-team-provider'
import type { WorkspaceTaskView } from '@/lib/tasks/service'

export function TaskBoard({ personal = false }: { personal?: boolean }) {
  const { activeTeam, loading: teamLoading } = useActiveTeam()
  const [tasks, setTasks] = useState<WorkspaceTaskView[]>([])
  const [title, setTitle] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!personal && !activeTeam) return setTasks([])
    const params = new URLSearchParams()
    if (personal) params.set('personal', 'true')
    else if (activeTeam) params.set('teamId', activeTeam.id)
    const response = await fetch(`/api/tasks?${params}`, { credentials: 'include' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? '할 일을 불러오지 못했어요.')
    setTasks(data.tasks)
  }, [activeTeam, personal])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      load().catch((reason) => setError(reason.message))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [load])

  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() || pending) return
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          isPersonal: personal,
          teamId: personal ? null : activeTeam?.id,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? '할 일을 만들지 못했어요.')
      setTasks((current) => [data.task, ...current])
      setTitle('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '할 일을 만들지 못했어요.')
    } finally {
      setPending(false)
    }
  }

  async function toggle(task: WorkspaceTaskView) {
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus } : item))
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: nextStatus }),
    })
    const data = await response.json()
    if (response.ok) setTasks((current) => current.map((item) => item.id === task.id ? data.task : item))
    else setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: task.status } : item))
  }

  async function updatePriority(task: WorkspaceTaskView, priority: string) {
    const prev = task.priority
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, priority: priority as WorkspaceTaskView['priority'] } : item))
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ priority }),
    })
    if (!response.ok) setTasks((current) => current.map((item) => item.id === task.id ? { ...item, priority: prev } : item))
  }

  async function remove(id: string) {
    const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE', credentials: 'include' })
    if (response.ok) setTasks((current) => current.filter((task) => task.id !== id))
  }

  if (!personal && !teamLoading && !activeTeam) {
    return <div className="workspace-empty">팀을 만들거나 선택하면 공동 할 일을 관리할 수 있어요.</div>
  }

  return (
    <div className="workspace-stack">
      <form className="quick-input" onSubmit={create}>
        <input
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={personal ? '내 할 일을 추가해요' : '팀 할 일을 추가해요'}
          aria-label="새 할 일"
        />
        <button className="button button-primary" disabled={pending || !title.trim()}>추가</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="workspace-list">
        {tasks.length === 0 ? (
          <div className="workspace-empty">오늘 뭐부터 할까요? 할 일을 하나 추가해 보세요.</div>
        ) : tasks.map((task) => (
          <article className={`workspace-list-item${task.status === 'done' ? ' is-done' : ''}`} key={task.id}>
            <button
              className="task-check"
              aria-label={task.status === 'done' ? '완료 취소' : '완료 처리'}
              onClick={() => toggle(task)}
            >{task.status === 'done' ? '✓' : ''}</button>
            <div className="workspace-list-copy">
              <strong>{task.title}</strong>
              <span>{task.status}</span>
            </div>
            <select
              className="priority-select"
              value={task.priority}
              onChange={(event) => updatePriority(task, event.target.value)}
              aria-label="중요도"
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
            </select>
            <button className="icon-action icon-action--danger" onClick={() => remove(task.id)}>삭제</button>
          </article>
        ))}
      </div>
    </div>
  )
}
