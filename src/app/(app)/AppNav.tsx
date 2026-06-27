"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Kai from "../Kai";
import { NAV_ITEMS } from "./nav";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Desktop sidebar (lg+). Hidden on mobile. */
export function Sidebar({ email, streak }: { email: string; streak: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r-2 border-border bg-card/50 px-4 py-6 lg:flex">
      <Link
        href="/chat"
        className="mb-8 flex items-center gap-2 px-2 font-display text-xl font-extrabold tracking-tight"
      >
        <Kai size={32} />
        KaiwaAI
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 font-display text-sm font-bold transition-colors ${
                active
                  ? "bg-indigo-ai text-white"
                  : "text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
              <span
                className={`ml-auto font-jp text-xs ${
                  active ? "text-white/70" : "text-muted/60"
                }`}
              >
                {item.jp}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber/10 px-3 py-2.5 text-sm font-bold text-amber">
        🔥 {streak}-day streak
      </div>
      <p className="mt-3 truncate px-2 text-xs text-muted">{email}</p>
    </aside>
  );
}

/** Mobile bottom tab bar. Hidden on lg+. */
export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 flex border-t-2 border-border bg-card/95 backdrop-blur lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition-colors ${
              active ? "text-indigo-ai" : "text-muted"
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile top bar with logo + streak. Hidden on lg+. */
export function MobileTopBar({ streak }: { streak: number }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
      <Link
        href="/chat"
        className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight"
      >
        <Kai size={26} />
        KaiwaAI
      </Link>
      <span className="flex items-center gap-1 rounded-full bg-amber/10 px-3 py-1 text-sm font-bold text-amber">
        🔥 {streak}
      </span>
    </header>
  );
}
