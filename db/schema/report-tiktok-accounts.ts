import { relations } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { projectTiktokAccountsTable } from './project-tiktok-accounts';

export const reportTiktokAccountsTable = pgTable(
  'report_tiktok_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    advertiser_id: text('advertiser_id').notNull(),
    advertiser_name: text('advertiser_name').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    advertiserIdUnique: uniqueIndex('report_tiktok_accounts_advertiser_id_key').on(table.advertiser_id),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const reportTiktokAccountsPolicy = pgPolicy('report_tiktok_accounts_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(reportTiktokAccountsTable);

export const reportTiktokAccountsRelations = relations(reportTiktokAccountsTable, ({ many }) => ({
  projects: many(projectTiktokAccountsTable),
}));

export type ReportTiktokAccountRow = typeof reportTiktokAccountsTable.$inferSelect;
export type InsertReportTiktokAccountRow = typeof reportTiktokAccountsTable.$inferInsert;
