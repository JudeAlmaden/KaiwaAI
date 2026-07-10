import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <OnboardingClient email={user.email} />;
}
