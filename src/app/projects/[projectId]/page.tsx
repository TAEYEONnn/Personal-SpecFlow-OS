import { notFound } from "next/navigation";
import { ProjectOnboarding } from "@/components/workspace/project-onboarding";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getAuthContext } from "@/lib/auth/context";
import { getProject } from "@/lib/projects/service";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const auth = await getAuthContext();
  if (!auth) notFound();
  const project = await getProject(projectId, auth);
  if (!project) notFound();

  if (!project.document) {
    return <ProjectOnboarding project={project} username={auth.displayName} />;
  }

  return <WorkspaceShell project={{ ...project, document: project.document }} username={auth.displayName} />;
}
