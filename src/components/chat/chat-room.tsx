"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { createClient } from '@/lib/supabase/client'
import { useActiveTeam } from '@/components/workspace-global/active-team-provider'
import type { ChatMessageView, ChatAnnouncement, Mention } from '@/lib/chat/service'

// --- Utilities ---

function MessageText({ content, mentions }: { content: string; mentions: Mention[] }) {
  if (!content) return null
  const parts = content.split(/(https?:\/\/[^\s]+|@\w+)/g)
  return (
    <p>
      {parts.map((part, i) => {
        if (part.startsWith('http')) {
          return <a href={part} target="_blank" rel="noreferrer noopener" key={i}>{part}</a>
        }
        if (part.startsWith('@')) {
          const username = part.slice(1)
          const isMentioned = mentions.some(
            (m) => m.displayName === username || m.userId === username
          )
          return isMentioned
            ? <mark key={i} className="chat-mention">{part}</mark>
            : <span key={i}>{part}</span>
        }
        return part
      })}
    </p>
  )
}

type MentionCandidate = { userId: string; username: string; displayName: string }

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

// --- Main Component ---

export function ChatRoom() {
  const { activeTeam, loading: teamLoading } = useActiveTeam()

  // Messages state
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [announcements, setAnnouncements] = useState<ChatAnnouncement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Compose state
  const [content, setContent] = useState('')
  const [pending, setPending] = useState(false)

  // UI state
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [announcedIds, setAnnouncedIds] = useState<Set<string>>(new Set())
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<'owner' | 'admin' | 'member' | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([])
  const [allMembers, setAllMembers] = useState<MentionCandidate[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const [pendingMentions, setPendingMentions] = useState<MentionCandidate[]>([])

  // Scroll state
  const messagesRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // --- Toast helper ---
  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // --- Fetch my user ID ---
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.id) setMyUserId(data.id) })
      .catch(() => undefined)
  }, [])

  // --- Fetch team members and role ---
  useEffect(() => {
    if (!activeTeam) {
      const timer = window.setTimeout(() => {
        setMyRole(null)
        setAllMembers([])
      }, 0)
      return () => window.clearTimeout(timer)
    }
    fetch(`/api/teams/${activeTeam.id}/members`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.members) return
        setAllMembers(data.members)
        if (myUserId) {
          const me = data.members.find((m: { userId: string; role?: string }) => m.userId === myUserId)
          setMyRole(me?.role ?? 'member')
        }
      })
      .catch(() => undefined)
  }, [activeTeam, myUserId])

  // --- Load messages ---
  const loadMessages = useCallback(async (teamId: string) => {
    setLoading(true)
    try {
      const [msgRes, annRes] = await Promise.all([
        fetch(`/api/chat?teamId=${teamId}`, { credentials: 'include' }),
        fetch(`/api/chat/announcements?teamId=${teamId}`, { credentials: 'include' }),
      ])
      const msgData = await msgRes.json()
      const annData = annRes.ok ? await annRes.json() : { announcements: [] }
      if (msgRes.ok) {
        const ordered = [...(msgData.messages as ChatMessageView[])].reverse()
        setMessages(ordered)
        setAnnouncedIds(new Set(ordered.filter((m) => m.isAnnouncement).map((m) => m.id)))
      }
      if (annData.announcements) setAnnouncements(annData.announcements)
    } catch {
      setError('대화를 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [])

  // --- Load on team change ---
  useEffect(() => {
    if (!activeTeam) {
      const timer = window.setTimeout(() => {
        setMessages([])
        setAnnouncements([])
        setAnnouncedIds(new Set())
        setError('')
      }, 0)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => {
      setMessages([])
      setAnnouncements([])
      setAnnouncedIds(new Set())
      setError('')
      loadMessages(activeTeam.id)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeTeam, loadMessages])

  // --- Supabase Realtime subscription ---
  useEffect(() => {
    if (!activeTeam) return
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel(`chat:${activeTeam.id}`)
      // chat_messages: new messages and soft deletes / edits
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `team_id=eq.${activeTeam.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetch(`/api/chat?teamId=${activeTeam.id}&after=${payload.new.id}`, { credentials: 'include' })
              .then((r) => r.ok ? r.json() : null)
              .then((data) => {
                if (!data?.messages?.length) return
                const incoming = data.messages as ChatMessageView[]
                setMessages((current) => {
                  const ids = new Set(current.map((m) => m.id))
                  const fresh = incoming.filter((m) => !ids.has(m.id))
                  if (!fresh.length) return current
                  if (!checkAtBottom()) setNewCount((n) => n + fresh.length)
                  return [...current, ...fresh]
                })
              })
              .catch(() => undefined)
          } else if (payload.eventType === 'UPDATE') {
            setMessages((current) =>
              current.map((m) => {
                if (m.id !== payload.new.id) return m
                return {
                  ...m,
                  content: payload.new.deleted_at ? '' : (payload.new.content ?? m.content),
                  isDeleted: Boolean(payload.new.deleted_at),
                  deletedAt: payload.new.deleted_at ?? null,
                  updatedAt: payload.new.updated_at ?? m.updatedAt,
                }
              })
            )
          }
        }
      )
      // chat_message_reactions: live reaction updates from other users
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_message_reactions', filter: `team_id=eq.${activeTeam.id}` },
        (payload) => {
          const row = payload.eventType === 'DELETE' ? payload.old : payload.new
          const messageId = row.message_id as string
          const emoji = row.emoji as string
          const userId = row.user_id as string
          if (!messageId || !emoji || !userId) return

          setMessages((current) =>
            current.map((m) => {
              if (m.id !== messageId) return m
              let reactions = [...m.reactions]
              if (payload.eventType === 'INSERT') {
                const idx = reactions.findIndex((r) => r.emoji === emoji)
                if (idx >= 0) {
                  if (!reactions[idx].userIds.includes(userId)) {
                    reactions[idx] = { ...reactions[idx], userIds: [...reactions[idx].userIds, userId] }
                  }
                } else {
                  reactions = [...reactions, { emoji, userIds: [userId] }]
                }
              } else if (payload.eventType === 'DELETE') {
                const idx = reactions.findIndex((r) => r.emoji === emoji)
                if (idx >= 0) {
                  const newUserIds = reactions[idx].userIds.filter((uid) => uid !== userId)
                  reactions = newUserIds.length === 0
                    ? reactions.filter((_, i) => i !== idx)
                    : reactions.map((r, i) => i === idx ? { ...r, userIds: newUserIds } : r)
                }
              }
              return { ...m, reactions }
            })
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTeam])

  // --- Scroll helpers ---
  function checkAtBottom(): boolean {
    const el = messagesRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  function scrollToBottom() {
    const el = messagesRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  useEffect(() => {
    if (atBottom) {
      const frame = window.requestAnimationFrame(() => {
        scrollToBottom()
        setNewCount(0)
      })
      return () => window.cancelAnimationFrame(frame)
    }
  }, [messages.length, atBottom])

  function handleScroll() {
    const isBottom = checkAtBottom()
    setAtBottom(isBottom)
    if (isBottom) setNewCount(0)
  }

  // --- Send message ---
  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (!content.trim() || !activeTeam || pending) return
    const sendContent = content
    const sendMentions = pendingMentions
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teamId: activeTeam.id,
          content: sendContent,
          mentionedUserIds: sendMentions.map((m) => m.userId),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? '메시지를 보내지 못했어요.')
      setMessages((current) => {
        if (current.some((m) => m.id === data.message.id)) return current
        return [...current, data.message]
      })
      setContent('')
      setPendingMentions([])
      setAtBottom(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '메시지를 보내지 못했어요.')
      setContent(sendContent)
    } finally {
      setPending(false)
    }
  }

  // --- Keyboard handler for textarea ---
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setMentionIndex((i) => (i + 1) % mentionCandidates.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        selectMention(mentionCandidates[mentionIndex])
        return
      }
      if (event.key === 'Escape') {
        setMentionQuery(null)
        return
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send(event as unknown as React.FormEvent)
    }
  }

  // --- Mention input handling ---
  function handleContentChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = event.target.value
    setContent(val)

    const cursor = event.target.selectionStart ?? val.length
    const textBefore = val.slice(0, cursor)
    const atMatch = textBefore.match(/@(\w*)$/)
    if (atMatch) {
      const query = atMatch[1].toLowerCase()
      setMentionQuery(query)
      setMentionIndex(0)
      setMentionCandidates(
        allMembers.filter(
          (m) =>
            m.username.toLowerCase().includes(query) ||
            m.displayName.toLowerCase().includes(query)
        ).slice(0, 8)
      )
    } else {
      setMentionQuery(null)
    }
  }

  function selectMention(candidate: MentionCandidate) {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursor = textarea.selectionStart ?? content.length
    const textBefore = content.slice(0, cursor)
    const replaced = textBefore.replace(/@(\w*)$/, `@${candidate.displayName} `)
    const newContent = replaced + content.slice(cursor)
    setContent(newContent)
    setPendingMentions((prev) =>
      prev.some((m) => m.userId === candidate.userId) ? prev : [...prev, candidate]
    )
    setMentionQuery(null)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(replaced.length, replaced.length)
    }, 0)
  }

  // --- React ---
  async function react(messageId: string, emoji: string) {
    setEmojiPickerFor(null)
    const response = await fetch(`/api/chat/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ emoji }),
    })
    const data = await response.json()
    if (response.ok) {
      setMessages((current) => current.map((m) => m.id === messageId ? data.message : m))
    }
  }

  // --- Delete ---
  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/chat/${deleteTarget}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? '삭제하지 못했어요.')
      }
      setMessages((current) =>
        current.map((m) => m.id === deleteTarget
          ? { ...m, isDeleted: true, content: '', reactions: [] }
          : m
        )
      )
      showToast('메시지를 삭제했어요.', 'success')
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : '삭제하지 못했어요.', 'error')
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  // --- Announce ---
  async function toggleAnnounce(messageId: string) {
    if (!activeTeam) return
    setMenuFor(null)
    try {
      const response = await fetch('/api/chat/announcements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId: activeTeam.id, messageId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? '처리하지 못했어요.')
      if (data.announced) {
        setAnnouncedIds((prev) => new Set([...prev, messageId]))
        fetch(`/api/chat/announcements?teamId=${activeTeam.id}`, { credentials: 'include' })
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d?.announcements) setAnnouncements(d.announcements) })
          .catch(() => undefined)
        showToast('공지로 등록했어요.', 'success')
      } else {
        setAnnouncedIds((prev) => { const next = new Set(prev); next.delete(messageId); return next })
        setAnnouncements((prev) => prev.filter((a) => a.messageId !== messageId))
        showToast('공지를 해제했어요.', 'success')
      }
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : '처리하지 못했어요.', 'error')
    }
  }

  function canDelete(message: ChatMessageView): boolean {
    if (message.isDeleted) return false
    return message.authorId === myUserId || myRole === 'owner' || myRole === 'admin'
  }

  function canAnnounce(): boolean {
    return myRole === 'owner' || myRole === 'admin'
  }

  function scrollToMessage(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (!teamLoading && !activeTeam) {
    return <div className="workspace-empty">팀을 선택하면 공용 대화를 시작할 수 있어요.</div>
  }

  return (
    <div className="chat-room" onClick={() => { setEmojiPickerFor(null); setMenuFor(null) }}>
      {/* Toast */}
      {toast && (
        <div className={`chat-toast chat-toast--${toast.type}`} role="status">
          {toast.message}
        </div>
      )}

      {/* Announcements banner */}
      {announcements.length > 0 && (
        <div className="chat-announcements">
          <div className="chat-announcements-header">
            <span>📌 공지 {announcements.length}개</span>
          </div>
          <ul className="chat-announcements-list">
            {announcements.map((ann) => (
              <li key={ann.id} className="chat-announcement-item">
                <button
                  className="chat-announcement-link"
                  onClick={() => scrollToMessage(ann.messageId)}
                  title="메시지 위치로 이동"
                >
                  <span className="chat-announcement-author">{ann.message.authorName}</span>
                  <span className="chat-announcement-content">{ann.message.content.slice(0, 80)}{ann.message.content.length > 80 ? '...' : ''}</span>
                </button>
                {canAnnounce() && (
                  <button
                    className="chat-announcement-remove"
                    onClick={() => toggleAnnounce(ann.messageId)}
                    aria-label="공지 해제"
                  >x</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Messages */}
      <div
        className="chat-messages"
        ref={messagesRef}
        onScroll={handleScroll}
        aria-live="polite"
      >
        {loading && <div className="chat-loading">대화를 불러오는 중이에요...</div>}
        {!loading && messages.length === 0 && (
          <div className="workspace-empty">팀에 아직 올라온 이야기가 없어요.<br />먼저 한마디 남겨보세요.</div>
        )}
        {messages.map((message) => (
          <article
            id={`msg-${message.id}`}
            className={`chat-message${announcedIds.has(message.id) ? ' chat-message--announced' : ''}${message.isDeleted ? ' chat-message--deleted' : ''}`}
            key={message.id}
            onClick={() => { setEmojiPickerFor(null); setMenuFor(null) }}
          >
            <div className="chat-avatar">{(message.authorName || message.authorEmail).slice(0, 1).toUpperCase()}</div>
            <div className="chat-message-body">
              <header>
                <strong>{message.authorName || message.authorEmail}</strong>
                {announcedIds.has(message.id) && <span className="chat-pin-badge">📌</span>}
                <time>{new Date(message.createdAt).toLocaleString('ko-KR')}</time>
                {!message.isDeleted && (canDelete(message) || canAnnounce()) && (
                  <div className="chat-message-menu-wrap">
                    <button
                      className="chat-message-menu-btn"
                      aria-label="메시지 메뉴"
                      onClick={(e) => { e.stopPropagation(); setMenuFor((prev) => prev === message.id ? null : message.id) }}
                    >...</button>
                    {menuFor === message.id && (
                      <ul className="chat-message-menu" onClick={(e) => e.stopPropagation()}>
                        {canAnnounce() && (
                          <li>
                            <button onClick={() => toggleAnnounce(message.id)}>
                              {announcedIds.has(message.id) ? '📌 공지 해제' : '📌 공지 등록'}
                            </button>
                          </li>
                        )}
                        {canDelete(message) && (
                          <li>
                            <button
                              className="chat-menu-delete"
                              onClick={() => { setMenuFor(null); setDeleteTarget(message.id) }}
                            >삭제</button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </header>
              {message.isDeleted ? (
                <p className="chat-deleted-notice">삭제된 메시지예요.</p>
              ) : (
                <MessageText content={message.content} mentions={message.mentions} />
              )}
              {!message.isDeleted && (
                <div className="reaction-row">
                  {message.reactions.map((reaction) => (
                    <button key={reaction.emoji} className="reaction-btn" onClick={() => react(message.id, reaction.emoji)}>
                      {reaction.emoji} {reaction.userIds.length}
                    </button>
                  ))}
                  <div className="emoji-picker-wrap">
                    <button
                      className="reaction-add-btn"
                      onClick={(e) => { e.stopPropagation(); setEmojiPickerFor((prev) => prev === message.id ? null : message.id) }}
                      aria-label="반응 추가"
                    >+</button>
                    {emojiPickerFor === message.id && (
                      <div className="emoji-picker">
                        {QUICK_EMOJIS.map((emoji) => (
                          <button key={emoji} className="emoji-option" onClick={() => react(message.id, emoji)}>{emoji}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* New message badge */}
      {!atBottom && newCount > 0 && (
        <button className="chat-new-badge" onClick={() => { scrollToBottom(); setAtBottom(true) }}>
          새 메시지 {newCount}개
        </button>
      )}

      {/* Composer */}
      <form className="chat-composer" onSubmit={send}>
        {/* Mention dropdown */}
        {mentionQuery !== null && mentionCandidates.length > 0 && (
          <ul className="mention-dropdown">
            {mentionCandidates.map((candidate, i) => (
              <li key={candidate.userId}>
                <button
                  type="button"
                  className={`mention-option${i === mentionIndex ? ' mention-option--active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); selectMention(candidate) }}
                >
                  <strong>{candidate.displayName}</strong>
                  {candidate.displayName !== candidate.username && (
                    <span className="mention-username">@{candidate.username}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          ref={textareaRef}
          className="field"
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="팀에 한마디 남겨보세요. @로 멘션할 수 있어요."
          aria-label="메시지"
          rows={2}
          disabled={pending}
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="chat-composer-actions">
          <span className="chat-composer-hint">Enter 전송 / Shift+Enter 줄바꿈</span>
          <button className="button button-primary" disabled={pending || !content.trim()}>
            {pending ? '전송 중...' : '보내기'}
          </button>
        </div>
      </form>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="메시지를 삭제할까요?"
        description="삭제하면 복구할 수 없어요."
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
