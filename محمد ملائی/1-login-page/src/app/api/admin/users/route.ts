import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    if (currentUser.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

    const sql = getDatabase();
    const users = await sql`
      SELECT id, full_name, username, email, role, email_verified, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 500
    `;

    return NextResponse.json({ users }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Admin user list failed:", error);
    return NextResponse.json({ error: "Unable to load accounts." }, { status: 500 });
  }
}
