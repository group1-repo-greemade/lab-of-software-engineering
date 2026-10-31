import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { getDatabase } from "@/lib/db";

const sessionCookieName = "muhmol_session";
const sessionLifetimeSeconds = 60 * 60 * 24 * 14;
const passwordCost = 12;

const appUserSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.enum(["user", "admin"]),
  email_verified: z.boolean(),
  created_at: z.union([z.string(), z.date()]).transform((value) =>
    value instanceof Date ? value.toISOString() : value,
  ),
});

export type AppUser = z.infer<typeof appUserSchema>;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  // Pre-hash so bcrypt's 72-byte input limit cannot truncate long passwords.
  const prehashedPassword = createHash("sha256").update(password, "utf8").digest("hex");
  return hash(prehashedPassword, passwordCost);
}

export async function verifyPassword(password: string, passwordHash: string) {
  const prehashedPassword = createHash("sha256").update(password, "utf8").digest("hex");
  return compare(prehashedPassword, passwordHash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const sql = getDatabase();

  await sql`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${hashToken(token)}, now() + (${sessionLifetimeSeconds} * interval '1 second'))
  `;

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionLifetimeSeconds,
  });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) return null;

  const sql = getDatabase();
  const rows = await sql`
    SELECT users.id, users.full_name, users.username, users.email,
           users.role, users.email_verified, users.created_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${hashToken(token)}
      AND sessions.expires_at > now()
    LIMIT 1
  `;

  return rows[0] ? appUserSchema.parse(rows[0]) : null;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    const sql = getDatabase();
    await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
  }

  cookieStore.set(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
