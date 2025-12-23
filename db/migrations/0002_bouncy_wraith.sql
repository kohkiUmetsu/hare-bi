CREATE TYPE "public"."project_report_type" AS ENUM('budget', 'performance');--> statement-breakpoint
CREATE TYPE "public"."section_report_type" AS ENUM('budget', 'performance');--> statement-breakpoint
CREATE TABLE "report_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_name" text NOT NULL,
	"total_report_type" "project_report_type" DEFAULT 'budget' NOT NULL,
	"performance_unit_price" double precision,
	"default_fee_rate" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_name" text NOT NULL,
	"project_id" uuid NOT NULL,
	"billing_type" text NOT NULL,
	"report_type" "section_report_type" DEFAULT 'budget' NOT NULL,
	"platforms" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"msp_prefixes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"campaign_prefixes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"campaign_keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"catch_all_msp" boolean DEFAULT false NOT NULL,
	"catch_all_campaign" boolean DEFAULT false NOT NULL,
	"gross_profit_fee" double precision DEFAULT 0 NOT NULL,
	"fee_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"agency_unit_price" double precision,
	"internal_unit_price" double precision,
	"in_house_operation" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_sections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_prefix_master" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prefix" text NOT NULL,
	"platform_label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_prefix_master" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_section_prefix_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"prefix_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_section_prefix_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_msp_advertisers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"buyer_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_msp_advertisers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_meta_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_meta_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_tiktok_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" text NOT NULL,
	"advertiser_name" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_tiktok_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_google_ads_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text NOT NULL,
	"display_name" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_google_ads_accounts_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
ALTER TABLE "report_google_ads_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_line_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"display_name" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_line_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"status" text NOT NULL,
	"error_reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_updates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "report_sections" ADD CONSTRAINT "report_sections_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_section_prefix_assignments" ADD CONSTRAINT "report_section_prefix_assignments_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_section_prefix_assignments" ADD CONSTRAINT "report_section_prefix_assignments_section_id_report_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."report_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_section_prefix_assignments" ADD CONSTRAINT "report_section_prefix_assignments_prefix_id_report_prefix_master_id_fk" FOREIGN KEY ("prefix_id") REFERENCES "public"."report_prefix_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_msp_advertisers" ADD CONSTRAINT "report_msp_advertisers_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_meta_accounts" ADD CONSTRAINT "report_meta_accounts_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_tiktok_accounts" ADD CONSTRAINT "report_tiktok_accounts_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_google_ads_accounts" ADD CONSTRAINT "report_google_ads_accounts_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_line_accounts" ADD CONSTRAINT "report_line_accounts_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_updates" ADD CONSTRAINT "report_updates_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_projects_project_name_key" ON "report_projects" USING btree ("project_name");--> statement-breakpoint
CREATE UNIQUE INDEX "report_sections_identity_key" ON "report_sections" USING btree ("section_name","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_prefix_master_prefix_key" ON "report_prefix_master" USING btree ("prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "report_meta_accounts_account_id_key" ON "report_meta_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_tiktok_accounts_advertiser_id_key" ON "report_tiktok_accounts" USING btree ("advertiser_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_line_accounts_account_id_key" ON "report_line_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_updates_project_date_range_key" ON "report_updates" USING btree ("project_id","start_date","end_date");--> statement-breakpoint
CREATE POLICY "report_projects_service_rw" ON "report_projects" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "report_sections_service_rw" ON "report_sections" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "report_prefix_master_service_rw" ON "report_prefix_master" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "report_section_prefix_assignments_service_rw" ON "report_section_prefix_assignments" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "report_msp_advertisers_service_rw" ON "report_msp_advertisers" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "report_meta_accounts_service_rw" ON "report_meta_accounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "report_tiktok_accounts_service_rw" ON "report_tiktok_accounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "report_google_ads_accounts_service_rw" ON "report_google_ads_accounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "report_line_accounts_service_rw" ON "report_line_accounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "report_updates_service_rw" ON "report_updates" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);