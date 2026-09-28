import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getTakenDaysByUserIds } from "@/lib/allowance";

type ProfileRow = RowDataPacket & { id: number; name: string; email: string; role: string; team: string; holidayAllowance: number };

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const [rows] = await db.query<ProfileRow[]>(`
    SELECT u.id, u.name, u.email, u.role, t.name AS team, u.holidayAllowance
    FROM User u INNER JOIN Teams t ON t.id = u.teamId WHERE u.id = ?
  `, [session.userId]);
  const takenDays = await getTakenDaysByUserIds([session.userId]);
  return NextResponse.json({
    ...rows[0],
    takenDays: takenDays.get(session.userId) ?? 0,
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json() as { password?: string; confirmPassword?: string };
  if (!body.password || body.password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  if (body.password !== body.confirmPassword) return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  await db.execute("UPDATE User SET passwordHash = ? WHERE id = ?", [await hashPassword(body.password), session.userId]);
  return NextResponse.json({ success: true });
}