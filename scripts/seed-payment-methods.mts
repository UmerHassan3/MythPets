/**
 * Seeds the wallets MythPets accepts.
 *
 * Idempotent on `code` — re-running rotates the address in place rather than
 * inserting a duplicate, which is how an address is changed without a deploy.
 *
 * Run with: npm run db:seed-payments
 */
import { config } from "dotenv";

// Loaded before the pool module, which reads DATABASE_URL at import time.
config({ path: ".env" });

const { db } = await import("@/drizzle");
const { paymentMethods } = await import("@/Database/schema");

const METHODS = [
  {
    // Must match a verifier in lib/payments/verify.ts.
    code: "usdt_bep20",
    name: "USDT",
    network: "BEP-20 (BNB Smart Chain)",
    address: "0x98314b6639e50efc9b970da63371bf7739063283",
    note: "Send USDT on BNB Smart Chain (BEP-20) only.",
    sortOrder: 1,
  },
  {
    code: "ltc",
    name: "Litecoin",
    network: "Litecoin (LTC)",
    address: "ltc1qg2vvcqekjz8tm0lclckqzvxf4z7hymak62605l",
    note: "Send LTC on the Litecoin network only.",
    sortOrder: 2,
  },
];

for (const method of METHODS) {
  await db
    .insert(paymentMethods)
    .values(method)
    .onConflictDoUpdate({
      target: paymentMethods.code,
      set: {
        name: method.name,
        network: method.network,
        address: method.address,
        note: method.note,
        sortOrder: method.sortOrder,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  console.log(`OK ${method.code} -> ${method.address}`);
}

process.exit(0);
