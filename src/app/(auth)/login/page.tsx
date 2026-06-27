import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import AuthForm from "../AuthForm";

export default async function LoginPage() {
  // Only redirect if a real, existing user is logged in (avoids a loop when the
  // cookie is valid but the user was deleted).
  const user = await getCurrentUser();
  if (user) redirect("/home");

  return <AuthForm mode="login" />;
}
