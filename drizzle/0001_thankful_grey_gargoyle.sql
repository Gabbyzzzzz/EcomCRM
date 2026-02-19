CREATE TYPE "public"."sync_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" "sync_status" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"customers_count" integer DEFAULT 0,
	"orders_count" integer DEFAULT 0,
	"error_message" text,
	"cursor" text,
	"bulk_operation_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar(255) NOT NULL,
	"webhook_id" varchar(255) NOT NULL,
	"topic" varchar(100) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'processed' NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "shopify_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_historical" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shopify_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shopify_updated_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "sync_logs_shop_id_idx" ON "sync_logs" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "sync_logs_status_idx" ON "sync_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_logs_started_at_idx" ON "sync_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_shop_id_idx" ON "webhook_deliveries" USING btree ("shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_shop_webhook_unique_idx" ON "webhook_deliveries" USING btree ("shop_id","webhook_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_topic_idx" ON "webhook_deliveries" USING btree ("topic");