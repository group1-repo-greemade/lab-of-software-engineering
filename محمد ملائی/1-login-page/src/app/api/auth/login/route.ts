import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { allowRequest, getClientAddress, hashRateLimitKey, isSameOrigin } from "@/lib/security";

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(128),
});

const loginUserSchema = z.object({
  id: z.string().uuid(),
  password_hash: z.string(),
  role: z.enum(["user", "admin"]),
  email_verified: z.boolean(),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    const input = loginSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "Enter your email or username and password." }, { status: 400 });

    const identifier = input.data.identifier.toLowerCase();
    const address = getClientAddress(request);
    const ipKey = hashRateLimitKey(`login-ip:${address}`);
    const accountKey = hashRateLimitKey(`login-account:${address}:${identifier}`);
    if (!await allowRequest(ipKey, 50, 900) || !await allowRequest(accountKey, 10, 900)) {
      return NextResponse.json({ error: "Too many sign-in attempts. Try again in a few minutes." }, { status: 429 });
    }

    const sql = getDatabase();
    const rows = await sql`
      SELECT id, password_hash, role, email_verified
      FROM users
      WHERE lower(email) = ${identifier} OR lower(username) = ${identifier}
      LIMIT 1
    `;
    const user = rows[0] ? loginUserSchema.parse(rows[0]) : null;
    const passwordMatches = user
      ? await verifyPassword(input.data.password, user.password_hash)
      : await verifyPassword(input.data.password, "$2b$12$UXKuAhzHsg9UNRgEHMB78.JJRnzg/F3nCkgqCT7wwUTNmW9/pifOO");

    if (!user || !passwordMatches) {
      return NextResponse.json({ error: "Invalid email/username or password." }, { status: 401 });
    }
    if (!user.email_verified) {
      return NextResponse.json({ error: "Invalid email/username or password." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ role: user.role });
  } catch (error) {
    console.error("Sign-in failed:", error);
    return NextResponse.json({ error: "Unable to sign in right now. Please try again." }, { status: 500 });
  }
}
