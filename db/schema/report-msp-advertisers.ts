import { relations } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { projectMspAdvertisersTable } from './project-msp-advertisers';

export const reportMspAdvertisersTable = pgTable('report_msp_advertisers', {
  id: text('id').notNull().primaryKey(),
  buyer_id: text('buyer_id').notNull().unique(),
  name: text('name').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

const allowServiceRole = sql`true`;

export const reportMspAdvertisersPolicy = pgPolicy('report_msp_advertisers_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(reportMspAdvertisersTable);

export const reportMspAdvertisersRelations = relations(reportMspAdvertisersTable, ({ many }) => ({
  projects: many(projectMspAdvertisersTable),
}));

export type ReportMspAdvertiserRow = typeof reportMspAdvertisersTable.$inferSelect;
export type InsertReportMspAdvertiserRow = typeof reportMspAdvertisersTable.$inferInsert;
