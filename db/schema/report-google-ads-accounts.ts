import { relations } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { projectGoogleAdsAccountsTable } from './project-google-ads-accounts';

export const reportGoogleAdsAccountsTable = pgTable('report_google_ads_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  customer_id: text('customer_id').notNull().unique(),
  display_name: text('display_name').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

const allowServiceRole = sql`true`;

export const reportGoogleAdsAccountsPolicy = pgPolicy('report_google_ads_accounts_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(reportGoogleAdsAccountsTable);

export const reportGoogleAdsAccountsRelations = relations(reportGoogleAdsAccountsTable, ({ many }) => ({
  projects: many(projectGoogleAdsAccountsTable),
}));

export type ReportGoogleAdsAccountRow = typeof reportGoogleAdsAccountsTable.$inferSelect;
export type InsertReportGoogleAdsAccountRow = typeof reportGoogleAdsAccountsTable.$inferInsert;
