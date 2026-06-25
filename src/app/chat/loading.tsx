export default function Loading() {
  return (
    <main className="workspace-page workspace-page--chat">
      <header className="workspace-page-header">
        <p>워크스페이스</p>
        <h1>대화</h1>
      </header>
      <div className="chat-room">
        <div className="chat-messages">
          <div className="skeleton-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-msg" />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
