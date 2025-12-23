import { relations } from 'drizzle-orm';
import {
  boolean,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { reportProjectsTable } from './report-projects';
import { reportPlatformSettingsTable } from './report-platform-settings';

const emptyTextArray = sql`ARRAY[]::text[]`;

export const reportSectionsTable = pgTable(
  'report_sections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    section_name: text('section_name').notNull(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => reportProjectsTable.id, { onDelete: 'cascade' }),
    msp_prefixes: text('msp_prefixes').array().notNull().default(emptyTextArray),
    campaign_prefixes: text('campaign_prefixes').array().notNull().default(emptyTextArray),
    campaign_keywords: text('campaign_keywords').array().notNull().default(emptyTextArray),
    catch_all_msp: boolean('catch_all_msp').notNull().default(false),
    catch_all_campaign: boolean('catch_all_campaign').notNull().default(false),
    in_house_operation: boolean('in_house_operation').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sectionIdentityKey: uniqueIndex('report_sections_identity_key').on(
      table.section_name,
      table.project_id
    ),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const reportSectionsPolicy = pgPolicy('report_sections_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(reportSectionsTable);

export type ReportSectionRow = typeof reportSectionsTable.$inferSelect;
export type InsertReportSectionRow = typeof reportSectionsTable.$inferInsert;

export const reportSectionsRelations = relations(reportSectionsTable, ({ one, many }) => ({
  project: one(reportProjectsTable, {
    fields: [reportSectionsTable.project_id],
    references: [reportProjectsTable.id],
  }),
  platformSettings: many(reportPlatformSettingsTable),
}));
