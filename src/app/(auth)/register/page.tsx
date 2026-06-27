import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import AuthForm from "../AuthForm";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  return <AuthForm mode="register" />;
}
