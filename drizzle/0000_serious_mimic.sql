CREATE TYPE "public"."lead_status" AS ENUM('not_contacted', 'quoted', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."site_status" AS ENUM('draft', 'sent', 'live');--> statement-breakpoint
CREATE TYPE "public"."website_status" AS ENUM('none', 'social', 'real', 'unknown');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "lead_status" DEFAULT 'not_contacted' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"template" text NOT NULL,
	"theme" text DEFAULT 'warm' NOT NULL,
	"content_json" jsonb NOT NULL,
	"photos_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quote_price" integer DEFAULT 2500 NOT NULL,
	"status" "site_status" DEFAULT 'draft' NOT NULL,
	"published_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "businesses_score_idx" ON "businesses" USING btree ("score");--> statement-breakpoint
CREATE INDEX "businesses_category_idx" ON "businesses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "businesses_geo_idx" ON "businesses" USING btree ("lat","lng");