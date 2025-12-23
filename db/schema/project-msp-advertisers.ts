import { pgPolicy, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { reportProjectsTable } from './report-projects';
import { reportMspAdvertisersTable } from './report-msp-advertisers';
import { relations } from 'drizzle-orm';

export const projectMspAdvertisersTable = pgTable(
  'project_msp_advertisers',
  {
    project_id: uuid('project_id')
      .notNull()
      .references(() => reportProjectsTable.id, { onDelete: 'cascade' }),
    advertiser_id: text('advertiser_id')
      .notNull()
      .references(() => reportMspAdvertisersTable.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.project_id, table.advertiser_id] }),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const projectMspAdvertisersPolicy = pgPolicy('project_msp_advertisers_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(projectMspAdvertisersTable);

export const projectMspAdvertisersRelations = relations(projectMspAdvertisersTable, ({ one }) => ({
  project: one(reportProjectsTable, {
    fields: [projectMspAdvertisersTable.project_id],
    references: [reportProjectsTable.id],
  }),
  advertiser: one(reportMspAdvertisersTable, {
    fields: [projectMspAdvertisersTable.advertiser_id],
    references: [reportMspAdvertisersTable.id],
  }),
}));

export type ProjectMspAdvertiserRow = typeof projectMspAdvertisersTable.$inferSelect;
export type InsertProjectMspAdvertiserRow = typeof projectMspAdvertisersTable.$inferInsert;
