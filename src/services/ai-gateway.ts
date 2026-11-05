import OpenAI from "openai";
import { config } from "../config.js";

export function getAiGatewayClient() {
  if (!config.aiGateway.baseUrl || !config.aiGateway.token) {
    throw new Error(
      "NEON_AI_GATEWAY_BASE_URL or NEON_AI_GATEWAY_TOKEN is not configured"
    );
  }

  return new OpenAI({
    baseURL: config.aiGateway.baseUrl,
    apiKey: config.aiGateway.token,
  });
}

export async function testAiGateway() {
  const client = getAiGatewayClient();

  try {
    const modelList = await client.models.list();
    return {
      service: "AI Gateway",
      success: true,
      baseUrl: config.aiGateway.baseUrl,
      modelCount: modelList.data.length,
      availableModels: modelList.data.slice(0, 5).map((m) => m.id),
    };
  } catch (error: any) {
    return {
      service: "AI Gateway",
      success: false,
      baseUrl: config.aiGateway.baseUrl,
      error: error.message || String(error),
      status: error.status,
      note: "AI Gateway requires a paid Neon plan (Launch or Scale) to serve requests.",
    };
  }
}

