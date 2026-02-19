CREATE TYPE "public"."action_type" AS ENUM('send_email', 'add_tag', 'remove_tag');--> statement-breakpoint
CREATE TYPE "public"."customer_segment" AS ENUM('champion', 'loyal', 'potential', 'new', 'at_risk', 'hibernating', 'lost');--> statement-breakpoint
CREATE TYPE "public"."financial_status" AS ENUM('pending', 'authorized', 'paid', 'refunded', 'voided');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sent', 'opened', 'clicked', 'converted');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('first_order', 'segment_change', 'days_since_order', 'tag_added', 'cart_abandoned');--> statement-breakpoint
CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"trigger_type" "trigger_type" NOT NULL,
	"trigger_config" jsonb,
	"delay_value" integer,
	"delay_unit" varchar(50),
	"action_type" "action_type" NOT NULL,
	"action_config" jsonb,
	"email_template_id" varchar(255),
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar(255) NOT NULL,
	"shopify_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"rfm_r" integer,
	"rfm_f" integer,
	"rfm_m" integer,
	"segment" "customer_segment",
	"lifecycle_stage" varchar(100),
	"tags" text[],
	"total_spent" numeric(19, 4),
	"order_count" integer DEFAULT 0,
	"avg_order_value" numeric(19, 4),
	"first_order_at" timestamp with time zone,
	"last_order_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar(255) NOT NULL,
	"customer_id" uuid,
	"automation_id" uuid,
	"channel" "message_channel" NOT NULL,
	"subject" varchar(500),
	"status" "message_status" NOT NULL,
	"sent_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar(255) NOT NULL,
	"shopify_id" varchar(255) NOT NULL,
	"customer_id" uuid,
	"total_price" numeric(19, 4),
	"line_items" jsonb,
	"financial_status" "financial_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automations_shop_id_idx" ON "automations" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "automations_enabled_idx" ON "automations" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "customers_shop_id_idx" ON "customers" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "customers_shopify_id_idx" ON "customers" USING btree ("shopify_id");--> statement-breakpoint
CREATE INDEX "customers_segment_idx" ON "customers" USING btree ("segment");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "message_logs_shop_id_idx" ON "message_logs" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "message_logs_customer_id_idx" ON "message_logs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "message_logs_automation_id_idx" ON "message_logs" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "message_logs_status_idx" ON "message_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_shop_id_idx" ON "orders" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");