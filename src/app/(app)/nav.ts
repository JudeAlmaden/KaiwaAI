// Shared navigation config for the authenticated app shell.
import type { Icon } from "@phosphor-icons/react";
import {
  House,
  ChatCircle,
  ArrowsClockwise,
  Books,
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
  { href: "/study", label: "Study", jp: "学習", icon: Books },
  { href: "/settings", label: "You", jp: "設定", icon: GearSix },
];
