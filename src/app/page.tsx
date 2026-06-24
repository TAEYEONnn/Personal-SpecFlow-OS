import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";

export default async function HomePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/signup");
  redirect("/projects");
}
