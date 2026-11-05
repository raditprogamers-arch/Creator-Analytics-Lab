import { testDatabase } from "./services/db.js";
import { testObjectStorage } from "./services/storage.js";
import { testFunctions } from "./services/functions.js";
import { testAuth } from "./services/auth.js";
import { testRealtime } from "./services/realtime.js";
import { testAiGateway } from "./services/ai-gateway.js";

async function run() {
  console.log("=================================================");
  console.log("   CREATOR ANALYTICS TAB - NEON SERVICES TEST    ");
  console.log("=================================================\n");

  let totalPassed = 0;
  let totalAttempted = 0;

  // 1. Lakebase Postgres
  console.log("[1/6] Testing Lakebase Postgres...");
  totalAttempted++;
  try {
    const pgRes = await testDatabase();
    console.log("  Status: PASSED");
    console.log("  Database:", pgRes.dbInfo.database);
    console.log("  Inserted Record:", JSON.stringify(pgRes.inserted));
    console.log("  Total Records Count:", pgRes.recentCount);
    totalPassed++;
  } catch (err: any) {
    console.error("  Status: FAILED ->", err.message);
  }

  // 2. Object Storage
  console.log("\n[2/6] Testing Neon Object Storage...");
  totalAttempted++;
  try {
    const storageRes = await testObjectStorage();
    console.log("  Status: PASSED");
    console.log("  Bucket:", storageRes.bucket);
    console.log("  Uploaded Key:", storageRes.uploadedKey);
    console.log("  Download Verified:", storageRes.downloadVerified);
    console.log("  Total Objects in Bucket:", storageRes.totalObjects);
    totalPassed++;
  } catch (err: any) {
    console.error("  Status: FAILED ->", err.message);
  }

  // 3. Neon Functions
  console.log("\n[3/6] Testing Neon Functions...");
  totalAttempted++;
  try {
    const fnRes = await testFunctions();
    console.log("  Status: PASSED");
    console.log("  Function URL:", fnRes.functionUrl);
    console.log("  HTTP Status:", fnRes.statusCode);
    console.log("  Response Body:", fnRes.responseBody);
    totalPassed++;
  } catch (err: any) {
    console.error("  Status: FAILED ->", err.message);
  }

  // 4. Neon Auth
  console.log("\n[4/6] Testing Neon Auth (Managed Better Auth)...");
  totalAttempted++;
  try {
    const authRes = await testAuth();
    console.log("  Status: PASSED");
    console.log("  Auth Base URL:", authRes.baseUrl);
    console.log("  JWKS URL:", authRes.jwksUrl);
    console.log("  Active JWKS Keys Count:", authRes.activeKeys);
    totalPassed++;
  } catch (err: any) {
    console.error("  Status: FAILED ->", err.message);
  }

  // 5. Neon Realtime
  console.log("\n[5/6] Testing Neon Realtime...");
  totalAttempted++;
  try {
    const realtimeRes = await testRealtime();
    console.log("  Status: PASSED");
    console.log("  Realtime URL:", realtimeRes.realtimeUrl);
    console.log("  Query Fingerprint:", realtimeRes.queryFingerprint);
    console.log("  Capability Expires At:", realtimeRes.expiresAt);
    console.log("  Capability Prefix:", realtimeRes.capabilityPrefix);
    totalPassed++;
  } catch (err: any) {
    console.error("  Status: FAILED ->", err.message);
  }

  // 6. Neon AI Gateway
  console.log("\n[6/6] Testing Neon AI Gateway...");
  totalAttempted++;
  try {
    const aiRes = await testAiGateway();
    if (aiRes.success) {
      console.log("  Status: PASSED");
      console.log("  AI Gateway Base URL:", aiRes.baseUrl);
      console.log("  Available Models:", aiRes.availableModels);
      totalPassed++;
    } else {
      console.log("  Status: RESTRICTED BY PLAN (Expected on Free Plan)");
      console.log("  Base URL:", aiRes.baseUrl);
      console.log("  Response Status:", aiRes.status);
      console.log("  Note:", aiRes.note);
      console.log("  Error:", aiRes.error);
    }
  } catch (err: any) {
    console.error("  Status: FAILED ->", err.message);
  }

  console.log("\n=================================================");
  console.log(`SUMMARY: ${totalPassed}/${totalAttempted} services verified operational`);
  console.log("=================================================");
}

run().catch((e) => {
  console.error("Fatal test error:", e);
  process.exit(1);
});
