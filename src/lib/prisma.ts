import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const PRISMA_SCHEMA_VERSION = 3; // Incremented to refresh dev client cache after schema change

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: number | undefined;
};

// PostgreSQL (Supabase). Use the pooled connection string on serverless
// (Supabase "Transaction" pooler / port 6543) via DATABASE_URL.
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma && globalForPrisma.prismaVersion === PRISMA_SCHEMA_VERSION
    ? globalForPrisma.prisma
    : createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaVersion = PRISMA_SCHEMA_VERSION;
}
