// Shared navigation config for the authenticated app shell.
export type NavItem = {
  href: string;
  label: string;
  jp: string;
  icon: string; // emoji placeholder until we add real icons
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/chat", label: "Chat", jp: "会話", icon: "💬" },
  { href: "/review", label: "Review", jp: "復習", icon: "🔁" },
  { href: "/vocab", label: "Vocab", jp: "単語", icon: "📒" },
  { href: "/memory", label: "Memory", jp: "日記", icon: "📔" },
  { href: "/settings", label: "You", jp: "設定", icon: "⚙️" },
];
