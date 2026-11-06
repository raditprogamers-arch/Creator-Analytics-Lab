export interface SyncResult {
  success: boolean;
  accountId: number;
  platformName: string;
  itemsProcessed: number;
  newItemsCreated: number;
  snapshotsCreated: number;
  syncedAt: string;
  error?: string;
}

export interface PlatformConfig {
  clientId?: string;
  clientSecret?: string;
  isConfigured: boolean;
  redirectUri: string;
}

