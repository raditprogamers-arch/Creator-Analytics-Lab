import http from "node:http";
import { config } from "./config.js";
import { testDatabase, getDb } from "./services/db.js";
import { testObjectStorage } from "./services/storage.js";
import { testFunctions } from "./services/functions.js";
import { testAuth } from "./services/auth.js";
import { testRealtime } from "./services/realtime.js";
import { testAiGateway } from "./services/ai-gateway.js";

async function runAllTests() {
  const results: Record<string, unknown> = {};

  // Postgres
  try {
    results.postgres = await testDatabase();
  } catch (err: any) {
    results.postgres = { service: "Postgres", success: false, error: err.message };
  }

  // Object Storage
  try {
    results.storage = await testObjectStorage();
  } catch (err: any) {
    results.storage = { service: "Object Storage", success: false, error: err.message };
  }

  // Neon Functions
  try {
    results.functions = await testFunctions();
  } catch (err: any) {
    results.functions = { service: "Functions", success: false, error: err.message };
  }

  // Neon Auth
  try {
    results.auth = await testAuth();
  } catch (err: any) {
    results.auth = { service: "Neon Auth", success: false, error: err.message };
  }

  // Neon Realtime
  try {
    results.realtime = await testRealtime();
  } catch (err: any) {
    results.realtime = { service: "Realtime", success: false, error: err.message };
  }

  // Neon AI Gateway
  try {
    results.aiGateway = await testAiGateway();
  } catch (err: any) {
    results.aiGateway = { service: "AI Gateway", success: false, error: err.message };
  }

  return results;
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    res.setHeader("Content-Type", "application/json");

    if (url.pathname === "/health") {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "healthy", branch: config.neonBranch }));
      return;
    }

    if (url.pathname === "/api/analytics") {
      try {
        const sql = getDb();
        const records = await sql`
          SELECT * FROM creator_analytics ORDER BY id DESC LIMIT 20;
        `;
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, count: records.length, data: records }));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    if (url.pathname === "/api/test/postgres") {
      try {
        const result = await testDatabase();
        res.writeHead(200);
        res.end(JSON.stringify(result, null, 2));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }, null, 2));
      }
      return;
    }

    if (url.pathname === "/api/test/storage") {
      try {
        const result = await testObjectStorage();
        res.writeHead(200);
        res.end(JSON.stringify(result, null, 2));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }, null, 2));
      }
      return;
    }

    if (url.pathname === "/api/test/functions") {
      try {
        const result = await testFunctions();
        res.writeHead(200);
        res.end(JSON.stringify(result, null, 2));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }, null, 2));
      }
      return;
    }

    if (url.pathname === "/api/test/auth") {
      try {
        const result = await testAuth();
        res.writeHead(200);
        res.end(JSON.stringify(result, null, 2));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }, null, 2));
      }
      return;
    }

    if (url.pathname === "/api/test/realtime") {
      try {
        const result = await testRealtime();
        res.writeHead(200);
        res.end(JSON.stringify(result, null, 2));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }, null, 2));
      }
      return;
    }

    if (url.pathname === "/api/test/ai-gateway") {
      try {
        const result = await testAiGateway();
        res.writeHead(200);
        res.end(JSON.stringify(result, null, 2));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }, null, 2));
      }
      return;
    }

    if (url.pathname === "/api/test/all") {
      const allResults = await runAllTests();
      res.writeHead(200);
      res.end(JSON.stringify(allResults, null, 2));
      return;
    }

    // Default: App Overview
    res.writeHead(200);
    res.end(
      JSON.stringify(
        {
          appName: "Creator Analytics Tab",
          description: "Full-stack analytics backend connected to Neon services",
          neonBranch: config.neonBranch,
          endpoints: [
            "/health",
            "/api/analytics",
            "/api/test/postgres",
            "/api/test/storage",
            "/api/test/functions",
            "/api/test/auth",
            "/api/test/realtime",
            "/api/test/ai-gateway",
            "/api/test/all",
          ],
        },
        null,
        2
      )
    );
  });
}

const server = createServer();
server.listen(config.port, () => {
  console.log(`Creator Analytics Tab server listening on http://localhost:${config.port}`);
});

