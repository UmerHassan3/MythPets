CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"network" text NOT NULL,
	"address" text NOT NULL,
	"note" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_network" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tx_hash" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tx_hash_unique" UNIQUE("tx_hash");--> statement-breakpoint
CREATE INDEX "orders_payment_method_id_idx" ON "orders" ("payment_method_id");--> statement-breakpoint
CREATE INDEX "payment_methods_active_sort_idx" ON "payment_methods" ("is_active","sort_order");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_method_id_payment_methods_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_status_valid", ADD CONSTRAINT "orders_status_valid" CHECK ("status" in ('pending', 'processing', 'paid', 'delivered', 'cancelled'));