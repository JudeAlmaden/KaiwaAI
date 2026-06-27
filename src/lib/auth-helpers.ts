import { getSession } from "./session";
import { prisma } from "./prisma";

/** Returns the full user row for the current session, or null. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}
