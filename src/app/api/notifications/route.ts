import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type NotificationRow = RowDataPacket & {
  id: string;
  requestId: string | null;
  message: string;
  readAt: Date | null;
  createdAt: Date;
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const [notifications] = await db.query<NotificationRow[]>(
    "SELECT id, requestId, message, readAt, createdAt FROM Notification WHERE userId = ? ORDER BY createdAt DESC LIMIT 20",
    [session.userId],
  );
  return NextResponse.json(notifications);
}
