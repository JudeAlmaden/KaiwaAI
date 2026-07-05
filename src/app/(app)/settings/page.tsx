import { getSession } from "@/lib/session";
import PageHeader from "../PageHeader";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Settings" jp="設定" subtitle="Manage your account and preferences." />
      <SettingsClient email={session?.email ?? ""} />
    </div>
  );
}
