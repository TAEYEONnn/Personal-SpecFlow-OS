import type { Metadata } from "next";
import "./globals.css";
import { GlobalWorkspaceShell } from "@/components/workspace-global/workspace-shell";
import { getAuthContext } from "@/lib/auth/context";
import { listMyTeams } from "@/lib/teams/service";
import type { TeamSummary } from "@/lib/workspace/active-team";

export const metadata: Metadata = {
  title: "SpecFlow OS — 회의록이 화면 설계서가 됩니다",
  description:
    "흩어진 회의록, 업무 요청, 기획 메모를 붙여넣으면 화면 흐름, 요구사항, 할 일 목록까지 한번에 정리됩니다. AI 기반 DesignOps 도구.",
  openGraph: {
    title: "SpecFlow OS — 회의록이 화면 설계서가 됩니다",
    description:
      "흩어진 업무 메모를 붙여넣으면 화면 흐름, 요구사항, 할 일 목록까지 한번에 정리됩니다.",
    siteName: "SpecFlow OS",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpecFlow OS — 회의록이 화면 설계서가 됩니다",
    description:
      "흩어진 업무 메모를 붙여넣으면 화면 흐름, 요구사항, 할 일 목록까지 한번에 정리됩니다.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch teams server-side so ActiveTeamProvider can skip the client-side
  // /api/teams fetch entirely — sidebar renders without a loading flash.
  let initialTeams: TeamSummary[] = [];
  try {
    const auth = await getAuthContext();
    if (auth) {
      const teams = await listMyTeams();
      initialTeams = teams.map((t) => ({ id: t.id, name: t.name }));
    }
  } catch {
    // Public pages (login, signup) or unauthenticated — no teams needed
  }

  return (
    <html lang="ko">
      <body>
        <GlobalWorkspaceShell initialTeams={initialTeams}>
          {children}
        </GlobalWorkspaceShell>
      </body>
    </html>
  );
}
