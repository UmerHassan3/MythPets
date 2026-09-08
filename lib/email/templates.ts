// Server-only: composed and sent from server actions.

import { CONTACT_EMAIL, RESET_TTL_LABEL } from "@/lib/site";

/**
 * Email markup for the two messages MythPets sends.
 *
 * Written as inline-styled tables rather than modern CSS on purpose: Gmail
 * strips `<style>` blocks, and Outlook ignores flexbox and grid entirely. This
 * is the layout that survives both.
 */

const BRAND = "#dc2626";
const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";

/** Escapes anything a user supplied, so a name cannot inject markup. */
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      char
    ]!,
  );

const shell = (heading: string, body: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${LINE};border-radius:12px;overflow:hidden;">
      <tr><td style="background:${BRAND};padding:20px 28px;">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">MythPets</span>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:${INK};font-weight:700;">${heading}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid ${LINE};">
        <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">
          Questions? Reply to this email or write to
          <a href="mailto:${CONTACT_EMAIL}" style="color:${BRAND};">${CONTACT_EMAIL}</a>.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>`;

const paragraph = (text: string) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${INK};">${text}</p>`;

const button = (href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 4px;">
  <tr><td style="background:${BRAND};border-radius:8px;">
    <a href="${href}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
  </td></tr>
</table>`;

/** Absolute, because email clients cannot resolve a relative path. */
const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

export const welcomeEmail = (name: string) => {
  const safeName = escapeHtml(name.trim().split(/\s+/)[0] || "there");
  const url = siteUrl();

  return {
    subject: "Welcome to MythPets",
    html: shell(
      `Welcome, ${safeName}`,
      [
        paragraph("Your MythPets account is ready."),
        paragraph(
          "Browse the Adopt Me catalogue, add pets to your cart, and pay with USDT or Litecoin. Every payment is verified on-chain automatically, so orders confirm without waiting on anyone.",
        ),
        paragraph(
          `<strong>One thing worth knowing:</strong> we deliver in-game and will <strong>never</strong> ask for your Roblox password. Nobody from MythPets will request it, for any reason.`,
        ),
        url ? button(`${url}/adopt-me`, "Browse pets") : "",
      ].join(""),
    ),
    text: [
      `Welcome, ${safeName}`,
      "",
      "Your MythPets account is ready.",
      "",
      "Browse the Adopt Me catalogue, add pets to your cart, and pay with USDT or Litecoin. Every payment is verified on-chain automatically.",
      "",
      "One thing worth knowing: we deliver in-game and will NEVER ask for your Roblox password.",
      url ? `\nBrowse pets: ${url}/adopt-me` : "",
      "",
      `Questions? ${CONTACT_EMAIL}`,
    ].join("\n"),
  };
};

export const newOrderEmail = (order: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  robloxUsername: string;
  total: string;
  paymentAmount: string | null;
  paymentAsset: string | null;
  methodName: string | null;
  txHash: string;
}) => {
  const url = siteUrl();
  const short = order.orderId.slice(0, 8);

  const row = (label: string, value: string) => `
<tr>
  <td style="padding:7px 0;font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top;">${label}</td>
  <td style="padding:7px 0 7px 16px;font-size:13px;color:${INK};font-weight:600;word-break:break-all;">${value}</td>
</tr>`;

  const crypto =
    order.paymentAmount && order.paymentAsset
      ? `${escapeHtml(order.paymentAmount)} ${escapeHtml(order.paymentAsset)}`
      : "—";

  return {
    subject: `New order ${short} — payment submitted`,
    html: shell(
      "A customer has submitted a payment",
      [
        paragraph(
          "They have marked an order as paid. The transaction is being verified on-chain right now — open the admin panel to see the outcome.",
        ),
        `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};">
          ${row("Order", short)}
          ${row("Customer", escapeHtml(order.customerName))}
          ${row("Email", escapeHtml(order.customerEmail))}
          ${row("Roblox username", escapeHtml(order.robloxUsername))}
          ${row("Order total", escapeHtml(order.total))}
          ${row("Amount to receive", crypto)}
          ${row("Method", escapeHtml(order.methodName ?? "—"))}
          ${row("Transaction", escapeHtml(order.txHash))}
        </table>`,
        paragraph(
          `<span style="color:${MUTED};font-size:13px;">Deliver only once the order shows <strong>Ready to deliver</strong> in the admin panel. That status means the payment was confirmed on-chain — a submitted transaction on its own is not proof of payment.</span>`,
        ),
        url ? button(`${url}/admin/orders`, "Open admin panel") : "",
      ].join(""),
    ),
    text: [
      `New order ${short} — payment submitted`,
      "",
      "A customer has marked an order as paid. It is being verified on-chain now.",
      "",
      `Order:            ${short}`,
      `Customer:         ${order.customerName} <${order.customerEmail}>`,
      `Roblox username:  ${order.robloxUsername}`,
      `Order total:      ${order.total}`,
      `Amount to receive: ${order.paymentAmount ?? "—"} ${order.paymentAsset ?? ""}`,
      `Method:           ${order.methodName ?? "—"}`,
      `Transaction:      ${order.txHash}`,
      "",
      "Deliver only once the order shows 'Ready to deliver' in the admin panel.",
      "A submitted transaction on its own is not proof of payment.",
      url ? `\nAdmin panel: ${url}/admin/orders` : "",
    ].join("\n"),
  };
};

export const passwordResetEmail = (name: string, token: string) => {
  const safeName = escapeHtml(name.trim().split(/\s+/)[0] || "there");
  const url = siteUrl();
  const link = `${url}/reset-password?token=${token}`;

  return {
    subject: "Reset your MythPets password",
    html: shell(
      "Reset your password",
      [
        paragraph(`Hi ${safeName}, we received a request to reset your MythPets password.`),
        paragraph(
          `<strong>This link expires in ${RESET_TTL_LABEL}</strong>, so open it soon. If it lapses, just request another one.`,
        ),
        url ? button(link, "Choose a new password") : "",
        paragraph(
          `<span style="color:${MUTED};font-size:12px;">If the button does not work, paste this into your browser:<br><span style="word-break:break-all;">${link}</span></span>`,
        ),
        paragraph(
          `<span style="color:${MUTED};font-size:13px;">Didn't ask for this? Ignore this email — your password stays as it is, and the link works only once.</span>`,
        ),
      ].join(""),
    ),
    text: [
      `Hi ${safeName},`,
      "",
      "We received a request to reset your MythPets password.",
      `This link expires in ${RESET_TTL_LABEL}:`,
      "",
      link,
      "",
      "Didn't ask for this? Ignore this email — your password stays as it is,",
      "and the link works only once.",
    ].join("\n"),
  };
};
