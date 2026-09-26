-- Unbuilt schema for Supabase (project "unbuilt", ref ftsrfnkiiewkturuqgiu).
-- Run once in Supabase Dashboard -> SQL Editor. Generated from lib/db/schema.ts.
--
-- STARTS FRESH: the first two statements drop the five old, EMPTY tables (businesses, leads, scans,
-- settings, sites) that the project was created with. Nothing else in the project is touched.

DROP TABLE IF EXISTS public.sites, public.leads, public.scans, public.settings, public.businesses CASCADE;
DROP TYPE IF EXISTS public.lead_status, public.site_status, public.website_status, public.user_role CASCADE;

CREATE TYPE "public"."lead_status" AS ENUM('not_contacted', 'quoted', 'won', 'lost');
CREATE TYPE "public"."site_status" AS ENUM('draft', 'sent', 'live');
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'rep');
CREATE TYPE "public"."website_status" AS ENUM('none', 'social', 'real', 'unknown');
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"category_label" text,
	"types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"phone" text,
	"website_raw" text,
	"website_status" "website_status" DEFAULT 'unknown' NOT NULL,
	"rating" real,
	"review_count" integer DEFAULT 0 NOT NULL,
	"photo_count" integer DEFAULT 0 NOT NULL,
	"business_status" text,
	"hours_json" jsonb,
	"photos_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"score_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_json" jsonb,
	"first_scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_place_id_unique" UNIQUE("place_id")
);

CREATE TABLE "dnc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"reason" text,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dnc_phone_unique" UNIQUE("phone")
);

CREATE TABLE "lead_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "lead_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by" uuid NOT NULL,
	"niche" text NOT NULL,
	"area" text,
	"quantity" integer DEFAULT 20 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"manager_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);

CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "lead_status" DEFAULT 'not_contacted' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"stage" text DEFAULT 'new' NOT NULL,
	"assigned_to" uuid,
	"assigned_at" timestamp with time zone,
	"next_follow_up" timestamp with time zone,
	"pitch_text" text,
	"project_value" integer,
	"commission_paid" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_business_id_unique" UNIQUE("business_id")
);

CREATE TABLE "push_subs" (
	"endpoint" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL
);

CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"radius_m" integer NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"api_calls" integer DEFAULT 0 NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"new_count" integer DEFAULT 0 NOT NULL,
	"mock" boolean DEFAULT true NOT NULL
);

CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"places_api_key_enc" text,
	"llm_provider" text DEFAULT 'gemini' NOT NULL,
	"llm_api_key_enc" text,
	"mapbox_token" text,
	"priority_categories" jsonb DEFAULT '["restaurant","cafe","bakery","bar","hair_salon","beauty_salon","nail_salon","spa","gym","fitness_center","general_contractor","electrician","plumber","painter","roofing_contractor","doctor","dentist","physiotherapist","veterinary_care"]'::jsonb NOT NULL,
	"scoring_weights" jsonb DEFAULT '{"noWebsite":50,"socialOnly":20,"fewPhotos":10,"underMarketed":10,"priorityCategory":10}'::jsonb NOT NULL,
	"default_quote_min" integer DEFAULT 2000 NOT NULL,
	"default_quote_max" integer DEFAULT 3000 NOT NULL,
	"pin_hash" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"template" text NOT NULL,
	"theme" text DEFAULT 'warm' NOT NULL,
	"motion" text DEFAULT 'subtle' NOT NULL,
	"brief" text DEFAULT '' NOT NULL,
	"content_json" jsonb NOT NULL,
	"photos_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quote_price" integer DEFAULT 2500 NOT NULL,
	"status" "site_status" DEFAULT 'draft' NOT NULL,
	"published_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_slug_unique" UNIQUE("slug")
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "user_role" DEFAULT 'rep' NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text,
	"commission_pct" integer DEFAULT 10 NOT NULL,
	"daily_target" integer DEFAULT 15 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

ALTER TABLE "dnc" ADD CONSTRAINT "dnc_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "lead_requests" ADD CONSTRAINT "lead_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "push_subs" ADD CONSTRAINT "push_subs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sites" ADD CONSTRAINT "sites_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "businesses_score_idx" ON "businesses" USING btree ("score");
CREATE INDEX "businesses_category_idx" ON "businesses" USING btree ("category");
CREATE INDEX "businesses_geo_idx" ON "businesses" USING btree ("lat","lng");
CREATE INDEX "lead_activity_lead_idx" ON "lead_activity" USING btree ("lead_id");
CREATE INDEX "lead_activity_user_idx" ON "lead_activity" USING btree ("user_id","created_at");

-- The app connects with the server-side postgres role, which bypasses RLS. Enabling RLS with no
-- policies locks every table against the public anon / authenticated API keys.
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
