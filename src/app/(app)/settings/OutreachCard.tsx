"use client";

import { useEffect, useState } from "react";
import { Surface, Chip } from "../ui";
import { moodFor } from "@/lib/outreach";
import { getProactiveChat, setProactiveChat } from "@/lib/proactive-config";

type Settings = {
  mode: "off" | "scheduled" | "random";
  times: string[];
  quietStart: number;
  quietEnd: number;
  consecutiveIgnored: number;
};

const MOOD_LABEL: Record<string, string> = {
  cheerful: "😊 Cheerful",
  hopeful: "🙂 Hopeful",
  wistful: "🥺 Misses you",
  sad: "😢 Sad",
  givingUp: "💧 Giving up",
  dormant: "😴 Resting (stopped reaching out)",
};

export default function OutreachCard() {
  const [s, setS] = useState<Settings | null>(null);
  // Scheduled-times mode is disabled for now (see "When" chips below); Kai
  // reaches out at random instead. Restore alongside the times editor.
  // const [newTime, setNewTime] = useState("19:00");

  useEffect(() => {
    fetch("/api/settings/outreach")
      .then((r) => r.json())
      .then(setS)
      .catch(() => {});
  }, []);

  async function save(patch: Partial<Settings>) {
    const res = await fetch("/api/settings/outreach", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setS(await res.json());
  }

  if (!s) {
    return (
      <Surface>
        <h2 className="font-display text-lg font-bold">Kai reaching out</h2>
        <p className="mt-1 text-sm text-muted">Loading…</p>
      </Surface>
    );
  }

  const mood = moodFor(s.consecutiveIgnored);

  return (
    <Surface>
      <h2 className="font-display text-lg font-bold">Kai reaching out</h2>
      <p className="mt-1 text-sm text-muted">
        Let Kai message you first. She notices if you&apos;ve been away — and if
        ignored too long, she&apos;ll quietly stop until you come back. Requires
        background mode (above).
      </p>

      <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
        When
      </p>
      <div className="flex flex-wrap gap-2">
        {/*
          "Set times" (scheduled) is disabled for now — the once-daily cron on
          Vercel Hobby can't honor user-picked times, so Kai reaches out at
          random within active hours instead. To restore: add "scheduled" back
          to this list and un-comment the Times editor + newTime state below.
        */}
        {(["off", "random"] as const).map((m) => (
          <Chip key={m} active={s.mode === m} onClick={() => save({ mode: m })}>
            {m === "off" ? "Off" : "Random"}
          </Chip>
        ))}
      </div>

      {/*
      {s.mode === "scheduled" && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            Times
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {s.times.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-indigo-ai/10 px-3 py-1.5 text-sm font-bold text-indigo-ai"
              >
                {t}
                <button
                  onClick={() => save({ times: s.times.filter((x) => x !== t) })}
                  className="text-indigo-ai/60 hover:text-sakura"
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="rounded-full border-2 border-border bg-card px-3 py-1 text-sm outline-none focus:border-indigo-ai"
            />
            <button
              onClick={() =>
                !s.times.includes(newTime) &&
                save({ times: [...s.times, newTime] })
              }
              className="rounded-full bg-indigo-ai px-3 py-1.5 text-sm font-bold text-white"
            >
              + Add
            </button>
          </div>
        </div>
      )}
      */}

      {s.mode !== "off" && (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
              Quiet from
            </span>
            <HourSelect
              value={s.quietStart}
              onChange={(v) => save({ quietStart: v })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
              until
            </span>
            <HourSelect
              value={s.quietEnd}
              onChange={(v) => save({ quietEnd: v })}
            />
          </label>
        </div>
      )}

      {s.mode !== "off" && (
        <p className="mt-4 border-t-2 border-border pt-3 text-sm">
          <span className="text-muted">Kai&apos;s mood right now: </span>
          <span className="font-bold">{MOOD_LABEL[mood]}</span>
        </p>
      )}

      <ProactiveToggle />
      <PushNotificationToggle />
    </Surface>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    console.log("[PushNotification] Initializing...");
    
    // Shorter fallback timeout to ensure we don't stay in loading state
    const fallbackTimeout = setTimeout(() => {
      console.warn("[PushNotification] Check timed out after 2s, clearing loading state");
      setLoading(false);
    }, 2000); // Reduced to 2 seconds
    
    // Check support more carefully for mobile
    const isSupported = 
      "Notification" in window && 
      "serviceWorker" in navigator &&
      "PushManager" in window;
    
    console.log("[PushNotification] Support check:", { isSupported });
    
    // Defer state updates to avoid synchronous setState inside useEffect warning
    const timer = setTimeout(() => {
      setSupported(isSupported);
      if (!isSupported) {
        console.log("[PushNotification] Not supported:", {
          hasNotification: "Notification" in window,
          hasServiceWorker: "serviceWorker" in navigator,
          hasPushManager: "PushManager" in window,
        });
        clearTimeout(fallbackTimeout);
        setLoading(false);
        return;
      }

      setPermission(Notification.permission);
      console.log("[PushNotification] Permission:", Notification.permission);

      // Check if we have an active subscription
      console.log("[PushNotification] Waiting for service worker...");
      navigator.serviceWorker.ready
        .then(async (reg) => {
          console.log("[PushNotification] Service worker ready");
          try {
            const sub = await reg.pushManager.getSubscription();
            console.log("[PushNotification] Subscription:", !!sub);
            setSubscribed(!!sub);
          } catch (err) {
            console.error("[PushNotification] Error getting push subscription:", err);
          } finally {
            clearTimeout(fallbackTimeout);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("[PushNotification] Service worker not ready:", err);
          clearTimeout(fallbackTimeout);
          setLoading(false);
        });
    }, 0);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimeout);
    };
  }, []);

  async function handleToggle() {
    if (loading || !supported) return;
    setLoading(true);

    try {
      // Check if service worker is available
      if (!navigator.serviceWorker) {
        throw new Error("Service Worker not supported");
      }

      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setSubscribed(false);
      } else {
        // Subscribe
        // Request permission if not already granted
        let perm = Notification.permission;
        if (perm === "default") {
          try {
            perm = await Notification.requestPermission();
            setPermission(perm);
          } catch (err) {
            console.error("Permission request failed:", err);
            alert("Could not request notification permission. Your browser may not support this feature.");
            setLoading(false);
            return;
          }
        }

        if (perm !== "granted") {
          alert("Notification permission is required to enable push notifications.");
          setLoading(false);
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.error("VAPID public key is missing");
          alert("Push notifications are not configured. Please contact support.");
          setLoading(false);
          return;
        }

        let sub;
        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        } catch (err) {
          console.error("Push subscription failed:", err);
          alert("Failed to subscribe to push notifications. This feature may not be supported on your device.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });

        if (!res.ok) {
          throw new Error("Failed to register subscription on server");
        }

        setSubscribed(true);
      }
    } catch (err) {
      console.error("Failed to toggle push notifications:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      alert(`Something went wrong while setting up notifications: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  console.log("[PushNotification] Render state:", { supported, subscribed, permission, loading });

  return (
    <div className="mt-4 border-t-2 border-border pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">Push Notifications</p>
          <p className="text-xs text-muted">
            {permission === "denied"
              ? "Blocked. Please reset notification permissions in your browser settings to receive alerts."
              : loading
              ? "Checking notification status..."
              : "Get alert notifications on this device when Kai sends a new message."}
          </p>
          {/* Debug info - remove after fixing */}
          <p className="text-xs text-red-500 mt-1">
            Debug: loading={String(loading)}, permission={permission}, supported={String(supported)}
          </p>
        </div>
        <button
          onTouchEnd={(e) => {
            console.log("[Push] Touch event fired");
            e.preventDefault();
            e.stopPropagation();
            if (loading || permission === "denied") {
              console.log("[Push] Blocked by state check");
              return;
            }
            handleToggle();
          }}
          onClick={() => {
            console.log("[Push] Click event fired", { loading, permission, subscribed });
            if (loading || permission === "denied") {
              console.log("[Push] Blocked by state check");
              return;
            }
            handleToggle();
          }}
          role="switch"
          aria-checked={subscribed}
          aria-label="Toggle push notifications"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            subscribed ? "bg-indigo-ai" : "bg-border"
          } ${(loading || permission === "denied") ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              subscribed ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

/** In-chat proactivity: Kai messaging first / following up while you're online.
 *  Client-only setting (BYOK, localStorage) like the model preferences. */
function ProactiveToggle() {
  const [on, setOn] = useState(true);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOn(getProactiveChat()), []);

  function toggle() {
    const next = !on;
    setOn(next);
    setProactiveChat(next);
  }

  return (
    <div className="mt-4 border-t-2 border-border pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">Chats first while you&apos;re here</p>
          <p className="text-xs text-muted">
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
    </div>
  );
}

function HourSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-full border-2 border-border bg-card px-3 py-1.5 text-sm font-bold outline-none focus:border-indigo-ai"
    >
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, "0")}:00
        </option>
      ))}
    </select>
  );
}
