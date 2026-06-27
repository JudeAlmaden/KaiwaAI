import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AuthForm from "../AuthForm";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/chat");

  return <AuthForm mode="register" />;
}
