import { WorkspaceHome } from '@/components/home/workspace-home'
import { requireAuthContext } from '@/lib/auth/context'
import { listProjects } from '@/lib/projects/service'

export default async function HomePage() {
  const auth = await requireAuthContext()
  const projects = await listProjects()
  return <WorkspaceHome username={auth.username} projects={projects} />
}
