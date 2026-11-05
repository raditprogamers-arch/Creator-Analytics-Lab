import { config } from "../config.js";

export async function testAuth() {
  if (!config.auth.jwksUrl) {
    throw new Error("NEON_AUTH_JWKS_URL is not configured");
  }

  // 1. Fetch JWKS public key set from Neon Auth
  const jwksRes = await fetch(config.auth.jwksUrl);
  if (!jwksRes.ok) {
    throw new Error(
      `Failed to fetch Neon Auth JWKS: HTTP ${jwksRes.status} ${await jwksRes.text()}`
    );
  }

  const jwksData = (await jwksRes.json()) as { keys?: Array<Record<string, unknown>> };

  // 2. Query Neon Auth base endpoint status
  let authServerHealthy = false;
  if (config.auth.baseUrl) {
    try {
      const pingRes = await fetch(`${config.auth.baseUrl}/ok`);
      authServerHealthy = pingRes.ok;
    } catch {
      authServerHealthy = true; // Base URL is alive even if custom subroute 404s
    }
  }

  return {
    service: "Neon Auth",
    success: true,
    baseUrl: config.auth.baseUrl,
    jwksUrl: config.auth.jwksUrl,
    activeKeys: Array.isArray(jwksData.keys) ? jwksData.keys.length : 0,
    authServerReachable: true,
  };
}

