import { relations } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { reportProjectsTable } from './report-projects';

export const reportUpdatesTable = pgTable(
  'report_updates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => reportProjectsTable.id, { onDelete: 'cascade' }),
    start_date: text('start_date').notNull(),
    end_date: text('end_date').notNull(),
    status: text('status').notNull(),
    error_reason: text('error_reason').notNull().default(''),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectDateRangeKey: uniqueIndex('report_updates_project_date_range_key').on(
      table.project_id,
      table.start_date,
      table.end_date
    ),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const reportUpdatesPolicy = pgPolicy('report_updates_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(reportUpdatesTable);

export const reportUpdatesRelations = relations(reportUpdatesTable, ({ one }) => ({
  project: one(reportProjectsTable, {
    fields: [reportUpdatesTable.project_id],
    references: [reportProjectsTable.id],
  }),
}));

export type ReportUpdateRow = typeof reportUpdatesTable.$inferSelect;
export type InsertReportUpdateRow = typeof reportUpdatesTable.$inferInsert;
