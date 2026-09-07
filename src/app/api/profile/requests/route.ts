import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const [requests] = await db.query<RowDataPacket[]>(
    "SELECT lr.id, DATE_FORMAT(lr.startDate, '%Y-%m-%d') AS startDate, DATE_FORMAT(lr.endDate, '%Y-%m-%d') AS endDate, lt.name AS leaveType, lr.startPortion, lr.endPortion, lr.daysTaken, lr.status, lr.note FROM LeaveRequests lr INNER JOIN LeaveTypes lt ON lt.id = lr.leaveTypeId WHERE lr.requesterId = ? ORDER BY lr.startDate DESC",
    [session.userId],
  );
  return NextResponse.json(requests);
}
