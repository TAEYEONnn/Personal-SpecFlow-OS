export default function Loading() {
  return (
    <main className="workspace-page">
      <header className="workspace-page-header">
        <h1>메모</h1>
      </header>
      <div className="notes-layout">
        <div className="skeleton-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
        <div className="skeleton-block" style={{ minHeight: 300 }} />
      </div>
    </main>
  )
}
