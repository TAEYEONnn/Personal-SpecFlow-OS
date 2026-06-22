const skeletonStyle = {
  background: "var(--surface-raised, #f1f3f5)",
  borderRadius: 8,
} as const;

export default function ProjectLoading() {
  return (
    <main
      className="workspace"
      role="status"
      aria-label="프로젝트 작업공간 불러오는 중"
      aria-busy="true"
    >
      <aside className="workspace-sidebar" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            style={{ ...skeletonStyle, width: 36, height: 36, margin: "12px auto" }}
          />
        ))}
      </aside>
      <header className="workspace-header" aria-hidden="true">
        <div style={{ ...skeletonStyle, width: 220, height: 24 }} />
        <div style={{ ...skeletonStyle, width: 160, height: 36 }} />
      </header>
      <section className="workspace-main">
        <div
          data-testid="workspace-canvas-skeleton"
          aria-hidden="true"
          style={{
            ...skeletonStyle,
            minHeight: "calc(100vh - 96px)",
            margin: 20,
          }}
        />
      </section>
    </main>
  );
}
