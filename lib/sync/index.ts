import { syncYouTubeAccount } from "./youtube";
import { syncTikTokAccount } from "./tiktok";
import { syncInstagramAccount } from "./instagram";
import { db } from "../db";
import { connectedAccounts } from "../db/schema";
import { eq } from "drizzle-orm";
import { SyncResult } from "./types";

export async function syncConnectedAccount(accountId: number): Promise<SyncResult> {
  const [account] = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.id, accountId));

  if (!account) {
    throw new Error(`Connected account #${accountId} not found`);
  }

  const pName = account.platformName.toLowerCase();
  if (pName.includes("youtube")) {
    return syncYouTubeAccount(accountId);
  } else if (pName.includes("tiktok")) {
    return syncTikTokAccount(accountId);
  } else if (pName.includes("instagram")) {
    return syncInstagramAccount(accountId);
  } else {
    throw new Error(`Platform '${account.platformName}' automated sync is not supported.`);
  }
}

export * from "./types";
export * from "./youtube";
export * from "./tiktok";
export * from "./instagram";

