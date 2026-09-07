import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type LeaveTypeRow = RowDataPacket & {
  id: number;
  code: string;
  name: string;
};

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const [leaveTypes] = await db.query<LeaveTypeRow[]>(
    "SELECT id, code, name FROM LeaveTypes WHERE active = TRUE ORDER BY id",
  );
  return NextResponse.json(leaveTypes);
}
