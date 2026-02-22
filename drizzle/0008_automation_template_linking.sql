-- Phase 14-01: Add template linking columns to automations table
-- linked_email_template_id: UUID FK to email_templates (Tier 2 fallback)
-- custom_template_html:     Flow-specific HTML override (Tier 1, highest priority)
-- custom_template_json:     Flow-specific Unlayer design JSON (stored alongside HTML)

ALTER TABLE "automations" ADD COLUMN "linked_email_template_id" uuid REFERENCES "email_templates"("id");
ALTER TABLE "automations" ADD COLUMN "custom_template_html" text;
ALTER TABLE "automations" ADD COLUMN "custom_template_json" jsonb;
