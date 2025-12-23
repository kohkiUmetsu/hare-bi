import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceRole } from 'drizzle-orm/supabase';
import { reportSectionsTable } from './report-sections';

const emptyTextArray = sql`ARRAY[]::text[]`;

export const platformReportTypeEnum = pgEnum('platform_report_type', ['budget', 'performance']);

export const reportPlatformSettingsTable = pgTable(
  'report_platform_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    section_id: uuid('section_id')
      .notNull()
      .references(() => reportSectionsTable.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(), // Meta, TikTok, Google, LINE
    report_type: platformReportTypeEnum('report_type').notNull().default('budget'),
    fee_settings: jsonb('fee_settings').notNull().default(sql`'{}'::jsonb`),
    agency_unit_price: doublePrecision('agency_unit_price'),
    internal_unit_price: doublePrecision('internal_unit_price'),
    gross_profit_fee: doublePrecision('gross_profit_fee').notNull().default(0),
    msp_link_prefixes: text('msp_link_prefixes').array().notNull().default(emptyTextArray),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sectionPlatformKey: uniqueIndex('report_platform_settings_section_platform_key').on(
      table.section_id,
      table.platform
    ),
  })
).enableRLS();

const allowServiceRole = sql`true`;

export const reportPlatformSettingsPolicy = pgPolicy('report_platform_settings_service_rw', {
  for: 'all',
  to: serviceRole,
  using: allowServiceRole,
  withCheck: allowServiceRole,
}).link(reportPlatformSettingsTable);

export type ReportPlatformSettingRow = typeof reportPlatformSettingsTable.$inferSelect;
export type InsertReportPlatformSettingRow = typeof reportPlatformSettingsTable.$inferInsert;

export const reportPlatformSettingsRelations = relations(reportPlatformSettingsTable, ({ one }) => ({
  section: one(reportSectionsTable, {
    fields: [reportPlatformSettingsTable.section_id],
    references: [reportSectionsTable.id],
  }),
}));

