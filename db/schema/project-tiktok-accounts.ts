import { pgPolicy, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { reportProjectsTable } from './report-projects';
import { reportTiktokAccountsTable } from './report-tiktok-accounts';
import { relations } from 'drizzle-orm';

export const projectTiktokAccountsTable = pgTable(
  'project_tiktok_accounts',
  {
    project_id: uuid('project_id')
      .notNull()
      .references(() => reportProjectsTable.id, { onDelete: 'cascade' }),
    account_id: uuid('account_id')
      .notNull()
      .references(() => reportTiktokAccountsTable.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.project_id, table.account_id] }),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const projectTiktokAccountsPolicy = pgPolicy('project_tiktok_accounts_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(projectTiktokAccountsTable);

export const projectTiktokAccountsRelations = relations(projectTiktokAccountsTable, ({ one }) => ({
  project: one(reportProjectsTable, {
    fields: [projectTiktokAccountsTable.project_id],
    references: [reportProjectsTable.id],
  }),
  account: one(reportTiktokAccountsTable, {
    fields: [projectTiktokAccountsTable.account_id],
    references: [reportTiktokAccountsTable.id],
  }),
}));

export type ProjectTiktokAccountRow = typeof projectTiktokAccountsTable.$inferSelect;
export type InsertProjectTiktokAccountRow = typeof projectTiktokAccountsTable.$inferInsert;
