import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSession, hashToken } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { isSameOrigin } from "@/lib/security";

const tokenSchema = z.object({ token: z.string().min(32).max(128) });

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    const input = tokenSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });

    const sql = getDatabase();
    const users = await sql`
      WITH verification AS (
        DELETE FROM email_tokens
        WHERE token_hash = ${hashToken(input.data.token)}
          AND purpose = 'verify_email'
          AND expires_at > now()
        RETURNING user_id
      )
      UPDATE users SET email_verified = true
      WHERE id = (SELECT user_id FROM verification)
      RETURNING id, role
    `;
    const user = z.object({ id: z.string().uuid(), role: z.enum(["user", "admin"]) }).nullable().parse(users[0] ?? null);
    if (!user) return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });

    await createSession(user.id);
    return NextResponse.json({ role: user.role });
  } catch (error) {
    console.error("Email verification failed:", error);
    return NextResponse.json({ error: "Unable to verify this email right now." }, { status: 500 });
  }
}
