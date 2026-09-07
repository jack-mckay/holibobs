import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { calculateDaysTaken, type DayPortion } from "@/lib/leave";
import { canManageRequests, canManageTeam, getSession } from "@/lib/auth";

type RequestRow = RowDataPacket & {
  id: number;
  startDate: Date;
  endDate: Date;
  leaveType: string;
  startPortion: DayPortion;
  endPortion: DayPortion;
  daysTaken: number;
  status: "PENDING" | "APPROVED" | "DECLINED";
  note: string | null;
  requesterId: number;
  requesterName: string;
  requesterTeam: string;
  requesterTeamId: number;
};
type OwnerRow = RowDataPacket & {
  requesterId: number;
  teamId: number;
  leaveType: string;
  status: string;
};

function parseDate(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
function getPortions(body: Record<string, unknown>) {
  const startPortion = String(
    body.startPortion ?? "AM",
  ).toUpperCase() as DayPortion;
  const endPortion = String(
    body.endPortion ?? "PM",
  ).toUpperCase() as DayPortion;
  return ["AM", "PM"].includes(startPortion) &&
    ["AM", "PM"].includes(endPortion)
    ? { startPortion, endPortion }
    : null;
}

async function getLeaveTypeId(value: unknown) {
  const code = String(value).toUpperCase().replaceAll(" ", "_");
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT id FROM LeaveTypes WHERE code = ? AND active = TRUE",
    [code],
  );
  return rows[0] ? Number(rows[0].id) : null;
}

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const visibility =
    session.role === "SUPER_ADMIN"
      ? "lr.status IN ('PENDING', 'APPROVED')"
      : session.role === "ADMIN"
        ? "lr.status = 'APPROVED' OR (lr.status = 'PENDING' AND (lr.requesterId = ? OR u.teamId = ?))"
        : "lr.status = 'APPROVED' OR (lr.status = 'PENDING' AND lr.requesterId = ?)";
  const visibilityParams =
    session.role === "SUPER_ADMIN"
      ? []
      : session.role === "ADMIN"
        ? [session.userId, session.teamId]
        : [session.userId];
  const [requests] = await db.query<RequestRow[]>(
    `SELECT lr.id, DATE_FORMAT(lr.startDate, '%Y-%m-%d') AS startDate, DATE_FORMAT(lr.endDate, '%Y-%m-%d') AS endDate, lt.name AS leaveType, lr.startPortion, lr.endPortion, lr.daysTaken, lr.status, lr.note, lr.requesterId, u.name AS requesterName, u.teamId AS requesterTeamId, t.name AS requesterTeam FROM LeaveRequests lr INNER JOIN LeaveTypes lt ON lt.id = lr.leaveTypeId INNER JOIN User u ON u.id = lr.requesterId INNER JOIN Teams t ON t.id = u.teamId WHERE ${visibility} ORDER BY lr.startDate ASC`,
    visibilityParams,
  );

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const startDate = parseDate(body.startDate);
  const endDate = parseDate(body.endDate ?? body.startDate);
  const selected = getPortions(body);
  if (!startDate || !endDate || !selected)
    return NextResponse.json(
      { error: "Valid dates and AM/PM portions are required" },
      { status: 400 },
    );
  const daysTaken = calculateDaysTaken(
    startDate,
    endDate,
    selected.startPortion,
    selected.endPortion,
  );
  if (daysTaken === null)
    return NextResponse.json(
      { error: "The leave range is invalid" },
      { status: 400 },
    );
  const requesterId =
    session.role === "SUPER_ADMIN" && body.requesterId
      ? Number(body.requesterId)
      : session.userId;
  const leaveTypeId = await getLeaveTypeId(body.leaveType ?? "HOLIDAY");
  if (leaveTypeId === null)
    return NextResponse.json({ error: "Invalid leave type" }, { status: 400 });
  const [inserted] = await db.execute<ResultSetHeader>(
    "INSERT INTO LeaveRequests (startDate, endDate, leaveTypeId, startPortion, endPortion, daysTaken, status, note, requesterId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, NOW(), NOW())",
    [
      startDate,
      endDate,
      leaveTypeId,
      selected.startPortion,
      selected.endPortion,
      daysTaken,
      typeof body.note === "string" ? body.note : null,
      requesterId,
    ],
  );
  const [created] = await db.query<RequestRow[]>(
    "SELECT lr.*, lt.name AS leaveType FROM LeaveRequests lr INNER JOIN LeaveTypes lt ON lt.id = lr.leaveTypeId WHERE lr.id = ?",
    [inserted.insertId],
  );
  return NextResponse.json(created[0], { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const id = Number(body.id ?? 0);
  const [rows] = await db.query<OwnerRow[]>(
    "SELECT lr.requesterId, u.teamId, lt.name AS leaveType, lr.status FROM LeaveRequests lr INNER JOIN LeaveTypes lt ON lt.id = lr.leaveTypeId INNER JOIN User u ON u.id = lr.requesterId WHERE lr.id = ?",
    [id],
  );
  const existing = rows[0];
  const isOwnRequest = existing
    ? existing.requesterId === session.userId
    : false;
  const canManageThisTeam = existing
    ? canManageTeam(session, existing.teamId)
    : false;
  if (!existing)
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (session.role !== "SUPER_ADMIN" && !isOwnRequest && !canManageThisTeam)
    return NextResponse.json(
      {
        error: "You can only change your own requests or your team\'s requests",
      },
      { status: 403 },
    );

  if (
    ["APPROVE", "REJECT", "UNAPPROVE", "DELETE"].includes(String(body.action))
  ) {
    if (body.action === "DELETE") {
      const canDeleteOwn = isOwnRequest && existing.status !== "DECLINED";
      const canDeleteTeamPending =
        session.role === "ADMIN" &&
        existing.status === "PENDING" &&
        canManageThisTeam;
      const canDeleteAny = session.role === "SUPER_ADMIN";
      if (!canDeleteOwn && !canDeleteTeamPending && !canDeleteAny)
        return NextResponse.json(
          { error: "You can only cancel your own leave or pending team leave" },
          { status: 403 },
        );
      await db.execute("DELETE FROM LeaveRequests WHERE id = ?", [id]);
      return NextResponse.json({ success: true, status: "DELETED" });
    }
    if (!canManageRequests(session))
      return NextResponse.json(
        { error: "Admin approval is required" },
        { status: 403 },
      );
    if (session.role === "ADMIN" && !canManageThisTeam)
      return NextResponse.json(
        { error: "You can only manage requests in your team" },
        { status: 403 },
      );
    const status =
      body.action === "APPROVE"
        ? "APPROVED"
        : body.action === "UNAPPROVE"
          ? "PENDING"
          : "DECLINED";
    await db.execute(
      "UPDATE LeaveRequests SET status = ?, approverId = ?, updatedAt = NOW() WHERE id = ?",
      [status, session.userId, id],
    );
    if (status === "DECLINED")
      await db.execute(
        "INSERT INTO Notification (userId, requestId, message, createdAt) VALUES (?, ?, ?, NOW())",
        [
          existing.requesterId,
          id,
          String(
            body.message ?? "Your leave request was declined by an admin.",
          ),
        ],
      );
    return NextResponse.json({ success: true, status });
  }

  const startDate = body.startDate ? parseDate(body.startDate) : null;
  const endDate = body.endDate ? parseDate(body.endDate) : null;
  const selected = getPortions(body);
  if ((body.startDate && !startDate) || (body.endDate && !endDate) || !selected)
    return NextResponse.json(
      { error: "Valid dates and AM/PM portions are required" },
      { status: 400 },
    );
  const canEditOwnLeave =
    isOwnRequest && ["PENDING", "APPROVED"].includes(existing.status);
  const canEditAnyLeave = session.role === "SUPER_ADMIN";
  if (!canEditOwnLeave && !canEditAnyLeave)
    return NextResponse.json(
      { error: "You can only edit your own pending or approved leave" },
      { status: 403 },
    );
  if (session.role === "ADMIN" && !isOwnRequest)
    return NextResponse.json(
      { error: "Admins cannot edit other people\'s leave dates" },
      { status: 403 },
    );
  if (startDate && endDate) {
    const daysTaken = calculateDaysTaken(
      startDate,
      endDate,
      selected.startPortion,
      selected.endPortion,
    );
    if (daysTaken === null)
      return NextResponse.json(
        { error: "The leave range is invalid" },
        { status: 400 },
      );
    const leaveTypeId = body.leaveType
      ? await getLeaveTypeId(body.leaveType)
      : null;
    if (body.leaveType && leaveTypeId === null)
      return NextResponse.json({ error: "Invalid leave type" }, { status: 400 });
    await db.execute(
      "UPDATE LeaveRequests SET startDate = ?, endDate = ?, leaveTypeId = COALESCE(?, leaveTypeId), startPortion = ?, endPortion = ?, daysTaken = ?, note = COALESCE(?, note), status = 'PENDING', approverId = NULL, updatedAt = NOW() WHERE id = ?",
      [
        startDate,
        endDate,
        leaveTypeId,
        selected.startPortion,
        selected.endPortion,
        daysTaken,
        typeof body.note === "string" ? body.note : null,
        id,
      ],
    );
  } else {
    const leaveTypeId = body.leaveType
      ? await getLeaveTypeId(body.leaveType)
      : null;
    if (body.leaveType && leaveTypeId === null)
      return NextResponse.json({ error: "Invalid leave type" }, { status: 400 });
    await db.execute(
      "UPDATE LeaveRequests SET leaveTypeId = COALESCE(?, leaveTypeId), status = 'PENDING', approverId = NULL, updatedAt = NOW() WHERE id = ?",
      [leaveTypeId, id],
    );
  }
  return NextResponse.json({ success: true, status: "PENDING" });
}
