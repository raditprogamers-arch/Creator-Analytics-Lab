import { neon } from "@neondatabase/serverless";
import { config } from "../config.js";

export function getDb() {
  if (!config.db.url) {
    throw new Error("DATABASE_URL is not configured in environment variables");
  }
  return neon(config.db.url);
}

export async function testDatabase() {
  const sql = getDb();
  
  // 1. Check version and connectivity
  const [dbInfo] = await sql`
    SELECT version() as version, current_database() as database, now() as current_time;
  `;

  // 2. Ensure creator analytics table exists
  await sql`
    CREATE TABLE IF NOT EXISTS creator_analytics (
      id SERIAL PRIMARY KEY,
      creator_name VARCHAR(100) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      followers INT NOT NULL,
      views INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 3. Insert test record
  const [inserted] = await sql`
    INSERT INTO creator_analytics (creator_name, platform, followers, views)
    VALUES ('Radit', 'YouTube', 125000, 3400000)
    RETURNING id, creator_name, platform, followers, views, created_at;
  `;

  // 4. Query recent records
  const recentRecords = await sql`
    SELECT id, creator_name, platform, followers, views, created_at
    FROM creator_analytics
    ORDER BY id DESC
    LIMIT 5;
  `;

  return {
    service: "Postgres",
    success: true,
    dbInfo,
    inserted,
    recentCount: recentRecords.length,
    recentRecords,
  };
}

