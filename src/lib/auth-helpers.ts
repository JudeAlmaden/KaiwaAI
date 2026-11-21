import { getSession } from "./session";
import { prisma } from "./prisma";

/** Returns the full user row for the current session, or null. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;

  // Invalidate session if tokenVersion does not match user's current tokenVersion
  const sessionTokenVersion = session.tokenVersion ?? 1;
  const userTokenVersion = user.tokenVersion ?? 1;
  if (sessionTokenVersion !== userTokenVersion) {
    return null;
  }

  return user;
}
