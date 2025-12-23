import { relations } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { projectLineAccountsTable } from './project-line-accounts';

export const reportLineAccountsTable = pgTable(
  'report_line_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    account_id: text('account_id').notNull(),
    display_name: text('display_name').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    lineAccountIdUnique: uniqueIndex('report_line_accounts_account_id_key').on(table.account_id),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const reportLineAccountsPolicy = pgPolicy('report_line_accounts_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(reportLineAccountsTable);

export const reportLineAccountsRelations = relations(reportLineAccountsTable, ({ many }) => ({
  projects: many(projectLineAccountsTable),
}));

export type ReportLineAccountRow = typeof reportLineAccountsTable.$inferSelect;
export type InsertReportLineAccountRow = typeof reportLineAccountsTable.$inferInsert;
