const skeletonStyle = {
  background: "var(--surface-raised, #f1f3f5)",
  borderRadius: 8,
} as const;

export default function ProjectsLoading() {
  return (
    <main
      className="projects-page"
      role="status"
      aria-label="프로젝트 목록 불러오는 중"
      aria-busy="true"
    >
      <header className="projects-header">
        <div style={{ ...skeletonStyle, width: 132, height: 24 }} />
        <div style={{ ...skeletonStyle, width: 72, height: 36 }} />
      </header>
      <section className="projects-main">
        <div className="projects-title-row">
          <div>
            <div style={{ ...skeletonStyle, width: 120, height: 34 }} />
            <div
              style={{ ...skeletonStyle, width: 240, height: 18, marginTop: 12 }}
            />
          </div>
          <div style={{ ...skeletonStyle, width: 132, height: 42 }} />
        </div>
        <div className="project-list" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="project-row"
              data-testid="project-row-skeleton"
              key={index}
            >
              <div>
                <div style={{ ...skeletonStyle, width: 180, height: 20 }} />
                <div
                  style={{ ...skeletonStyle, width: 96, height: 14, marginTop: 8 }}
                />
              </div>
              <div style={{ ...skeletonStyle, width: 148, height: 16 }} />
              <div style={{ ...skeletonStyle, width: 18, height: 18 }} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
