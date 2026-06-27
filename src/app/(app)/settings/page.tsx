import { getSession } from "@/lib/session";
import PageHeader from "../PageHeader";
import LogoutButton from "../../LogoutButton";
import ApiKeyCard from "./ApiKeyCard";
import ModelCard from "./ModelCard";
import ServerKeyCard from "./ServerKeyCard";
import OutreachCard from "./OutreachCard";

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="You" jp="設定" subtitle="Your account and Kai's setup." />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6 sm:px-8">
        {/* account */}
        <section className="rounded-3xl border-2 border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Account</h2>
          <p className="mt-1 text-sm text-muted">{session?.email}</p>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </section>

        {/* BYOK gemini key */}
        <ApiKeyCard />

        {/* opt-in server-side key for background features */}
        <ServerKeyCard />

        {/* Kai outreach */}
        <OutreachCard />

        {/* model + token settings */}
        <ModelCard />
      </div>
    </div>
  );
}
