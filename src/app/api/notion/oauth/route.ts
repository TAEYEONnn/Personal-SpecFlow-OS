import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Notion OAuth가 설정되지 않았습니다. NOTION_CLIENT_ID 환경변수를 추가해 주세요." },
      { status: 501 },
    );
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/projects";

  const redirectUri = `${url.origin}/api/notion/callback`;
  const state = Buffer.from(JSON.stringify({ returnTo })).toString("base64url");

  const notionAuthUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  notionAuthUrl.searchParams.set("client_id", clientId);
  notionAuthUrl.searchParams.set("response_type", "code");
  notionAuthUrl.searchParams.set("owner", "user");
  notionAuthUrl.searchParams.set("redirect_uri", redirectUri);
  notionAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(notionAuthUrl.toString());
}
