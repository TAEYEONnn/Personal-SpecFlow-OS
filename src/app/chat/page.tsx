import { cookies } from "next/headers";
import { ChatRoom } from "@/components/chat/chat-room";
import { requireAuthContext } from "@/lib/auth/context";
import { listMessages, listAnnouncements } from "@/lib/chat/service";
import { ACTIVE_TEAM_COOKIE_KEY } from "@/lib/workspace/active-team";
import type { ChatMessageView, ChatAnnouncement } from "@/lib/chat/service";

export default async function ChatPage() {
  const auth = await requireAuthContext();
  const cookieStore = await cookies();
  const teamId = cookieStore.get(ACTIVE_TEAM_COOKIE_KEY)?.value ?? null;

  let initialMessages: ChatMessageView[] = [];
  let initialAnnouncements: ChatAnnouncement[] = [];

  if (teamId) {
    // Preload messages server-side — client renders immediately without a fetch
    const [msgs, anns] = await Promise.all([
      listMessages(teamId, { limit: 50 }).catch(() => []),
      listAnnouncements(teamId).catch(() => []),
    ]);
    // listMessages returns newest-first; display order is oldest-first
    initialMessages = msgs.slice().reverse();
    initialAnnouncements = anns;
  }

  return (
    <main className="workspace-page workspace-page--chat">
      <header className="workspace-page-header">
        <p>워크스페이스</p>
        <h1>대화</h1>
        <span>복잡한 채널 없이 팀 공용 대화방 하나만 가볍게 사용해요.</span>
      </header>
      <ChatRoom
        myUserId={auth.userId}
        initialMessages={initialMessages}
        initialAnnouncements={initialAnnouncements}
        initialTeamId={teamId}
      />
    </main>
  );
}
