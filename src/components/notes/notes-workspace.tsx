"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

import { useActiveTeam } from '@/components/workspace-global/active-team-provider'
import type { WorkspaceNoteView } from '@/lib/notes/service'

export function NotesWorkspace({ personal = false }: { personal?: boolean }) {
  const { activeTeam, loading: teamLoading } = useActiveTeam()
  const [notes, setNotes] = useState<WorkspaceNoteView[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scratch, setScratch] = useState('')
  const [scratchNoteId, setScratchNoteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    await Promise.resolve()
    if (!personal && teamLoading) return
    if (!personal && !activeTeam) {
      setNotes([])
      setSelectedId(null)
      return
    }
    const params = new URLSearchParams()
    if (personal) params.set('personal', 'true')
    else if (activeTeam) params.set('teamId', activeTeam.id)
    const response = await fetch(`/api/notes?${params}`, { credentials: 'include' })
    const data = await response.json()
    if (response.ok) {
      const nextNotes = Array.isArray(data.notes) ? data.notes : []
      setNotes(nextNotes)
      setSelectedId((current) => current ?? nextNotes[0]?.id ?? null)
    }
  }, [activeTeam, personal, teamLoading])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [load])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function scheduleScratch(value: string) {
    setScratch(value)
    if (timer.current) clearTimeout(timer.current)
    if (!value.trim()) return
    const currentScratchId = scratchNoteId
    timer.current = setTimeout(async () => {
      setSaving(true)
      const response = await fetch(currentScratchId ? `/api/notes/${currentScratchId}` : '/api/notes', {
        method: currentScratchId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(currentScratchId ? { content: value } : {
          content: value,
          kind: 'scratch',
          visibility: personal ? 'personal' : 'team',
          teamId: personal ? null : activeTeam?.id,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setScratchNoteId(data.note.id)
        await load()
      }
      setSaving(false)
    }, 600)
  }

  async function createNote() {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: '새 메모',
        content: '',
        kind: 'note',
        visibility: personal ? 'personal' : 'team',
        teamId: personal ? null : activeTeam?.id,
      }),
    })
    const data = await response.json()
    if (response.ok) {
      setNotes((current) => [data.note, ...current])
      setSelectedId(data.note.id)
    }
  }

  async function updateNote(id: string, patch: Record<string, unknown>) {
    const response = await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    })
    const data = await response.json()
    if (response.ok) setNotes((current) => current.map((note) => note.id === id ? data.note : note))
  }

  async function deleteNote(id: string) {
    if (!window.confirm('이 메모를 삭제할까요?')) return
    const response = await fetch(`/api/notes/${id}`, { method: 'DELETE', credentials: 'include' })
    if (response.ok) {
      setNotes((current) => current.filter((note) => note.id !== id))
      if (selectedId === id) setSelectedId(null)
      if (scratchNoteId === id) { setScratchNoteId(null); setScratch('') }
    }
  }

  async function convert(id: string, target: 'note' | 'task') {
    const response = await fetch(`/api/notes/${id}/convert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ target }),
    })
    if (response.ok) {
      if (scratchNoteId === id) {
        setScratchNoteId(null)
        setScratch('')
      }
      await load()
    }
  }

  const selected = notes.find((note) => note.id === selectedId) ?? null
  if (!personal && !teamLoading && !activeTeam) {
    return <div className="workspace-empty">팀을 선택하면 공유 메모와 낙서를 사용할 수 있어요.</div>
  }

  return (
    <div className="notes-layout">
      <section className="workspace-stack">
        <textarea
          className="scratch-input"
          value={scratch}
          onChange={(event) => scheduleScratch(event.target.value)}
          placeholder="무슨 생각을 하고 있나요?"
          aria-label="빠른 메모"
        />
        <span className="autosave-state">{saving ? '저장 중…' : scratchNoteId ? '자동 저장됨' : '입력하면 자동 저장돼요'}</span>
        {scratchNoteId && (
          <div className="inline-actions">
            <button className="button button-ghost button-sm" onClick={() => convert(scratchNoteId, 'note')}>메모로 전환</button>
            <button className="button button-ghost button-sm" onClick={() => convert(scratchNoteId, 'task')}>할 일로 전환</button>
          </div>
        )}
        <button className="button button-primary" onClick={createNote}>+ 새 메모</button>
        <div className="workspace-list">
          {notes.map((note) => (
            <button className="note-row" key={note.id} onClick={() => setSelectedId(note.id)}>
              <strong>{note.title || '빠른 메모'}</strong>
              <span>{note.content.slice(0, 70) || '내용을 입력해요.'}</span>
            </button>
          ))}
          {notes.length === 0 && <div className="workspace-empty">생각난 걸 바로 적어두세요.</div>}
        </div>
      </section>
      <section className="note-editor">
        {selected ? (
          <>
            <div className="note-editor-header">
              <input
                className="note-title-input"
                value={selected.title ?? ''}
                onChange={(event) => setNotes((current) => current.map((note) => note.id === selected.id ? { ...note, title: event.target.value } : note))}
                onBlur={(event) => updateNote(selected.id, { title: event.target.value })}
                placeholder="메모 제목"
              />
              <button className="icon-action icon-action--danger" onClick={() => deleteNote(selected.id)}>삭제</button>
            </div>
            <textarea
              className="note-content-input"
              value={selected.content}
              onChange={(event) => setNotes((current) => current.map((note) => note.id === selected.id ? { ...note, content: event.target.value } : note))}
              onBlur={(event) => updateNote(selected.id, { content: event.target.value })}
              placeholder="내용을 적어보세요."
            />
          </>
        ) : <div className="workspace-empty">왼쪽에서 메모를 골라요.</div>}
      </section>
    </div>
  )
}
