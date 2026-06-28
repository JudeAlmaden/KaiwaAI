// Shared navigation config for the authenticated app shell.
import type { Icon } from "@phosphor-icons/react";
import {
  House,
  ChatCircle,
  ArrowsClockwise,
  Notebook,
  BookBookmark,
  GearSix,
} from "@phosphor-icons/react/dist/ssr";

export type NavItem = {
  href: string;
  label: string;
  jp: string;
  icon: Icon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", jp: "ホーム", icon: House },
  { href: "/chat", label: "Chat", jp: "会話", icon: ChatCircle },
  { href: "/review", label: "Review", jp: "復習", icon: ArrowsClockwise },
  { href: "/vocab", label: "Vocab", jp: "単語", icon: BookBookmark },
  { href: "/memory", label: "Memory", jp: "日記", icon: Notebook },
  { href: "/settings", label: "You", jp: "設定", icon: GearSix },
];
