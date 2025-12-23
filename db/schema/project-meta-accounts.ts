import { pgPolicy, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { reportProjectsTable } from './report-projects';
import { reportMetaAccountsTable } from './report-meta-accounts';
import { relations } from 'drizzle-orm';

export const projectMetaAccountsTable = pgTable(
  'project_meta_accounts',
  {
    project_id: uuid('project_id')
      .notNull()
      .references(() => reportProjectsTable.id, { onDelete: 'cascade' }),
    account_id: uuid('account_id')
      .notNull()
      .references(() => reportMetaAccountsTable.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.project_id, table.account_id] }),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const projectMetaAccountsPolicy = pgPolicy('project_meta_accounts_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(projectMetaAccountsTable);

export const projectMetaAccountsRelations = relations(projectMetaAccountsTable, ({ one }) => ({
  project: one(reportProjectsTable, {
    fields: [projectMetaAccountsTable.project_id],
    references: [reportProjectsTable.id],
  }),
  account: one(reportMetaAccountsTable, {
    fields: [projectMetaAccountsTable.account_id],
    references: [reportMetaAccountsTable.id],
  }),
}));

export type ProjectMetaAccountRow = typeof projectMetaAccountsTable.$inferSelect;
export type InsertProjectMetaAccountRow = typeof projectMetaAccountsTable.$inferInsert;
