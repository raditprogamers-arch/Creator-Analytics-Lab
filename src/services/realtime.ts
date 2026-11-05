import { createRealtime, rawSql } from "@neon/realtime/server";
import { config } from "../config.js";

export async function testRealtime() {
  if (!config.realtime.secret) {
    throw new Error("NEON_REALTIME_SECRET is not configured");
  }

  // Initialize Realtime server handler with the branch secret
  const realtime = createRealtime({
    secret: config.realtime.secret,
    db: "neondb",
  });

  // Construct a live SQL query for Creator Analytics
  const liveQuery = rawSql(
    "SELECT id, creator_name, platform, followers, views, created_at FROM creator_analytics ORDER BY id DESC LIMIT 10"
  );

  // Seal the query cryptographically
  const sealed = await realtime.seal({ query: liveQuery });

  return {
    service: "Realtime",
    success: true,
    realtimeUrl: config.realtime.url,
    queryFingerprint: sealed.queryFingerprint,
    expiresAt: new Date(sealed.expiresAt).toISOString(),
    capabilityPrefix: sealed.capability.substring(0, 32) + "...",
  };
}
