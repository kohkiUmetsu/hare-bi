import { pgPolicy, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { reportProjectsTable } from './report-projects';
import { reportLineAccountsTable } from './report-line-accounts';
import { relations } from 'drizzle-orm';

export const projectLineAccountsTable = pgTable(
  'project_line_accounts',
  {
    project_id: uuid('project_id')
      .notNull()
      .references(() => reportProjectsTable.id, { onDelete: 'cascade' }),
    account_id: uuid('account_id')
      .notNull()
      .references(() => reportLineAccountsTable.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.project_id, table.account_id] }),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const projectLineAccountsPolicy = pgPolicy('project_line_accounts_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(projectLineAccountsTable);

export const projectLineAccountsRelations = relations(projectLineAccountsTable, ({ one }) => ({
  project: one(reportProjectsTable, {
    fields: [projectLineAccountsTable.project_id],
    references: [reportProjectsTable.id],
  }),
  account: one(reportLineAccountsTable, {
    fields: [projectLineAccountsTable.account_id],
    references: [reportLineAccountsTable.id],
  }),
}));

export type ProjectLineAccountRow = typeof projectLineAccountsTable.$inferSelect;
export type InsertProjectLineAccountRow = typeof projectLineAccountsTable.$inferInsert;
