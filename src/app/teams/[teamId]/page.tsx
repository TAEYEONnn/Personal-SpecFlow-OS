import { notFound } from "next/navigation";
import { TeamSettings } from "@/components/teams/team-settings";
import { getTeam, listPendingInvitations } from "@/lib/teams/service";
import { requireAuthContext } from "@/lib/auth/context";

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const auth = await requireAuthContext();

  let team;
  try {
    team = await getTeam(teamId);
  } catch {
    notFound();
  }

  const invitations = await listPendingInvitations(teamId).catch(() => []);

  return (
    <main className="workspace-page">
      <section className="projects-main">
        <TeamSettings
          teamId={teamId}
          teamName={team.name}
          ownerId={team.ownerId}
          myUserId={auth.userId}
          myRole={team.members.find((m: { userId: string; role: string }) => m.userId === auth.userId)?.role ?? "member"}
          initialMembers={team.members}
          initialInvitations={invitations}
        />
      </section>
    </main>
  );
}
