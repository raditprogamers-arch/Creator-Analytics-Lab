import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString || connectionString.includes("placeholder")) {
    throw new Error(
      "DATABASE_URL is not set in Vercel Environment Variables. Please add DATABASE_URL in Vercel Project Settings → Environment Variables and redeploy."
    );
  }

  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

// Dynamic Proxy to prevent baking placeholder connection strings during build
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as any, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
