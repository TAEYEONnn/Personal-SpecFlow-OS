"use client"

import { useEffect, useState } from 'react'

type Toast = {
  id: number
  message: string
  type: 'success' | 'error'
}

let toastId = 0
type Listener = (toasts: Toast[]) => void
const listeners = new Set<Listener>()
let currentToasts: Toast[] = []

function notify(toasts: Toast[]) {
  currentToasts = toasts
  listeners.forEach((l) => l(toasts))
}

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  const id = ++toastId
  notify([...currentToasts, { id, message, type }])
  setTimeout(() => notify(currentToasts.filter((t) => t.id !== id)), 3000)
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    listeners.add(setToasts)
    return () => { listeners.delete(setToasts) }
  }, [])
  if (toasts.length === 0) return null
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`chat-toast chat-toast--${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
