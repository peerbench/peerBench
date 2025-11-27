import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  quiet: true,
  path: [
    ".env.local",
    ".env.dev",
    ".env.development",
    ".env.prod",
    ".env.production",
    ".env",
  ],
});

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
