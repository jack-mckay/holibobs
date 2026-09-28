import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type LeaveTypeRow = RowDataPacket & {
  id: number;
  code: string;
  name: string;
  active: boolean;
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const showAll =
    session.role === "SUPER_ADMIN" &&
    new URL(request.url).searchParams.get("manage") === "true";
  const [leaveTypes] = await db.query<LeaveTypeRow[]>(
    `SELECT id, code, name, active FROM LeaveTypes ${showAll ? "" : "WHERE active = TRUE"} ORDER BY id`,
  );
  return NextResponse.json(
    leaveTypes.map((leaveType) => ({
      ...leaveType,
      active: Boolean(leaveType.active),
    })),
  );
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN")
    return NextResponse.json(
      { error: "Super admin access required" },
      { status: 403 },
    );

  const body = (await request.json()) as {
    id?: number;
    name?: string;
    active?: boolean;
  };
  const id = Number(body.id);
  const name = body.name?.trim();
  if (!Number.isInteger(id) || id < 1 || !name || name.length > 191 || typeof body.active !== "boolean")
    return NextResponse.json(
      { error: "A valid leave type, name and status are required" },
      { status: 400 },
    );

  const [rows] = await db.query<LeaveTypeRow[]>(
    "SELECT id, code, name, active FROM LeaveTypes WHERE id = ?",
    [id],
  );
  if (!rows[0])
    return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
  if (rows[0].code === "HOLIDAY" && !body.active)
    return NextResponse.json(
      { error: "The Holiday leave type must remain active" },
      { status: 400 },
    );

  await db.execute<ResultSetHeader>(
    "UPDATE LeaveTypes SET name = ?, active = ? WHERE id = ?",
    [name, body.active, id],
  );
  return NextResponse.json({ success: true });
}
