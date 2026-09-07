import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

type UserRow = RowDataPacket & { teamId: number };

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const [users] = await db.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.role, u.teamId, t.name AS team, u.holidayAllowance, COALESCE(SUM(CASE WHEN lt.code = 'HOLIDAY' AND lr.status IN ('PENDING', 'APPROVED') THEN lr.daysTaken ELSE 0 END), 0) AS takenDays FROM User u INNER JOIN Teams t ON t.id = u.teamId LEFT JOIN LeaveRequests lr ON lr.requesterId = u.id LEFT JOIN LeaveTypes lt ON lt.id = lr.leaveTypeId GROUP BY u.id, u.name, u.email, u.role, u.teamId, t.name, u.holidayAllowance ORDER BY t.id, u.name`,
  );

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN")
    return NextResponse.json(
      { error: "Super admin access required" },
      { status: 403 },
    );
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    teamId?: number;
    holidayAllowance?: number;
  };
  if (
    !body.name ||
    !body.email ||
    !body.password ||
    !body.teamId ||
    body.holidayAllowance === undefined
  )
    return NextResponse.json(
      { error: "Name, email, password, team and allowance are required" },
      { status: 400 },
    );
  if (body.password !== body.confirmPassword)
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  if (body.password.length < 6)
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  const [team] = await db.query<RowDataPacket[]>(
    "SELECT id FROM Teams WHERE id = ?",
    [body.teamId],
  );
  if (!team[0])
    return NextResponse.json({ error: "Team not found" }, { status: 400 });
  try {
    await db.execute(
      "INSERT INTO User (name, email, passwordHash, role, teamId, holidayAllowance) VALUES (?, ?, ?, 'USER', ?, ?)",
      [
        body.name,
        body.email,
        await hashPassword(body.password),
        body.teamId,
        body.holidayAllowance,
      ],
    );
  } catch {
    return NextResponse.json(
      { error: "A user with that email already exists" },
      { status: 409 },
    );
  }
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN")
    return NextResponse.json(
      { error: "Super admin access required" },
      { status: 403 },
    );
  const body = (await request.json()) as {
    userId?: number;
    holidayAllowance?: number;
    teamId?: number;
    password?: string;
    confirmPassword?: string;
  };
  if (!body.userId)
    return NextResponse.json({ error: "A user is required" }, { status: 400 });
  const [rows] = await db.query<UserRow[]>(
    "SELECT teamId FROM User WHERE id = ?",
    [body.userId],
  );
  if (!rows[0])
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (
    body.holidayAllowance !== undefined &&
    (typeof body.holidayAllowance !== "number")
  )
    return NextResponse.json(
      { error: "A valid allowance is required" },
      { status: 400 },
    );
  if (body.password && body.password !== body.confirmPassword)
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  if (body.password && body.password.length < 6)
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  const nextTeam = body.teamId ?? rows[0].teamId;
  await db.execute(
    "UPDATE User SET holidayAllowance = COALESCE(?, holidayAllowance), teamId = ?, passwordHash = COALESCE(?, passwordHash) WHERE id = ?",
    [
      body.holidayAllowance ?? null,
      nextTeam,
      body.password ? await hashPassword(body.password) : null,
      body.userId,
    ],
  );
  return NextResponse.json({ success: true });
}
