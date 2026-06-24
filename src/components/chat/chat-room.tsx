"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

import { useActiveTeam } from '@/components/workspace-global/active-team-provider'
import type { ChatMessageView } from '@/lib/chat/service'

function MessageText({ content }: { content: string }) {
  const parts = content.split(/(https?:\/\/[^\s]+)/g)
  return (
    <p>{parts.map((part, index) => part.startsWith('http')
      ? <a href={part} target="_blank" rel="noreferrer noopener" key={`${part}-${index}`}>{part}</a>
      : part)}</p>
  )
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

export function ChatRoom() {
  const { activeTeam, loading: teamLoading } = useActiveTeam()
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [content, setContent] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null)
  const latestId = useRef<string | null>(null)

  const load = useCallback(async (incremental = false) => {
    if (!activeTeam) return setMessages([])
    const params = new URLSearchParams({ teamId: activeTeam.id })
    if (incremental && latestId.current) params.set('after', latestId.current)
    const response = await fetch(`/api/chat?${params}`, { credentials: 'include' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? '대화를 불러오지 못했어요.')
    const incoming: ChatMessageView[] = data.messages
    if (incremental) {
      setMessages((current) => [...current, ...incoming.filter((message) => !current.some((item) => item.id === message.id))])
    } else {
      const ordered = [...incoming].reverse()
      setMessages(ordered)
      latestId.current = ordered.at(-1)?.id ?? null
    }
    if (incoming.length) latestId.current = incoming.at(-1)?.id ?? latestId.current
  }, [activeTeam])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      latestId.current = null
      load().catch((reason) => setError(reason.message))
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [load])

  useEffect(() => {
    if (!activeTeam) return
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(true).catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(interval)
  }, [activeTeam, load])

  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (!content.trim() || !activeTeam || pending) return
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId: activeTeam.id, content }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? '메시지를 보내지 못했어요.')
      setMessages((current) => [...current, data.message])
      latestId.current = data.message.id
      setContent('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '메시지를 보내지 못했어요.')
    } finally {
      setPending(false)
    }
  }

  async function react(messageId: string, emoji: string) {
    setEmojiPickerFor(null)
    const response = await fetch(`/api/chat/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ emoji }),
    })
    const data = await response.json()
    if (response.ok) setMessages((current) => current.map((message) => message.id === messageId ? data.message : message))
  }

  function togglePicker(event: React.MouseEvent, messageId: string) {
    event.stopPropagation()
    setEmojiPickerFor((prev) => (prev === messageId ? null : messageId))
  }

  if (!teamLoading && !activeTeam) {
    return <div className="workspace-empty">팀을 선택하면 공용 대화를 시작할 수 있어요.</div>
  }

  return (
    <div className="chat-room">
      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="workspace-empty">팀에 아직 올라온 이야기가 없어요.<br />먼저 한마디 남겨보세요.</div>
        ) : messages.map((message) => (
          <article className="chat-message" key={message.id} onClick={() => setEmojiPickerFor(null)}>
            <div className="chat-avatar">{(message.authorName || message.authorEmail).slice(0, 1).toUpperCase()}</div>
            <div>
              <header><strong>{message.authorName || message.authorEmail}</strong><time>{new Date(message.createdAt).toLocaleString('ko-KR')}</time></header>
              <MessageText content={message.content} />
              <div className="reaction-row">
                {message.reactions.map((reaction) => (
                  <button key={reaction.emoji} className="reaction-btn" onClick={() => react(message.id, reaction.emoji)}>
                    {reaction.emoji} {reaction.userIds.length}
                  </button>
                ))}
                <div className="emoji-picker-wrap">
                  <button className="reaction-add-btn" onClick={(e) => togglePicker(e, message.id)} aria-label="반응 추가">+</button>
                  {emojiPickerFor === message.id && (
                    <div className="emoji-picker">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button key={emoji} className="emoji-option" onClick={() => react(message.id, emoji)}>{emoji}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <form className="chat-composer" onSubmit={send}>
        <textarea
          className="field"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="팀에 한마디 남겨보세요."
          aria-label="메시지"
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" disabled={pending || !content.trim()}>보내기</button>
      </form>
    </div>
  )
}
