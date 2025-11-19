CREATE TYPE "public"."app_role" AS ENUM('admin', 'agent');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "app_role" NOT NULL,
	"section_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "profiles_insert_self" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("profiles"."id" = auth.uid());--> statement-breakpoint
CREATE POLICY "profiles_select_self_or_admin" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."id" = auth.uid() or exists (
  select 1
  from "profiles" admin_profile
  where admin_profile.id = auth.uid()
    and admin_profile.role = 'admin'
));--> statement-breakpoint
CREATE POLICY "profiles_update_self_or_admin" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("profiles"."id" = auth.uid() or exists (
  select 1
  from "profiles" admin_profile
  where admin_profile.id = auth.uid()
    and admin_profile.role = 'admin'
)) WITH CHECK ("profiles"."id" = auth.uid() or exists (
  select 1
  from "profiles" admin_profile
  where admin_profile.id = auth.uid()
    and admin_profile.role = 'admin'
));