import { relations } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { projectMetaAccountsTable } from './project-meta-accounts';

export const reportMetaAccountsTable = pgTable(
  'report_meta_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    account_id: text('account_id').notNull(),
    account_name: text('account_name').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    accountIdUnique: uniqueIndex('report_meta_accounts_account_id_key').on(table.account_id),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const reportMetaAccountsPolicy = pgPolicy('report_meta_accounts_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(reportMetaAccountsTable);

export const reportMetaAccountsRelations = relations(reportMetaAccountsTable, ({ many }) => ({
  projects: many(projectMetaAccountsTable),
}));

export type ReportMetaAccountRow = typeof reportMetaAccountsTable.$inferSelect;
export type InsertReportMetaAccountRow = typeof reportMetaAccountsTable.$inferInsert;
