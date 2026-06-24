import { NotesWorkspace } from '@/components/notes/notes-workspace'
import { requireAuthContext } from '@/lib/auth/context'

export default async function MyNotesPage() {
  await requireAuthContext()
  return (
    <main className="workspace-page">
      <header className="workspace-page-header">
        <p>내 공간</p>
        <h1>내 메모</h1>
        <span>나만 볼 수 있는 메모와 낙서를 정리하세요.</span>
      </header>
      <NotesWorkspace personal />
    </main>
  )
}
