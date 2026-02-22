CREATE TABLE "email_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar(255) NOT NULL,
	"message_log_id" uuid NOT NULL,
	"link_url" text NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_clicks" ADD CONSTRAINT "email_clicks_message_log_id_message_logs_id_fk" FOREIGN KEY ("message_log_id") REFERENCES "public"."message_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_clicks_shop_id_idx" ON "email_clicks" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "email_clicks_message_log_id_idx" ON "email_clicks" USING btree ("message_log_id");--> statement-breakpoint
CREATE INDEX "email_clicks_clicked_at_idx" ON "email_clicks" USING btree ("clicked_at");