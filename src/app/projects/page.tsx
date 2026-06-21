import { ProjectList } from "@/components/projects/project-list";
import { LogoutButton } from "@/components/auth/logout-button";
import { listProjects } from "@/lib/projects/service";

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span>SpecFlow OS</span>
        </div>
        <LogoutButton />
      </header>
      <section className="projects-main">
        <ProjectList projects={projects} />
      </section>
    </main>
  );
}
