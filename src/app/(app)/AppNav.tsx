"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Fire,
  House,
  ChatCircle,
  ArrowsClockwise,
  BookBookmark,
  BookOpen,
  ShieldCheck,
  GearSix,
  Sparkle,
} from "@phosphor-icons/react";
import Kai from "../Kai";
import LogoutButton from "../LogoutButton";
import { useUnreadKaiMessages } from "@/hooks/useUnreadKaiMessages";

function isNavActive(pathname: string, currentTab: string | null, href: string) {
  // Settings exact match - don't highlight when on /settings/app-blocker
  if (href === "/settings") {
    return pathname === "/settings";
  }
  // Focus Guard subroute
  if (href === "/settings/app-blocker") {
    return pathname.startsWith("/settings/app-blocker");
  }
  // Kanji tab or dedicated kanji route
  if (href.startsWith("/study?tab=kanji") || href === "/kanji") {
    if (pathname.startsWith("/kanji")) return true;
    if (pathname === "/study") return currentTab === "kanji";
    return false;
  }
  // Vocab tab or dedicated vocab route
  if (href.startsWith("/study?tab=vocab") || href === "/vocab") {
    if (pathname.startsWith("/vocab")) return true;
    if (pathname === "/study") return currentTab === "vocab" || !currentTab;
    return false;
  }
  if (href === "/chat") {
    return pathname.startsWith("/chat");
  }
  return pathname === href || pathname.startsWith(href + "/");
}

function isConversationRoute(pathname: string) {
  return pathname.startsWith("/chat/c/");
}

type NavLinkItem = {
  href: string;
  label: string;
  jp: string;
  icon: typeof House;
  badge?: "unread" | "due";
};

const STUDY_NAV: NavLinkItem[] = [
  { href: "/home", label: "Home", jp: "ホーム", icon: House },
  { href: "/chat", label: "Chat", jp: "会話", icon: ChatCircle, badge: "unread" },
  { href: "/review", label: "Review", jp: "復習", icon: ArrowsClockwise, badge: "due" },
  { href: "/study?tab=kanji", label: "Kanji", jp: "漢字", icon: BookBookmark },
  { href: "/study?tab=vocab", label: "Vocab", jp: "語彙", icon: BookOpen },
];

const SYSTEM_NAV: NavLinkItem[] = [
  { href: "/settings/app-blocker", label: "Focus Guard", jp: "習慣", icon: ShieldCheck },
  { href: "/settings", label: "Settings", jp: "設定", icon: GearSix },
];

function SidebarNav({
  pathname,
  dueCount,
  hasUnreadKai,
}: {
  pathname: string;
  dueCount: number | null;
  hasUnreadKai: boolean;
}) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  return (
    <>
      {/* Study Navigation Group */}
      <div className="space-y-1">
        <p className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
          Study &amp; Practice
        </p>
        <nav className="flex flex-col gap-1">
          {STUDY_NAV.map((item) => {
            const active = isNavActive(pathname, currentTab, item.href);
            const Icon = item.icon;
            const isChat = item.badge === "unread" && hasUnreadKai && !active;
            const isDue = item.badge === "due" && dueCount !== null && dueCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-xs font-bold transition-all ${active
                  ? "bg-indigo-ai text-white shadow-sm"
                  : "text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
                  }`}
              >
                <Icon
                  size={20}
                  weight={active ? "fill" : "duotone"}
                  className={active ? "text-white" : "text-indigo-ai/70"}
                />
                <span>{item.label}</span>

                {/* Unread indicator */}
                {isChat && (
                  <span
                    className="absolute right-9 h-2 w-2 rounded-full bg-sakura animate-pulse"
                    aria-label="Unread messages from Kai"
                  />
                )}

                {/* Due count pill */}
                {isDue && (
                  <span className="ml-auto rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-extrabold text-amber">
                    {dueCount}
                  </span>
                )}

                <span
                  className={`font-jp text-[11px] ${isDue ? "hidden" : "ml-auto"
                    } ${active ? "text-white/70" : "text-muted/40"}`}
                >
                  {item.jp}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Navigation Group */}
      <div className="space-y-1 pt-1 border-t border-border/60">
        <p className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
          System &amp; Focus
        </p>
        <nav className="flex flex-col gap-1">
          {SYSTEM_NAV.map((item) => {
            const active = isNavActive(pathname, currentTab, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-xs font-bold transition-all ${active
                  ? "bg-indigo-ai text-white shadow-sm"
                  : "text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
                  }`}
              >
                <Icon
                  size={20}
                  weight={active ? "fill" : "duotone"}
                  className={active ? "text-white" : "text-indigo-ai/70"}
                />
                <span>{item.label}</span>
                <span
                  className={`ml-auto font-jp text-[11px] ${active ? "text-white/70" : "text-muted/40"
                    }`}
                >
                  {item.jp}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

/** Desktop modern sidebar (lg+). */
export function Sidebar({ email, streak }: { email: string; streak: number }) {
  const pathname = usePathname();
  const hasUnreadKai = useUnreadKaiMessages();
  const [dueCount, setDueCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.dueNow === "number") setDueCount(data.dueNow);
      })
      .catch(() => { });
  }, [pathname]);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r-2 border-border bg-card/60 px-3.5 py-5 backdrop-blur-xl lg:flex justify-between">
      {/* Top section: Brand + Quick Action + Links */}
      <div className="space-y-5">
        {/* Brand & Companion Status */}
        <div className="px-2">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-foreground hover:opacity-90 transition-opacity"
          >
            <Kai size={32} />
            <span>KaiwaAI</span>
          </Link>

        </div>

        {/* Primary Action CTA: Talk to Kai */}
        <div className="px-1">
          <Link
            href="/chat"
            className="group flex items-center justify-center gap-2 rounded-2xl bg-indigo-ai p-2.5 font-display text-xs font-bold text-white shadow-md shadow-indigo-ai/25 transition-all hover:bg-indigo-ai/90 active:scale-[0.98]"
          >
            <Sparkle size={15} weight="fill" className="text-sakura group-hover:rotate-12 transition-transform" />
            <span>Talk to Kai</span>
          </Link>
        </div>

        {/* Dynamic Navigation Group */}
        <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-muted/10" />}>
          <SidebarNav
            pathname={pathname}
            dueCount={dueCount}
            hasUnreadKai={hasUnreadKai}
          />
        </Suspense>
      </div>

      {/* Bottom section: Learner Profile & Streak Card */}
      <div className="space-y-2 pt-3 border-t-2 border-border">
        {/* User + Streak + Logout card */}
        <div className="rounded-2xl border border-border bg-bg/60 p-3 backdrop-blur-sm">
          {/* Row 1 — Avatar + Name + Streak + Logout */}
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-ai/30 to-indigo-ai/10 font-display text-sm font-extrabold uppercase text-indigo-ai ring-1 ring-indigo-ai/20">
              {email.charAt(0)}
            </span>

            {/* Name */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight text-foreground" title={email}>
                {email.split("@")[0]}
              </p>
              <p className="truncate text-[10px] font-medium text-muted/60" title={email}>
                {email}
              </p>
            </div>

            {/* Streak badge */}
            <span className="flex items-center gap-1 rounded-lg bg-amber/10 px-2 py-1 text-xs font-extrabold text-amber ring-1 ring-amber/20">
              <Fire size={13} weight="fill" />
              {streak}
            </span>

            {/* Logout icon button */}
            <LogoutButton variant="icon" />
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Mobile modern floating island bottom navigation. */
export function BottomTabs() {
  const pathname = usePathname();
  const hasUnreadKai = useUnreadKaiMessages();

  if (isConversationRoute(pathname)) return null;

  return (
    <div className="fixed bottom-3 inset-x-4 z-40 max-w-sm mx-auto pointer-events-none lg:hidden">
      <nav className="pointer-events-auto flex items-center justify-around rounded-full border-2 border-border/80 bg-card/95 px-3 py-2 shadow-2xl backdrop-blur-xl">
        {/* Home */}
        <Link
          href="/home"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${pathname === "/home" ? "text-indigo-ai scale-105" : "text-muted hover:text-foreground"
            }`}
        >
          <House size={22} weight={pathname === "/home" ? "fill" : "duotone"} />
          <span>Home</span>
        </Link>

        {/* Review */}
        <Link
          href="/review"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${pathname.startsWith("/review") ? "text-indigo-ai scale-105" : "text-muted hover:text-foreground"
            }`}
        >
          <ArrowsClockwise size={22} weight={pathname.startsWith("/review") ? "fill" : "duotone"} />
          <span>Review</span>
        </Link>

        {/* Elevated Center Chat Action */}
        <Link
          href="/chat"
          className="relative -top-4 flex h-13 w-13 items-center justify-center rounded-full bg-indigo-ai text-white shadow-xl shadow-indigo-ai/40 ring-4 ring-bg transition-transform active:scale-95"
          aria-label="Talk to Kai"
        >
          <ChatCircle size={26} weight="fill" />
          {hasUnreadKai && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-sakura ring-2 ring-indigo-ai animate-ping" />
          )}
        </Link>

        {/* Kanji & Vocab Study */}
        <Link
          href="/study"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${pathname.startsWith("/study") || pathname.startsWith("/kanji") || pathname.startsWith("/vocab")
            ? "text-indigo-ai scale-105"
            : "text-muted hover:text-foreground"
            }`}
        >
          <BookBookmark size={22} weight={pathname.startsWith("/study") || pathname.startsWith("/kanji") || pathname.startsWith("/vocab") ? "fill" : "duotone"} />
          <span>Study</span>
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${pathname.startsWith("/settings") ? "text-indigo-ai scale-105" : "text-muted hover:text-foreground"
            }`}
        >
          <GearSix size={22} weight={pathname.startsWith("/settings") ? "fill" : "duotone"} />
          <span>You</span>
        </Link>
      </nav>
    </div>
  );
}

/** Mobile top bar with logo + streak. Hidden on lg+, inside a conversation,
 *  and on the chat hub (PageHeader already titles that screen). */
export function MobileTopBar({ streak }: { streak: number }) {
  const pathname = usePathname();
  if (isConversationRoute(pathname)) return null;
  if (pathname === "/chat") return null;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-border bg-card/90 px-4 py-3 backdrop-blur-xl lg:hidden">
      <Link
        href="/"
        className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-foreground"
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
