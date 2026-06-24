import { NotesWorkspace } from '@/components/notes/notes-workspace'
import { requireAuthContext } from '@/lib/auth/context'

export default async function NotesPage() {
  await requireAuthContext()
  return (
    <main className="workspace-page">
      <header className="workspace-page-header">
        <p>워크스페이스</p>
        <h1>팀 메모</h1>
        <span>함께 남길 내용과 빠른 낙서를 한곳에 모으세요.</span>
      </header>
      <NotesWorkspace />
    </main>
  )
}
