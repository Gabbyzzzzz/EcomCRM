CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"html" text,
	"design_json" jsonb,
	"is_preset" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_templates_shop_id_idx" ON "email_templates" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "email_templates_is_preset_idx" ON "email_templates" USING btree ("is_preset");