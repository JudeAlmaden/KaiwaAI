"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { hasAnyKey } from "@/lib/api-keys";

/**
 * Banner that shows when user has no API keys.
 * Can be placed at the top of pages that require API keys.
 */
export default function NoApiKeyBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(!hasAnyKey()), 0);
  }, []);

  if (!show) return null;

  return (
    <div className="border-b-2 border-amber/20 bg-amber/10 px-5 py-3 sm:px-8">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <span className="text-2xl">🔑</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">
            API Key Required
          </p>
          <p className="text-xs text-muted">
            Add your Gemini API key to use AI features
          </p>
        </div>
        <Link
          href="/onboarding"
          className="rounded-full bg-indigo-ai px-4 py-2 text-xs font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
