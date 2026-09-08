/**
 * Verifies SMTP credentials, and optionally sends the real templates.
 *
 *   npm run mail:check                  -- credentials only, sends nothing
 *   npm run mail:check -- you@mail.com  -- also sends both emails there
 */
import { config } from "dotenv";
config({ path: ".env" });

const { verifyMailer, sendMail, ADMIN_ALERT_EMAIL } = await import("@/lib/email/mailer");
const { welcomeEmail, newOrderEmail } = await import("@/lib/email/templates");

console.log("host:", process.env.SMTP_HOST, "port:", process.env.SMTP_PORT);
console.log("user:", process.env.SMTP_USER || "(not set)");
console.log("alerts to:", ADMIN_ALERT_EMAIL);

const result = await verifyMailer();

if (!result.ok) {
  console.log(`\nFAIL  SMTP not usable: ${result.reason}`);
  process.exit(1);
}

console.log("\nPASS  SMTP credentials accepted");

const target = process.argv[2];
if (!target) {
  console.log("\n(no address given — nothing sent. Pass one to send test mail.)");
  process.exit(0);
}

console.log(`\nsending both templates to ${target}…`);

const welcome = await sendMail({ to: target, ...welcomeEmail("Test Customer") });
console.log(`  welcome email:   ${welcome ? "sent" : "FAILED"}`);

const alert = await sendMail({
  to: target,
  ...newOrderEmail({
    orderId: "00000000-1111-2222-3333-444444444444",
    customerName: "Test Customer",
    customerEmail: "customer@example.com",
    robloxUsername: "MythPetsTrader",
    total: "$24.99",
    paymentAmount: "24.990473",
    paymentAsset: "USDT",
    methodName: "USDT",
    txHash: "0x" + "a".repeat(64),
  }),
});
console.log(`  new-order alert: ${alert ? "sent" : "FAILED"}`);
process.exit(welcome && alert ? 0 : 1);
