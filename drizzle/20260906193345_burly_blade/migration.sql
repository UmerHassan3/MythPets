ALTER TABLE "orders" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "verification_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stock_released" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_expiry_idx" ON "orders" ("status","expires_at");