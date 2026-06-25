"use client"

import { useEffect, useRef } from 'react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const firstBtn = dialogRef.current?.querySelector('button') as HTMLButtonElement | null
    firstBtn?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="confirm-dialog" ref={dialogRef}>
        <h3 id="confirm-title" className="confirm-title">{title}</h3>
        {description && <p className="confirm-desc">{description}</p>}
        <div className="confirm-actions">
          <button
            className="button"
            onClick={onCancel}
            disabled={loading}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`button ${danger ? 'button-danger' : 'button-primary'}`}
            onClick={onConfirm}
            disabled={loading}
            type="button"
          >
            {loading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
