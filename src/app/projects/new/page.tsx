import { NewProjectForm } from "@/components/projects/new-project-form";
import { listMyTeams } from "@/lib/teams/service";

export default async function NewProjectPage() {
  const teams = await listMyTeams().catch(() => []);
  return (
    <main className="workspace-page">
      <section className="new-project-shell">
        <h1>새 프로젝트 정리</h1>
        <p>회의록이나 메모를 그대로 넣어도 괜찮아요. 근거와 추론을 나눠서 정리해요.</p>
        <NewProjectForm teams={teams.map((t) => ({ id: t.id, name: t.name }))} />
      </section>
    </main>
  );
}
