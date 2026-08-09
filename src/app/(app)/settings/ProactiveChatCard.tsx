"use client";

import { useState } from "react";
import { Surface } from "../ui";
import { getProactiveChat, setProactiveChat } from "@/lib/proactive-config";

/** In-chat proactivity setting: Kai messaging first / following up while you're online. */
export default function ProactiveChatCard() {
  const [on, setOn] = useState(() => getProactiveChat());

  function toggle() {
    const next = !on;
    setOn(next);
    setProactiveChat(next);
  }

  return (
    <Surface>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold">Chats first while you&apos;re here</p>
          <p className="mt-1 text-sm text-muted">
            Kai may say hi or add a little follow-up on her own while you have
            the chat open.
          </p>
        </div>
        <button
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          onClick={toggle}
          role="switch"
          aria-checked={on}
          aria-label="Toggle in-chat proactivity"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            on ? "bg-indigo-ai" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              on ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </Surface>
  );
}
