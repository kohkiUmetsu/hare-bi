CREATE TYPE "public"."platform_report_type" AS ENUM('budget', 'performance');--> statement-breakpoint
CREATE TABLE "report_platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"report_type" "platform_report_type" DEFAULT 'budget' NOT NULL,
	"fee_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"agency_unit_price" double precision,
	"internal_unit_price" double precision,
	"gross_profit_fee" double precision DEFAULT 0 NOT NULL,
	"msp_link_prefixes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_platform_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "report_prefix_master_service_rw" ON "report_prefix_master" CASCADE;--> statement-breakpoint
DROP TABLE "report_prefix_master" CASCADE;--> statement-breakpoint
DROP POLICY "report_section_prefix_assignments_service_rw" ON "report_section_prefix_assignments" CASCADE;--> statement-breakpoint
DROP TABLE "report_section_prefix_assignments" CASCADE;--> statement-breakpoint
ALTER TABLE "report_platform_settings" ADD CONSTRAINT "report_platform_settings_section_id_report_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."report_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_platform_settings_section_platform_key" ON "report_platform_settings" USING btree ("section_id","platform");--> statement-breakpoint
ALTER TABLE "report_projects" DROP COLUMN "default_fee_rate";--> statement-breakpoint
ALTER TABLE "report_sections" DROP COLUMN "billing_type";--> statement-breakpoint
ALTER TABLE "report_sections" DROP COLUMN "report_type";--> statement-breakpoint
ALTER TABLE "report_sections" DROP COLUMN "platforms";--> statement-breakpoint
ALTER TABLE "report_sections" DROP COLUMN "gross_profit_fee";--> statement-breakpoint
ALTER TABLE "report_sections" DROP COLUMN "fee_settings";--> statement-breakpoint
ALTER TABLE "report_sections" DROP COLUMN "agency_unit_price";--> statement-breakpoint
ALTER TABLE "report_sections" DROP COLUMN "internal_unit_price";--> statement-breakpoint
CREATE POLICY "report_platform_settings_service_rw" ON "report_platform_settings" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP TYPE "public"."section_report_type";