import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PoolConfig } from "pg";

const PRISMA_SCHEMA_VERSION = 4; // Bump to force recreation of the global client (new pool settings)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: number | undefined;
};

// PostgreSQL (Supabase). Use the pooled connection string on serverless
// (Supabase "Transaction" pooler / port 6543) via DATABASE_URL.
//
// The Supabase pooler terminates connections idle for ~5 minutes. Stale sockets
// left in the local pg pool then surface as Prisma P1001 "Can't reach database
// server" — especially after laptop sleep/wake or a network blip. The options
// below evict idle sockets before the server does and time out fast on dead
// ones, so a dropped connection fails fast and the pool replaces it.
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({
    connectionString,
    // Don't let pg parse the URL's pgbouncer flag (it doesn't need it; the
    // server does the pooling) and keep pool sizing modest for the dev pooler.
    application_name: "kaiwaai",
    max: 10,
    idleTimeoutMillis: 60_000, // evict before Supabase's ~5 min idle cutoff
    connectionTimeoutMillis: 10_000, // fail fast if pooler is unreachable
    statement_timeout: 15_000, // kill runaway queries
    query_timeout: 15_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  } satisfies PoolConfig);
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
