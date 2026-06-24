import { TaskBoard } from '@/components/tasks/task-board'
import { requireAuthContext } from '@/lib/auth/context'

export default async function MyTasksPage() {
  await requireAuthContext()
  return (
    <main className="workspace-page">
      <header className="workspace-page-header">
        <p>내 공간</p>
        <h1>내 할 일</h1>
        <span>나만 볼 수 있는 개인 업무를 관리하세요.</span>
      </header>
      <TaskBoard personal />
    </main>
  )
}
