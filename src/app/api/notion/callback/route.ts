import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${url.origin}/projects?notion_error=denied`);
  }

  let returnTo = "/projects";
  try {
    const decoded = JSON.parse(Buffer.from(state ?? "", "base64url").toString());
    if (typeof decoded.returnTo === "string") returnTo = decoded.returnTo;
  } catch {
    // ignore malformed state
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${url.origin}/projects?notion_error=misconfigured`);
  }

  const redirectUri = `${url.origin}/api/notion/callback`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(`${url.origin}/projects?notion_error=token_failed`);
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };
  const redirectUrl = new URL(returnTo, url.origin);
  redirectUrl.searchParams.set("notion_connected", "1");

  const response = NextResponse.redirect(redirectUrl.toString());
  // Store token in a secure HTTP-only cookie (30 days)
  response.cookies.set("notion_token", tokenData.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
