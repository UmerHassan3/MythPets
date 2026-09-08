ALTER TABLE "orders" ADD COLUMN "payment_amount" numeric(20,8);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_asset" text;