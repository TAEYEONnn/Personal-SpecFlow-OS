import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { ProfileForm } from "@/components/auth/profile-form";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/profile");

  let displayName = "";
  if (!auth.demo) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("user_id", auth.userId)
      .single();
    displayName =
      (profile?.display_name as string | null) ??
      (profile?.username as string | null) ??
      "";
  }

  return (
    <main className="workspace-page">
      <section className="new-project-shell">
        <h1>프로필 설정</h1>
        <ProfileForm
          initialDisplayName={displayName}
          email={auth.username}
        />
      </section>
    </main>
  );
}
