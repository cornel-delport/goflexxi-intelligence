import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 config — connection URL lives here, not in schema.prisma
// Set DATABASE_URL in your .env to your Supabase / PostgreSQL connection string
// Example: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

export default defineConfig({
  // @ts-expect-error — Prisma 7 earlyAccess flag not yet in type definitions
  earlyAccess: true,
  schema: path.join(process.cwd(), "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
