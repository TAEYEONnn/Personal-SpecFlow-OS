export default function Loading() {
  return (
    <main className="workspace-page">
      <header className="workspace-page-header">
        <h1>할 일</h1>
      </header>
      <div className="skeleton-list">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-row" />
        ))}
      </div>
    </main>
  )
}
