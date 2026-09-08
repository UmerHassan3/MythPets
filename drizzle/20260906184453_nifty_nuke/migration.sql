ALTER TABLE "order_items" DROP CONSTRAINT "order_items_order_id_orders_id_fkey";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_payment_method_id_payment_methods_id_fkey";--> statement-breakpoint
DROP TABLE "order_items";--> statement-breakpoint
DROP TABLE "orders";--> statement-breakpoint
DROP TABLE "payment_methods";