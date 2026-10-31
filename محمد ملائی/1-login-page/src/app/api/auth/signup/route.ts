import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createEmailToken, getAppUrl, sendEmail } from "@/lib/email";
import { getDatabase } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/auth";
import { allowRequest, getClientAddress, hashRateLimitKey, isSameOrigin, verifyTurnstile } from "@/lib/security";

const signupSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  username: z.string().trim().regex(/^[A-Za-z0-9_]{3,24}$/),
  password: z.string().min(12).max(128),
  captchaToken: z.string().min(1).max(4096),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  const addressKey = hashRateLimitKey(`signup:${getClientAddress(request)}`);
  try {
    if (!await allowRequest(addressKey, 5, 3600)) {
      return NextResponse.json({ error: "Too many sign-up attempts. Please try again later." }, { status: 429 });
    }

    const input = signupSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "Check your details. Passwords must be at least 12 characters." }, { status: 400 });
    if (!await verifyTurnstile(request, input.data.captchaToken)) {
      return NextResponse.json({ error: "CAPTCHA verification failed. Please complete it again." }, { status: 400 });
    }

    const { fullName, username, password } = input.data;
    const email = input.data.email.toLowerCase();
    const verifyUrl = new URL("/verify-email/", getAppUrl(request.nextUrl.origin));
    const passwordHash = await hashPassword(password);
    const sql = getDatabase();
    const token = createEmailToken();
    await sql`
      WITH created_user AS (
        INSERT INTO users (full_name, username, email, password_hash)
        VALUES (${fullName}, ${username}, ${email}, ${passwordHash})
        RETURNING id
      )
      INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at)
      SELECT ${hashToken(token)}, id, 'verify_email', now() + interval '24 hours'
      FROM created_user
    `;

    verifyUrl.searchParams.set("token", token);
    try {
      await sendEmail(
        email,
        "Confirm your Muhmol account",
        "Confirm your email",
        "Use this secure link to verify your email address and activate your account. The link expires in 24 hours.",
        verifyUrl.toString(),
      );
    } catch (error) {
      console.error("Account created but verification email could not be delivered:", error);
      return NextResponse.json({
        message: "Account created, but email delivery failed. Use the resend option to try again.",
      }, { status: 201 });
    }

    return NextResponse.json({ message: "Account created. Check your inbox for a verification link." }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "That email or username is already in use." }, { status: 409 });
    }
    console.error("Sign-up failed:", error);
    return NextResponse.json({ error: "Unable to create your account right now. Please try again later." }, { status: 500 });
  }
}
