import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { z } from "zod";

const databaseUrl = process.env.DATABASE_URL;
const emailResult = z.string().trim().email().max(320).safeParse(process.env.ADMIN_EMAIL);
const email = emailResult.success ? emailResult.data.toLowerCase() : null;
const password = process.env.ADMIN_PASSWORD;

if (!databaseUrl || !email || !password) {
  console.error(
    "Set DATABASE_URL, a valid ADMIN_EMAIL, and ADMIN_PASSWORD in .env.local.",
  );
  process.exit(1);
}

if (password.length > 128) {
  console.error("ADMIN_PASSWORD must contain no more than 128 characters.");
  process.exit(1);
}

try {
  const sql = neon(databaseUrl);
  // Match the app's bcrypt-SHA-256 password encoding and avoid bcrypt's 72-byte limit.
  const passwordDigest = createHash("sha256").update(password, "utf8").digest("hex");
  const passwordHash = await bcrypt.hash(passwordDigest, 12);
  const users = await sql`
    INSERT INTO users (full_name, username, email, password_hash, role, email_verified)
    VALUES ('Workspace Administrator', 'admin', ${email}, ${passwordHash}, 'admin', true)
    ON CONFLICT (lower(email)) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      username = EXCLUDED.username,
      password_hash = EXCLUDED.password_hash,
      role = 'admin',
      email_verified = true
    RETURNING id
  `;

  await sql`DELETE FROM sessions WHERE user_id = ${users[0].id}`;
  console.log(`Administrator account provisioned for ${email}. Sign in using username "admin".`);
} catch (error) {
  console.error("Could not provision the administrator account:", error);
  process.exit(1);
}
