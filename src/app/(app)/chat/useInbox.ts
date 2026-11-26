"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cacheKeys, readCache, writeCache } from "@/lib/chat-cache";
import { normalizePersonaRole } from "@/lib/persona-role";

export type Conversation = {
  id: string;
  name: string;
  kind: string; // persona | dm | group
  isOwner: boolean;
  hasKey: boolean;
  lastMessage: { content: string; senderName: string; fromMe?: boolean } | null;
  lastAt?: string;
  mood?: string;
  members: {
    kind: string;
    name?: string | null;
    avatar?: string | null;
    status?: string;
  }[];
};

export type Persona = {
  id: string;
  name: string;
  blurb: string;
  avatar: string;
  builtin: boolean;
  mine: boolean;
  /** "kai" | "kai_mode" | "custom" — modes are Kai's attitudes, not people. */
  kind?: string;
  /** Short attitude label for a Kai mode (e.g. "Calm"). */
  label?: string | null;
  modeOfId?: string | null;
};

/**
 * Conversations, personas and the pending-request count, shared by the phone
 * hub and the desktop rail so both paint from the same cache and rules.
 */
export function useInbox() {
  const router = useRouter();
  const pathname = usePathname();
  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [hiddenConvos, setHiddenConvos] = useState<Conversation[] | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [starting, setStarting] = useState(false);

  const reloadConvos = useCallback(() => {
    Promise.all([
      fetch("/api/groups").then((r) => r.json()),
      fetch("/api/groups?hidden=1")
        .then((r) => r.json())
        .catch(() => ({ groups: [] })),
    ])
      .then(([visible, hidden]) => {
        const list: Conversation[] = visible.groups ?? [];
        setConvos(list);
        writeCache(cacheKeys.convos, list);
        setHiddenConvos(hidden.groups ?? []);
      })
      .catch(() => {
        setConvos((c) => c ?? []);
        setHiddenConvos((h) => h ?? []);
      });
  }, []);

  const reloadPersonas = useCallback(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => {
        const list: Persona[] = (d.personas ?? []).map(normalizePersonaRole);
        setPersonas(list);
        writeCache(cacheKeys.personas, list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Paint cached conversations + personas instantly, then refresh.
    const cachedC = readCache<Conversation[]>(cacheKeys.convos);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cachedC) setConvos(cachedC);
    const cachedP = readCache<Persona[]>(cacheKeys.personas);
    // Normalize old cache entries too: before the personalities migration they
    // had no `kind`, which made Kai's attitudes look like people in the sheets.
    if (cachedP) setPersonas(cachedP.map(normalizePersonaRole));
    reloadConvos();
    reloadPersonas();
  }, [reloadConvos, reloadPersonas]);

  // Open (or create+open) a 1:1 persona conversation.
  const startPersonaChat = useCallback(
    async (personaId: string) => {
      if (starting) return;
      setStarting(true);
      try {
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personaId }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok && d.group?.id) router.push(`/chat/c/${d.group.id}`);
      } catch {
        // staying on the list is fine
      } finally {
        setStarting(false);
      }
    },
    [router, starting]
  );

  const hideConvo = useCallback(
    (id: string) => {
      const target = convos?.find((c) => c.id === id);
      setConvos((cur) => cur?.filter((c) => c.id !== id) ?? null);
      if (target) {
        setHiddenConvos((cur) =>
          cur?.some((c) => c.id === id) ? cur : [...(cur ?? []), target]
        );
      }
      fetch(`/api/groups/${id}/hide`, { method: "POST" }).catch(() => {
        reloadConvos();
      });
    },
    [convos, reloadConvos]
  );

  const unhideConvo = useCallback(
    (id: string) => {
      const target = hiddenConvos?.find((c) => c.id === id);
      setHiddenConvos((cur) => cur?.filter((c) => c.id !== id) ?? null);
      if (target) {
        setConvos((cur) =>
          cur?.some((c) => c.id === id) ? cur : [...(cur ?? []), target]
        );
      }
      fetch(`/api/groups/${id}/hide`, { method: "DELETE" }).catch(() => {
        reloadConvos();
      });
    },
    [hiddenConvos, reloadConvos]
  );

  // Remove the conversation for this user only (archived rows): a group is
  // left (an owner hands it to the other members), a persona chat is deleted.
  const deleteConvo = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/groups/${id}/leave`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return {
            ok: false,
            error: body.error ?? "Couldn't delete this chat.",
          };
        }
        setConvos((cur) => {
          const next = cur?.filter((c) => c.id !== id) ?? null;
          if (next) writeCache(cacheKeys.convos, next);
          return next;
        });
        setHiddenConvos((cur) => cur?.filter((c) => c.id !== id) ?? null);
        if (pathname === `/chat/c/${id}`) router.push("/chat");
        return { ok: true };
      } catch {
        return { ok: false, error: "Couldn't delete this chat." };
      }
    },
    [pathname, router]
  );

  return {
    convos,
    hiddenConvos,
    personas,
    starting,
    reloadConvos,
    reloadPersonas,
    hideConvo,
    unhideConvo,
    deleteConvo,
    startPersonaChat,
  };
}
