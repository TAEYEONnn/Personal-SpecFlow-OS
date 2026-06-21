import { NextResponse } from "next/server";

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  if (message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (message.includes("revision_conflict") || message.includes("다른 곳에서")) {
    return NextResponse.json({ error: message }, { status: 409 });
  }
  if (message.includes("찾을 수 없습니다")) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
