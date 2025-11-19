DROP POLICY "profiles_select_self_or_admin" ON "profiles" CASCADE;--> statement-breakpoint
DROP POLICY "profiles_update_self_or_admin" ON "profiles" CASCADE;--> statement-breakpoint
CREATE POLICY "profiles_select_self" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."id" = auth.uid());--> statement-breakpoint
CREATE POLICY "profiles_update_self" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("profiles"."id" = auth.uid()) WITH CHECK ("profiles"."id" = auth.uid());