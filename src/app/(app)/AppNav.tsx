"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fire } from "@phosphor-icons/react/dist/ssr";
import Kai from "../Kai";
import LogoutButton from "../LogoutButton";
import { NAV_ITEMS } from "./nav";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** A single conversation view (e.g. /chat/c/<id>) — takes over the mobile
 *  screen with its own header, so the global mobile chrome is hidden. */
function isConversationRoute(pathname: string) {
  return pathname.startsWith("/chat/c/");
}

/** Desktop sidebar (lg+). Hidden on mobile. */
export function Sidebar({ email, streak }: { email: string; streak: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r-2 border-border bg-card/50 px-3 py-5 lg:flex">
      <Link
        href="/home"
        className="mb-6 flex items-center gap-2 px-2 font-display text-xl font-extrabold tracking-tight"
      >
        <Kai size={32} />
        KaiwaAI
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 font-display text-sm font-bold transition-colors ${
                active
                  ? "bg-indigo-ai text-white shadow-sm"
                  : "text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
              }`}
            >
              <Icon
                size={22}
                weight={active ? "fill" : "duotone"}
                className={active ? "text-white" : "text-indigo-ai/70"}
              />
              <span>{item.label}</span>
              <span
                className={`ml-auto font-jp text-xs ${
                  active ? "text-white/70" : "text-muted/50"
                }`}
              >
                {item.jp}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber/10 px-3 py-2.5 text-sm font-bold text-amber">
        <Fire size={20} weight="fill" />
        {streak}-day streak
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t-2 border-border pt-3">
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/15 text-sm font-bold uppercase text-indigo-ai">
            {email.charAt(0)}
          </span>
          <p className="min-w-0 flex-1 truncate text-xs text-muted" title={email}>
            {email}
          </p>
        </div>
        <LogoutButton variant="button" />
      </div>
    </aside>
  );
}

/** Mobile bottom tab bar. Hidden on lg+ and inside a conversation (full-screen). */
export function BottomTabs() {
  const pathname = usePathname();
  // A conversation takes over the screen on mobile — it has its own header/nav.
  if (isConversationRoute(pathname)) return null;

  return (
    <nav className="sticky bottom-0 z-20 flex border-t-2 border-border bg-card/95 backdrop-blur lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition-colors ${
              active ? "text-indigo-ai" : "text-muted"
            }`}
          >
            <Icon size={22} weight={active ? "fill" : "duotone"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile top bar with logo + streak. Hidden on lg+ and inside a conversation. */
export function MobileTopBar({ streak }: { streak: number }) {
  const pathname = usePathname();
  // Conversations render their own header; don't stack a second bar above it.
  if (isConversationRoute(pathname)) return null;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
      <Link
        href="/home"
        className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight"
      >
        <Kai size={26} />
        KaiwaAI
      </Link>
      <span className="flex items-center gap-1 rounded-full bg-amber/10 px-3 py-1 text-sm font-bold text-amber">
        <Fire size={16} weight="fill" />
        {streak}
      </span>
    </header>
  );
}
