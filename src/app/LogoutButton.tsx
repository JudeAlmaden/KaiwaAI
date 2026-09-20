"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { clearAllChatCache } from "@/lib/chat-cache";

export default function LogoutButton({
  variant = "text",
}: {
  variant?: "text" | "button" | "icon";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    // Clear any client-side cache tied to the previous user.
    clearAllChatCache();
    router.push("/login");
    router.refresh();
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        aria-label="Log out"
        title="Log out"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted/50 transition-all hover:bg-sakura/10 hover:text-sakura disabled:opacity-40"
      >
        <SignOut size={16} weight="bold" aria-hidden />
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border px-3 py-2.5 text-sm font-bold text-muted transition-colors hover:border-sakura/50 hover:bg-sakura/5 hover:text-sakura disabled:opacity-60"
      >
        <SignOut size={18} weight="bold" aria-hidden />
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
