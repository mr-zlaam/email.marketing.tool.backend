import { defineConfig } from "drizzle-kit";
import process from "process";
export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schemas/**/*.ts", // Recursive glob pattern

  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URI as string
  },
  migrations: { prefix: "index", table: "__drizzle_migrations__", schema: "public" }
});
