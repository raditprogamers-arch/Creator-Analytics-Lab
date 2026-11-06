import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const platforms = pgTable("platforms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  platformType: varchar("platform_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contents = pgTable(
  "contents",
  {
    id: serial("id").primaryKey(),
    platformId: integer("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "cascade" }),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    contentType: varchar("content_type", { length: 50 }).notNull(),
    language: varchar("language", { length: 50 }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    contentUrl: varchar("content_url", { length: 1000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uq_content_platform_external_id").on(table.platformId, table.externalId),
    index("idx_contents_platform_published").on(table.platformId, table.publishedAt),
  ]
);

export const importHistory = pgTable("import_history", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  platformId: integer("platform_id").references(() => platforms.id, { onDelete: "set null" }),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
  totalRows: integer("total_rows").default(0).notNull(),
  successfulRows: integer("successful_rows").default(0).notNull(),
  rejectedRows: integer("rejected_rows").default(0).notNull(),
  importStatus: varchar("import_status", { length: 50 }).notNull(),
  errorSummary: text("error_summary"),
});

export const metricSnapshots = pgTable(
  "metric_snapshots",
  {
    id: serial("id").primaryKey(),
    contentId: integer("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    importId: integer("import_id").references(() => importHistory.id, { onDelete: "set null" }),
    metricName: varchar("metric_name", { length: 50 }).notNull(),
    metricValue: numeric("metric_value", { precision: 16, scale: 2 }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uq_metric_snapshot").on(table.contentId, table.metricName, table.capturedAt),
    index("idx_metric_content_name_time").on(table.contentId, table.metricName, table.capturedAt),
  ]
);

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: serial("id").primaryKey(),
    platformId: integer("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "cascade" }),
    platformName: varchar("platform_name", { length: 50 }).notNull(),
    accountIdentifier: varchar("account_identifier", { length: 255 }).notNull(),
    accountName: varchar("account_name", { length: 255 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    metadata: text("metadata"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncStatus: varchar("sync_status", { length: 50 }).default("idle").notNull(),
    syncError: text("sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uq_connected_platform_account").on(table.platformId, table.accountIdentifier),
  ]
);

// Drizzle Relations
export const platformsRelations = relations(platforms, ({ many }) => ({
  contents: many(contents),
  imports: many(importHistory),
  connectedAccounts: many(connectedAccounts),
}));

export const connectedAccountsRelations = relations(connectedAccounts, ({ one }) => ({
  platform: one(platforms, {
    fields: [connectedAccounts.platformId],
    references: [platforms.id],
  }),
}));

export const contentsRelations = relations(contents, ({ one, many }) => ({
  platform: one(platforms, {
    fields: [contents.platformId],
    references: [platforms.id],
  }),
  metricSnapshots: many(metricSnapshots),
}));

export const importHistoryRelations = relations(importHistory, ({ one, many }) => ({
  platform: one(platforms, {
    fields: [importHistory.platformId],
    references: [platforms.id],
  }),
  metricSnapshots: many(metricSnapshots),
}));

export const metricSnapshotsRelations = relations(metricSnapshots, ({ one }) => ({
  content: one(contents, {
    fields: [metricSnapshots.contentId],
    references: [contents.id],
  }),
  importRecord: one(importHistory, {
    fields: [metricSnapshots.importId],
    references: [importHistory.id],
  }),
}));

export type Platform = typeof platforms.$inferSelect;
export type NewPlatform = typeof platforms.$inferInsert;
export type Content = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;
export type ImportHistoryItem = typeof importHistory.$inferSelect;
export type NewImportHistoryItem = typeof importHistory.$inferInsert;
export type MetricSnapshot = typeof metricSnapshots.$inferSelect;
export type NewMetricSnapshot = typeof metricSnapshots.$inferInsert;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type NewConnectedAccount = typeof connectedAccounts.$inferInsert;

