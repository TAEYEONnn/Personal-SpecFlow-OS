"use client";

import { SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

export function LogoutButton({
  compact = false,
  className,
  redirectTo = "/signup",
}: {
  compact?: boolean;
  className?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  return (
    <button
      className={className ?? (compact ? "nav-item" : "button button-ghost")}
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push(redirectTo);
        router.refresh();
      }}
    >
      <SignOut size={18} />
      {!compact ? "로그아웃" : <span className="nav-label">로그아웃</span>}
    </button>
  );
}
