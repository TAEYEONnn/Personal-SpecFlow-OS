import { NextResponse } from "next/server";

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION";

const statusMap: Record<AppErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
};

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function apiError(error: unknown): NextResponse<{ error: string }> {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: statusMap[error.code] },
    );
  }
  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  // Legacy string-code compatibility for service layer errors not yet migrated
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
