import { PrismaClient } from "@prisma/client";

// Standard Prisma client for PostgreSQL (Supabase / any PostgreSQL host)
// DATABASE_URL is set in .env — see .env.example for the required format

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
