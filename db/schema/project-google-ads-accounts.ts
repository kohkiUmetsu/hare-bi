import { pgPolicy, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { reportProjectsTable } from './report-projects';
import { reportGoogleAdsAccountsTable } from './report-google-ads-accounts';
import { relations } from 'drizzle-orm';

export const projectGoogleAdsAccountsTable = pgTable(
  'project_google_ads_accounts',
  {
    project_id: uuid('project_id')
      .notNull()
      .references(() => reportProjectsTable.id, { onDelete: 'cascade' }),
    account_id: uuid('account_id')
      .notNull()
      .references(() => reportGoogleAdsAccountsTable.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.project_id, table.account_id] }),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const projectGoogleAdsAccountsPolicy = pgPolicy('project_google_ads_accounts_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(projectGoogleAdsAccountsTable);

export const projectGoogleAdsAccountsRelations = relations(projectGoogleAdsAccountsTable, ({ one }) => ({
  project: one(reportProjectsTable, {
    fields: [projectGoogleAdsAccountsTable.project_id],
    references: [reportProjectsTable.id],
  }),
  account: one(reportGoogleAdsAccountsTable, {
    fields: [projectGoogleAdsAccountsTable.account_id],
    references: [reportGoogleAdsAccountsTable.id],
  }),
}));

export type ProjectGoogleAdsAccountRow = typeof projectGoogleAdsAccountsTable.$inferSelect;
export type InsertProjectGoogleAdsAccountRow = typeof projectGoogleAdsAccountsTable.$inferInsert;
