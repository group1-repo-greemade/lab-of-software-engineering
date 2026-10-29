import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { hashPassword, hashToken } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { isSameOrigin } from "@/lib/security";

const resetSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(12).max(128),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    const input = resetSchema.safeParse(await request.json());
    if (!input.success) {
      return NextResponse.json({ error: "This reset link is invalid or expired, or the password is too short." }, { status: 400 });
    }

    const passwordHash = await hashPassword(input.data.password);
    const sql = getDatabase();
    const rows = await sql`
      WITH reset_token AS (
        DELETE FROM email_tokens
        WHERE token_hash = ${hashToken(input.data.token)}
          AND purpose = 'reset_password'
          AND expires_at > now()
        RETURNING user_id
      )
      UPDATE users SET password_hash = ${passwordHash}
      WHERE id = (SELECT user_id FROM reset_token)
      RETURNING id
    `;
    const userId = z.string().uuid().nullable().parse(rows[0]?.id ?? null);
    if (!userId) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });

    await sql`DELETE FROM sessions WHERE user_id = ${userId}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Unable to update your password right now." }, { status: 500 });
  }
}
