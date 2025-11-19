import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from './db';
import { InsertProfileRow, ProfileRow, profilesTable } from '@/db/schema';

export async function upsertProfile(profile: InsertProfileRow) {
  await db
    .insert(profilesTable)
    .values(profile)
    .onConflictDoUpdate({
      target: profilesTable.id,
      set: {
        email: profile.email,
        role: profile.role,
        sectionId: profile.sectionId,
      },
    });
}

export async function listAgents(): Promise<ProfileRow[]> {
  return db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.role, 'agent'))
    .orderBy(asc(profilesTable.email));
}
