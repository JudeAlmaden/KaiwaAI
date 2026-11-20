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
import { useAppBlockerSupported } from "@/lib/app-blocker-platform";

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
  // Full-screen conversations: the tab bar would sit on top of the composer.
  return (
    pathname.startsWith("/chat/c/") ||
    pathname.startsWith("/chat/strangers/")
  );
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

/** Hover label for the icon-only rail; only rendered while collapsed. */
function NavTip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-[11px] font-bold text-card shadow-lg group-hover:block">
      {label}
    </span>
  );
}

function SidebarNav({
  pathname,
  dueCount,
  hasUnreadKai,
  collapsed,
}: {
  pathname: string;
  dueCount: number | null;
  hasUnreadKai: boolean;
  collapsed: boolean;
}) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  // Focus Guard is Android-only; keep it out of the desktop sidebar.
  const appBlockerEnabled = useAppBlockerSupported();
  const systemNav = appBlockerEnabled
    ? SYSTEM_NAV
    : SYSTEM_NAV.filter((item) => item.href !== "/settings/app-blocker");

  return (
    <>
      {/* Study Navigation Group */}
      <div className="space-y-1">
        {!collapsed && (
          <p className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
            Study &amp; Practice
          </p>
        )}
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
                aria-label={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-2xl py-2 text-xs font-bold transition-all ${active
                  ? "bg-indigo-ai text-white shadow-sm"
                  : "text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
                  } ${collapsed ? "justify-center" : "px-3"}`}
              >
                <Icon
                  size={20}
                  weight={active ? "fill" : "duotone"}
                  className={active ? "text-white" : "text-indigo-ai/70"}
                />
                {!collapsed && <span>{item.label}</span>}
                {collapsed && <NavTip label={item.label} />}

                {/* Unread indicator */}
                {isChat && (
                  <span
                    className={`absolute h-2 w-2 rounded-full bg-sakura animate-pulse ${collapsed ? "right-1.5 top-1.5" : "right-9"
                      }`}
                    aria-label="Unread messages from Kai"
                  />
                )}

                {/* Due count pill */}
                {isDue &&
                  (collapsed ? (
                    <span className="absolute right-0 top-0 rounded-full bg-amber px-1 text-[9px] font-extrabold text-white ring-2 ring-card">
                      {dueCount}
                    </span>
                  ) : (
                    <span className="ml-auto rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-extrabold text-amber">
                      {dueCount}
                    </span>
                  ))}

                {!collapsed && (
                  <span
                    className={`font-jp text-[11px] ${isDue ? "hidden" : "ml-auto"
                      } ${active ? "text-white/70" : "text-muted/40"}`}
                  >
                    {item.jp}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Navigation Group */}
      <div className="space-y-1 pt-1 border-t border-border/60">
        {!collapsed && (
          <p className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
            System &amp; Focus
          </p>
        )}
        <nav className="flex flex-col gap-1">
          {systemNav.map((item) => {
            const active = isNavActive(pathname, currentTab, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-2xl py-2 text-xs font-bold transition-all ${active
                  ? "bg-indigo-ai text-white shadow-sm"
                  : "text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
                  } ${collapsed ? "justify-center" : "px-3"}`}
              >
                <Icon
                  size={20}
                  weight={active ? "fill" : "duotone"}
                  className={active ? "text-white" : "text-indigo-ai/70"}
                />
                {!collapsed && <span>{item.label}</span>}
                {collapsed && <NavTip label={item.label} />}
                {!collapsed && (
                  <span
                    className={`ml-auto font-jp text-[11px] ${active ? "text-white/70" : "text-muted/40"
                      }`}
                  >
                    {item.jp}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

/** Desktop modern sidebar (lg+). */
export function Sidebar({
  email,
  streak,
}: {
  email: string;
  streak: number;
}) {
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

  // Inside /chat the rail already holds the inbox, so the sidebar folds to an
  // icon strip on lg and gives that width back to the list and the messages.
  const collapsed = pathname === "/chat" || pathname.startsWith("/chat/");

  return (
    <aside
      className={`relative z-30 hidden shrink-0 flex-col justify-between border-r-2 border-border bg-card/60 py-5 backdrop-blur-xl lg:flex ${
        collapsed ? "w-[72px] px-2" : "w-64 px-3.5"
      }`}
    >
      {/* Top section: Brand + Quick Action + Links */}
      <div className="space-y-5">
        {/* Brand & Companion Status */}
        <div className={collapsed ? "flex justify-center" : "px-2"}>
          <Link
            href="/"
            aria-label="KaiwaAI home"
            className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-foreground hover:opacity-90 transition-opacity"
          >
            <Kai size={32} />
            {!collapsed && <span>KaiwaAI</span>}
          </Link>
        </div>

        {/* Primary Action CTA: Talk to Kai */}
        <div className={collapsed ? "flex justify-center" : "px-1"}>
          <Link
            href="/chat"
            aria-label="Talk to Kai"
            title={collapsed ? "Talk to Kai" : undefined}
            className={`group flex items-center justify-center gap-2 rounded-2xl bg-indigo-ai font-display text-xs font-bold text-white shadow-md shadow-indigo-ai/25 transition-all hover:bg-indigo-ai/90 active:scale-[0.98] ${collapsed ? "h-10 w-10" : "p-2.5"
              }`}
          >
            <Sparkle size={15} weight="fill" className="text-sakura group-hover:rotate-12 transition-transform" />
            {!collapsed && <span>Talk to Kai</span>}
          </Link>
        </div>

        {/* Dynamic Navigation Group */}
        <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-muted/10" />}>
          <SidebarNav
            pathname={pathname}
            dueCount={dueCount}
            hasUnreadKai={hasUnreadKai}
            collapsed={collapsed}
          />
        </Suspense>
      </div>

      {/* Bottom section: Learner Profile & Streak Card */}
      <div className="space-y-2 pt-3 border-t-2 border-border">
        {/* User + Streak + Logout card */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-bg/60 p-2 backdrop-blur-sm">
            <span
              title={email}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-ai/30 to-indigo-ai/10 font-display text-xs font-extrabold uppercase text-indigo-ai ring-1 ring-indigo-ai/20"
            >
              {email.charAt(0)}
            </span>
            <span
              title={`${streak} day streak`}
              className="flex items-center gap-0.5 rounded-lg bg-amber/10 px-1.5 py-0.5 text-[10px] font-extrabold text-amber ring-1 ring-amber/20"
            >
              <Fire size={11} weight="fill" />
              {streak}
            </span>
            <LogoutButton variant="icon" />
          </div>
        ) : (
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
        )}
      </div>
    </aside>
  );
}

/** Mobile modern floating island bottom navigation. */
export function BottomTabs({ initialDueNow = 0 }: { initialDueNow?: number }) {
  const pathname = usePathname();
  const hasUnreadKai = useUnreadKaiMessages();
  const [dueCount, setDueCount] = useState(initialDueNow);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.dueNow === "number") setDueCount(data.dueNow);
      })
      .catch(() => {});
  }, [pathname]);

  if (isConversationRoute(pathname)) return null;

  const reviewsDue = dueCount > 0;

  return (
    <div
      data-bottom-tabs="true"
      className="fixed bottom-3 inset-x-4 z-40 max-w-sm mx-auto pointer-events-none lg:hidden"
    >
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
          className={`relative flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${pathname.startsWith("/review") ? "text-indigo-ai scale-105" : "text-muted hover:text-foreground"
            }`}
        >
          <ArrowsClockwise size={22} weight={pathname.startsWith("/review") ? "fill" : "duotone"} />
          <span>Review</span>
          {reviewsDue && !pathname.startsWith("/review") && (
            <span className="absolute -top-0.5 right-0 min-w-[18px] rounded-full bg-amber px-1 py-px text-[9px] font-extrabold text-white ring-2 ring-card">
              {dueCount > 99 ? "99+" : dueCount}
            </span>
          )}
        </Link>

        {/* Elevated center action — always Talk to Kai (brand purple) */}
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
