import { ProjectList } from "@/components/projects/project-list";
import { listProjects } from "@/lib/projects/service";
import { listMyTeams } from "@/lib/teams/service";

export default async function ProjectsPage() {
  const [projects, teams] = await Promise.all([
    listProjects(),
    listMyTeams().catch(() => []),
  ]);
  return (
    <main className="workspace-page">
      <section className="projects-main">
        <ProjectList
          projects={projects}
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        />
      </section>
    </main>
  );
}
