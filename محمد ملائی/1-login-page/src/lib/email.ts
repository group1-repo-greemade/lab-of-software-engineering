import "server-only";
import { randomBytes } from "node:crypto";

export function getAppUrl(fallbackOrigin: string) {
  const deploymentUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const value = process.env.APP_URL
    || deploymentUrl
    || (process.env.NODE_ENV === "production" ? "" : fallbackOrigin);
  if (!value) throw new Error("Application URL is not configured. Set APP_URL to the public site URL.");

  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("APP_URL must use HTTPS in production.");
  }
  return url;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export async function sendEmail(to: string, subject: string, heading: string, message: string, link: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:40px auto;padding:32px;color:#202a24"><p style="font-weight:700;color:#246248">MUHMOL</p><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(message)}</p><p style="margin:32px 0"><a href="${escapeHtml(link)}" style="background:#246248;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none">${escapeHtml(heading)}</a></p><p style="font-size:13px;color:#77827a">If you didn’t request this, you can safely ignore this email.</p></main>`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend email delivery failed:", response.status, detail);
    throw new Error("Email delivery is temporarily unavailable. Please try again later.");
  }
}

export function createEmailToken() {
  return randomBytes(32).toString("base64url");
}
