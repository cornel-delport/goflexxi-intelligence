import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";

// Prisma 7 with Neon serverless adapter (driverAdapters preview feature enabled in schema)
// DATABASE_URL is set in .env — see .env.example for the required format

function createPrismaClient() {
  // Initialize Neon serverless SQL client
  const sql = neon(process.env.DATABASE_URL!);
  // Create Prisma adapter for Neon
  const adapter = new PrismaNeon(sql);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
