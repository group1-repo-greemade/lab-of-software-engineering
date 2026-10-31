import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === request.nextUrl.origin;
}

export function getClientAddress(request: NextRequest) {
  return request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

export function hashRateLimitKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function allowRequest(key: string, maxAttempts: number, windowSeconds: number) {
  const sql = getDatabase();
  const rows = await sql`
    INSERT INTO auth_rate_limits (key, window_started_at, attempts)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE
        WHEN auth_rate_limits.window_started_at < now() - (${windowSeconds} * interval '1 second') THEN 1
        ELSE auth_rate_limits.attempts + 1
      END,
      window_started_at = CASE
        WHEN auth_rate_limits.window_started_at < now() - (${windowSeconds} * interval '1 second') THEN now()
        ELSE auth_rate_limits.window_started_at
      END
    RETURNING attempts
  `;

  const attempts = z.number().int().positive().parse(rows[0]?.attempts ?? maxAttempts + 1);
  return attempts <= maxAttempts;
}

export async function verifyTurnstile(request: NextRequest, token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error("Sign-up is unavailable because CAPTCHA verification is not configured.");

  const body = new URLSearchParams({ secret, response: token });
  const remoteIp = request.headers.get("x-real-ip");
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not verify CAPTCHA right now. Please try again.");
  }

  const result = z.object({
    success: z.boolean(),
    hostname: z.string().optional(),
  }).parse(await response.json());

  return result.success && result.hostname === request.nextUrl.hostname;
}
