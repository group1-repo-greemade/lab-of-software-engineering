import { NextResponse, type NextRequest } from "next/server";
import { destroyCurrentSession } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    await destroyCurrentSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sign-out failed:", error);
    return NextResponse.json({ error: "Unable to sign out right now." }, { status: 500 });
  }
}
