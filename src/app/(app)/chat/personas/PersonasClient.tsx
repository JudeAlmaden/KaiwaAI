"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../PageHeader";
import PersonaManager from "../PersonaManager";

type Persona = {
  id: string;
  name: string;
  blurb: string;
  avatar: string;
  builtin: boolean;
  mine: boolean;
};

// Personas moved out of the hub when the AI tab was retired; this page is the
// management surface the compose sheet links to.
export default function PersonasClient() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [starting, setStarting] = useState(false);

  const load = useCallback(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => setPersonas(d.personas ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function startChat(personaId: string) {
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
      // staying on the page is fine; the persona list is still usable
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Personas"
        jp="人格"
        subtitle="Create, edit and start chats with AI personas"
        compact
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:px-8 sm:py-5 sm:pb-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <PersonaManager
            personas={personas}
            onChange={load}
            onStartChat={startChat}
          />
        </div>
      </div>
    </div>
  );
}
