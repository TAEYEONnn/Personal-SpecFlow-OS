import { notFound } from "next/navigation";
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
  if (!project?.document) notFound();

  return <WorkspaceShell project={{ ...project, document: project.document }} username={auth.username} />;
}
