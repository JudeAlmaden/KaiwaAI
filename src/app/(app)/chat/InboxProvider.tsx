"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useInbox } from "./useInbox";
import { usePeople } from "./usePeople";
import { useMatchQueue } from "./useMatchQueue";

type InboxValue = ReturnType<typeof useInbox>;
type PeopleValue = ReturnType<typeof usePeople>;
type MatchValue = ReturnType<typeof useMatchQueue>;

const InboxContext = createContext<InboxValue | null>(null);
const PeopleContext = createContext<PeopleValue | null>(null);
const MatchContext = createContext<MatchValue | null>(null);

/**
 * One instance of the inbox, people and matching state for the whole `/chat`
 * subtree, so the rail and the page share a fetch and a queue, and the queue
 * survives moving between conversations.
 */
export function InboxProvider({
  strangerEnabled = false,
  children,
}: {
  strangerEnabled?: boolean;
  children: ReactNode;
}) {
  const inbox = useInbox();
  const people = usePeople();
  const match = useMatchQueue({ enabled: strangerEnabled });

  return (
    <InboxContext.Provider value={inbox}>
      <PeopleContext.Provider value={people}>
        <MatchContext.Provider value={match}>{children}</MatchContext.Provider>
      </PeopleContext.Provider>
    </InboxContext.Provider>
  );
}

export function useInboxContext() {
  const value = useContext(InboxContext);
  if (!value) throw new Error("useInboxContext must be used inside InboxProvider");
  return value;
}

export function usePeopleContext() {
  const value = useContext(PeopleContext);
  if (!value) throw new Error("usePeopleContext must be used inside InboxProvider");
  return value;
}

export function useMatchQueueContext() {
  const value = useContext(MatchContext);
  if (!value) throw new Error("useMatchQueueContext must be used inside InboxProvider");
  return value;
}
