CREATE TABLE "project_msp_advertisers" (
	"project_id" uuid NOT NULL,
	"advertiser_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_msp_advertisers_project_id_advertiser_id_pk" PRIMARY KEY("project_id","advertiser_id")
);
--> statement-breakpoint
ALTER TABLE "project_msp_advertisers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_meta_accounts" (
	"project_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_meta_accounts_project_id_account_id_pk" PRIMARY KEY("project_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "project_meta_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_tiktok_accounts" (
	"project_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_tiktok_accounts_project_id_account_id_pk" PRIMARY KEY("project_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "project_tiktok_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_google_ads_accounts" (
	"project_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_google_ads_accounts_project_id_account_id_pk" PRIMARY KEY("project_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "project_google_ads_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_line_accounts" (
	"project_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_line_accounts_project_id_account_id_pk" PRIMARY KEY("project_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "project_line_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "report_msp_advertisers" DROP CONSTRAINT "report_msp_advertisers_project_id_report_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "report_meta_accounts" DROP CONSTRAINT "report_meta_accounts_project_id_report_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "report_tiktok_accounts" DROP CONSTRAINT "report_tiktok_accounts_project_id_report_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "report_google_ads_accounts" DROP CONSTRAINT "report_google_ads_accounts_project_id_report_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "report_line_accounts" DROP CONSTRAINT "report_line_accounts_project_id_report_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "project_msp_advertisers" ADD CONSTRAINT "project_msp_advertisers_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_msp_advertisers" ADD CONSTRAINT "project_msp_advertisers_advertiser_id_report_msp_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."report_msp_advertisers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_meta_accounts" ADD CONSTRAINT "project_meta_accounts_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_meta_accounts" ADD CONSTRAINT "project_meta_accounts_account_id_report_meta_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."report_meta_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tiktok_accounts" ADD CONSTRAINT "project_tiktok_accounts_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tiktok_accounts" ADD CONSTRAINT "project_tiktok_accounts_account_id_report_tiktok_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."report_tiktok_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_google_ads_accounts" ADD CONSTRAINT "project_google_ads_accounts_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_google_ads_accounts" ADD CONSTRAINT "project_google_ads_accounts_account_id_report_google_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."report_google_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_line_accounts" ADD CONSTRAINT "project_line_accounts_project_id_report_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_line_accounts" ADD CONSTRAINT "project_line_accounts_account_id_report_line_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."report_line_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_msp_advertisers" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "report_meta_accounts" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "report_tiktok_accounts" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "report_google_ads_accounts" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "report_line_accounts" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "report_msp_advertisers" ADD CONSTRAINT "report_msp_advertisers_buyer_id_unique" UNIQUE("buyer_id");--> statement-breakpoint
CREATE POLICY "project_msp_advertisers_service_rw" ON "project_msp_advertisers" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "project_meta_accounts_service_rw" ON "project_meta_accounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "project_tiktok_accounts_service_rw" ON "project_tiktok_accounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "project_google_ads_accounts_service_rw" ON "project_google_ads_accounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "project_line_accounts_service_rw" ON "project_line_accounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);