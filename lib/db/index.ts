import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // We avoid throwing at build time if DATABASE_URL is temporarily unset during bundle analysis
  if (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV) {
    console.warn("WARNING: DATABASE_URL is not set.");
  }
}

// Neon HTTP driver connection for serverless execution
const sql = neon(
  connectionString || "postgresql://placeholder:placeholder@localhost/placeholder"
);

export const db = drizzle(sql, { schema });
