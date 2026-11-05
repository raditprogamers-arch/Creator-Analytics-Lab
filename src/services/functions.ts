import { config } from "../config.js";

export async function testFunctions() {
  if (!config.functions.helloUrl) {
    throw new Error("NEON_FUNCTION_HELLO_BASE_URL is not configured");
  }

  const response = await fetch(config.functions.helloUrl);
  if (!response.ok) {
    throw new Error(
      `Neon Function returned status ${response.status}: ${await response.text()}`
    );
  }

  const text = await response.text();

  return {
    service: "Functions",
    success: true,
    functionUrl: config.functions.helloUrl,
    statusCode: response.status,
    responseBody: text.trim(),
  };
}

