import Kai from "../Kai";

export const metadata = { title: "Offline — KaiwaAI" };

export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Kai size={72} />
      <h1 className="mt-4 font-display text-xl font-extrabold">You&apos;re offline</h1>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Kai needs an internet connection to chat. Your saved words and progress
        are safe — reconnect and pick up where you left off.
      </p>
    </div>
  );
}
