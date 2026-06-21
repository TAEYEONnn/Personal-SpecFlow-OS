"use client";

import { SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <button
      className={compact ? "nav-item" : "button button-ghost"}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      <SignOut size={18} />
      {!compact ? "로그아웃" : <span className="nav-label">로그아웃</span>}
    </button>
  );
}
