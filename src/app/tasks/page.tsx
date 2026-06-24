import { TaskBoard } from '@/components/tasks/task-board'
import { requireAuthContext } from '@/lib/auth/context'

export default async function TasksPage() {
  await requireAuthContext()
  return (
    <main className="workspace-page">
      <header className="workspace-page-header">
        <p>워크스페이스</p>
        <h1>팀 할 일</h1>
        <span>함께 처리할 일을 가볍게 정리하세요.</span>
      </header>
      <TaskBoard />
    </main>
  )
}
