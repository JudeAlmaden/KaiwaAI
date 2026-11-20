"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cacheKeys, readCache, writeCache } from "@/lib/chat-cache";

export type Conversation = {
  id: string;
  name: string;
  kind: string; // persona | dm | group
  isOwner: boolean;
  hasKey: boolean;
  lastMessage: { content: string; senderName: string; fromMe?: boolean } | null;
  lastAt?: string;
  mood?: string;
  members: { kind: string; name?: string | null; avatar?: string | null }[];
};

export type Persona = {
  id: string;
  name: string;
  blurb: string;
  avatar: string;
  builtin: boolean;
  mine: boolean;
};

/**
 * Conversations, personas and the pending-request count, shared by the phone
 * hub and the desktop rail so both paint from the same cache and rules.
 */
export function useInbox() {
  const router = useRouter();
  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [pending, setPending] = useState(0);
  const [starting, setStarting] = useState(false);

  const reloadConvos = useCallback(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => {
        const list: Conversation[] = d.groups ?? [];
        setConvos(list);
        writeCache(cacheKeys.convos, list);
      })
      .catch(() => setConvos((c) => c ?? []));
  }, []);

  const reloadPersonas = useCallback(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => {
        const list: Persona[] = d.personas ?? [];
        setPersonas(list);
        writeCache(cacheKeys.personas, list);
      })
      .catch(() => {});
  }, []);

  const reloadPending = useCallback(() => {
    Promise.all([
      fetch("/api/friends")
        .then((r) => r.json())
        .catch(() => ({})),
      fetch("/api/invites")
        .then((r) => r.json())
        .catch(() => ({})),
    ]).then(([f, i]) => {
      setPending((f.incoming?.length ?? 0) + (i.invites?.length ?? 0));
    });
  }, []);

  useEffect(() => {
    // Paint cached conversations + personas instantly, then refresh.
    const cachedC = readCache<Conversation[]>(cacheKeys.convos);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cachedC) setConvos(cachedC);
    const cachedP = readCache<Persona[]>(cacheKeys.personas);
    if (cachedP) setPersonas(cachedP);
    reloadConvos();
    reloadPersonas();
    reloadPending();
  }, [reloadConvos, reloadPersonas, reloadPending]);

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
      setConvos((cur) => cur?.filter((c) => c.id !== id) ?? null);
      fetch(`/api/groups/${id}/hide`, { method: "POST" }).catch(() => {
        reloadConvos();
      });
    },
    [reloadConvos]
  );

  return {
    convos,
    personas,
    pending,
    starting,
    reloadConvos,
    reloadPersonas,
    hideConvo,
    startPersonaChat,
  };
}
