import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createEmailToken, getAppUrl, sendEmail } from "@/lib/email";
import { getDatabase } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { allowRequest, getClientAddress, hashRateLimitKey, isSameOrigin } from "@/lib/security";

const emailSchema = z.object({ email: z.string().trim().email().max(320) });

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    const input = emailSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const email = input.data.email.toLowerCase();
    const address = getClientAddress(request);
    const ipKey = hashRateLimitKey(`verify-email-ip:${address}`);
    const accountKey = hashRateLimitKey(`verify-email-account:${address}:${email}`);
    if (!await allowRequest(ipKey, 20, 3600) || !await allowRequest(accountKey, 5, 3600)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sql = getDatabase();
    const users = await sql`
      SELECT id FROM users WHERE lower(email) = ${email} AND email_verified = false LIMIT 1
    `;
    const userId = z.string().uuid().nullable().parse(users[0]?.id ?? null);
    if (userId) {
      const token = createEmailToken();
      await sql`
        INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at)
        VALUES (${hashToken(token)}, ${userId}, 'verify_email', now() + interval '24 hours')
        ON CONFLICT (user_id, purpose) DO UPDATE SET
          token_hash = EXCLUDED.token_hash,
          expires_at = EXCLUDED.expires_at,
          created_at = now()
      `;
      const verifyUrl = new URL("/verify-email/", getAppUrl(request.nextUrl.origin));
      verifyUrl.searchParams.set("token", token);
      await sendEmail(
        email,
        "Confirm your Muhmol account",
        "Confirm your email",
        "Use this secure link to verify your email address and activate your account. The link expires in 24 hours.",
        verifyUrl.toString(),
      );
    }

    return NextResponse.json({
      message: "If an unverified account exists for that email, a confirmation link is on its way.",
    });
  } catch (error) {
    console.error("Verification email resend failed:", error);
    return NextResponse.json({ error: "Unable to resend the verification email right now." }, { status: 503 });
  }
}
