import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { reportSectionsTable } from './report-sections';
import { projectMspAdvertisersTable } from './project-msp-advertisers';
import { projectMetaAccountsTable } from './project-meta-accounts';
import { projectTiktokAccountsTable } from './project-tiktok-accounts';
import { projectGoogleAdsAccountsTable } from './project-google-ads-accounts';
import { projectLineAccountsTable } from './project-line-accounts';
import { reportUpdatesTable } from './report-updates';

export const projectReportTypeEnum = pgEnum('project_report_type', ['budget', 'performance']);

export const reportProjectsTable = pgTable(
  'report_projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    project_name: text('project_name').notNull(),
    total_report_type: projectReportTypeEnum('total_report_type').notNull().default('budget'),
    performance_unit_price: doublePrecision('performance_unit_price'),
    project_color: text('project_color').default('#2A9CFF'),
    project_icon_path: text('project_icon_path'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectNameKey: uniqueIndex('report_projects_project_name_key').on(table.project_name),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const reportProjectsPolicy = pgPolicy('report_projects_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(reportProjectsTable);

export type ReportProjectRow = typeof reportProjectsTable.$inferSelect;
export type InsertReportProjectRow = typeof reportProjectsTable.$inferInsert;

export const reportProjectsRelations = relations(reportProjectsTable, ({ many }) => ({
  sections: many(reportSectionsTable),
  mspAdvertisers: many(projectMspAdvertisersTable),
  metaAccounts: many(projectMetaAccountsTable),
  tiktokAccounts: many(projectTiktokAccountsTable),
  googleAdsAccounts: many(projectGoogleAdsAccountsTable),
  lineAccounts: many(projectLineAccountsTable),
  reportUpdates: many(reportUpdatesTable),
}));
