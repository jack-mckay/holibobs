import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const [teams] = await db.query<RowDataPacket[]>(
    "SELECT id, name FROM Teams ORDER BY name",
  );
  return NextResponse.json(teams);
}
