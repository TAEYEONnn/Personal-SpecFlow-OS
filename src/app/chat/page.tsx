import { ChatRoom } from '@/components/chat/chat-room'
import { requireAuthContext } from '@/lib/auth/context'

export default async function ChatPage() {
  await requireAuthContext()
  return (
    <main className="workspace-page workspace-page--chat">
      <header className="workspace-page-header">
        <p>워크스페이스</p>
        <h1>대화</h1>
        <span>복잡한 채널 없이 팀 공용 대화방 하나만 가볍게 사용해요.</span>
      </header>
      <ChatRoom />
    </main>
  )
}
