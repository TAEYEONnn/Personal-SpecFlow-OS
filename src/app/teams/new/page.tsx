import { CreateTeamForm } from "@/components/teams/create-team-form";
import { requireAuthContext } from "@/lib/auth/context";

export default async function NewTeamPage() {
  await requireAuthContext();
  return (
    <main className="workspace-page">
      <section className="new-project-shell">
        <h1>새 팀 만들기</h1>
        <p>팀을 만들고 팀원을 초대해서 프로젝트를 함께 관리해요.</p>
        <CreateTeamForm />
      </section>
    </main>
  );
}
