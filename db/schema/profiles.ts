import {
  pgEnum,
  pgPolicy,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';

export const appRoleEnum = pgEnum('app_role', ['admin', 'agent']);

export const profilesTable = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    role: appRoleEnum('role').notNull(),
    sectionId: varchar('section_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
).enableRLS();

export type ProfileRow = typeof profilesTable.$inferSelect;
export type InsertProfileRow = typeof profilesTable.$inferInsert;

const isOwner = sql`${profilesTable.id} = auth.uid()`;

export const profilesSelectPolicy = pgPolicy('profiles_select_self', {
  for: 'select',
  to: authenticatedRole,
  using: isOwner,
}).link(profilesTable);

export const profilesInsertPolicy = pgPolicy('profiles_insert_self', {
  for: 'insert',
  to: authenticatedRole,
  withCheck: isOwner,
}).link(profilesTable);

export const profilesUpdatePolicy = pgPolicy('profiles_update_self', {
  for: 'update',
  to: authenticatedRole,
  using: isOwner,
  withCheck: isOwner,
}).link(profilesTable);
