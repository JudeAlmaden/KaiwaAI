"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton({
  variant = "text",
}: {
  variant?: "text" | "button";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    // Clear any client-side cache tied to the previous user.
    try {
      localStorage.removeItem("kaiwa_chat_cache");
    } catch {}
    router.push("/login");
    router.refresh();
  }

  if (variant === "button") {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border px-3 py-2.5 text-sm font-bold text-muted transition-colors hover:border-sakura/50 hover:bg-sakura/5 hover:text-sakura disabled:opacity-60"
      >
        <span aria-hidden>↩</span>
        {loading ? "Logging out…" : "Log out"}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm font-medium text-muted transition-colors hover:text-indigo-ai disabled:opacity-60"
    >
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
