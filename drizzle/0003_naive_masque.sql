CREATE TYPE "public"."suppression_reason" AS ENUM('hard_bounce', 'unsubscribe', 'manual');--> statement-breakpoint
ALTER TYPE "public"."message_status" ADD VALUE 'suppressed';--> statement-breakpoint
ALTER TYPE "public"."message_status" ADD VALUE 'failed';--> statement-breakpoint
CREATE TABLE "suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"reason" "suppression_reason" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "marketing_opted_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "suppressions_shop_id_idx" ON "suppressions" USING btree ("shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppressions_shop_email_unique" ON "suppressions" USING btree ("shop_id","email");