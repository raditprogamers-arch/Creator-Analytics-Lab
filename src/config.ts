import dotenv from "dotenv";
import path from "node:path";

// Load .env.local first, fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  neonBranch: process.env.NEON_BRANCH,
  db: {
    url: process.env.DATABASE_URL,
    unpooledUrl: process.env.DATABASE_URL_UNPOOLED,
  },
  auth: {
    baseUrl: process.env.NEON_AUTH_BASE_URL,
    jwksUrl: process.env.NEON_AUTH_JWKS_URL,
  },
  storage: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION || "ap-southeast-1",
    bucket: "assets",
  },
  functions: {
    helloUrl: process.env.NEON_FUNCTION_HELLO_BASE_URL,
  },
  realtime: {
    url: process.env.NEON_REALTIME_URL,
    secret: process.env.NEON_REALTIME_SECRET,
  },
  aiGateway: {
    baseUrl: process.env.NEON_AI_GATEWAY_BASE_URL,
    token: process.env.NEON_AI_GATEWAY_TOKEN,
  },
};

