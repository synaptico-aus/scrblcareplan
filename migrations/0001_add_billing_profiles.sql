CREATE TABLE "organization_billing_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"contact_name" text,
	"company_name" text,
	"address_line1" text,
	"address_line2" text,
	"suburb" text,
	"state" text,
	"postcode" text,
	"email" text,
	"phone" text,
	"abn" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organization_billing_profiles_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "organization_billing_profiles" ADD CONSTRAINT "organization_billing_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_billing_org" ON "organization_billing_profiles" USING btree ("organization_id");