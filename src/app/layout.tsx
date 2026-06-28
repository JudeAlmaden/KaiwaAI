import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import ServiceWorker from "./ServiceWorker";

const baloo = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "KaiwaAI — Your Japanese friend",
  description:
    "Meet Kai, a friendly AI companion who chats with you in Japanese at your level, teaches you new words gently, and helps them stick.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KaiwaAI",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c5cff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Shrink the layout viewport when the soft keyboard opens so the chat
  // composer stays visible above it (Android/Chrome; iOS uses dvh fallback).
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${nunito.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
