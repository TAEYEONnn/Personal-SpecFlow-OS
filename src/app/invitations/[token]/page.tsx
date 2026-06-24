import { InvitationAction } from "@/components/teams/invitation-action";
import { getInvitation } from "@/lib/teams/service";
import { getAuthContext } from "@/lib/auth/context";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const auth = await getAuthContext();

  let invitation;
  try {
    invitation = await getInvitation(token);
  } catch {
    return (
      <main className="login-page">
        <section className="login-form-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="login-card">
            <h2>초대를 찾을 수 없어요</h2>
            <p>링크가 만료됐거나 잘못된 주소예요.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-form-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="login-card">
          <InvitationAction invitation={invitation} isLoggedIn={Boolean(auth)} token={token} />
        </div>
      </section>
    </main>
  );
}
