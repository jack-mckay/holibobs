import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type RequiredLeaveRow = RowDataPacket & {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  recurring: boolean;
};

function containsDate(
  range: Pick<RequiredLeaveRow, "startDate" | "endDate" | "recurring">,
  date: string,
) {
  if (!range.recurring) return range.startDate <= date && date <= range.endDate;
  const monthDay = date.slice(5);
  const start = range.startDate.slice(5);
  const end = range.endDate.slice(5);
  return start <= end
    ? start <= monthDay && monthDay <= end
    : monthDay >= start || monthDay <= end;
}

function rangesOverlap(
  first: Pick<RequiredLeaveRow, "startDate" | "endDate" | "recurring">,
  second: Pick<RequiredLeaveRow, "startDate" | "endDate" | "recurring">,
) {
  const firstRecurringDate = first.recurring && second.recurring;
  const start = firstRecurringDate
    ? "2000-01-01"
    : first.recurring
      ? second.startDate
      : first.startDate;
  const end = firstRecurringDate
    ? "2000-12-31"
    : first.recurring
      ? second.endDate
      : first.endDate;
  for (
    let timestamp = Date.parse(`${start}T00:00:00Z`);
    timestamp <= Date.parse(`${end}T00:00:00Z`);
    timestamp += 86_400_000
  ) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    if (containsDate(first, date) && containsDate(second, date)) return true;
  }
  return false;
}

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const [requiredLeave] = await db.query<RequiredLeaveRow[]>(
    "SELECT id, name, DATE_FORMAT(startDate, '%Y-%m-%d') AS startDate, DATE_FORMAT(endDate, '%Y-%m-%d') AS endDate, recurring FROM RequiredLeave ORDER BY startDate, endDate, name",
  );
  return NextResponse.json(
    requiredLeave.map((item) => ({ ...item, recurring: Boolean(item.recurring) })),
  );
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN")
    return NextResponse.json(
      { error: "Super admin access required" },
      { status: 403 },
    );

  const body = (await request.json()) as {
    id?: number;
    name?: string;
    startDate?: string;
    endDate?: string;
    recurring?: boolean;
  };
  const name = body.name?.trim();
  const startDate = body.startDate;
  const endDate = body.endDate;
  const id = body.id === undefined || body.id === null ? null : Number(body.id);
  if (
    !name ||
    name.length > 191 ||
    !isDate(startDate) ||
    !isDate(endDate) ||
    startDate > endDate ||
    (body.recurring !== undefined && typeof body.recurring !== "boolean") ||
    (id !== null && (!Number.isInteger(id) || id < 1))
  )
    return NextResponse.json(
      { error: "A name and valid start and end dates are required" },
      { status: 400 },
    );

  if (id !== null) {
    const [matches] = await db.query<RowDataPacket[]>(
      "SELECT id FROM RequiredLeave WHERE id = ?",
      [id],
    );
    if (!matches[0])
      return NextResponse.json({ error: "Required leave not found" }, { status: 404 });
  }

  const [existingRanges] = await db.query<RequiredLeaveRow[]>(
    "SELECT id, DATE_FORMAT(startDate, '%Y-%m-%d') AS startDate, DATE_FORMAT(endDate, '%Y-%m-%d') AS endDate, recurring FROM RequiredLeave WHERE (? IS NULL OR id <> ?)",
    [id, id],
  );
  const candidate = {
    startDate,
    endDate,
    recurring: body.recurring ?? false,
  };
  if (existingRanges.some((range) => rangesOverlap(candidate, range)))
    return NextResponse.json(
      { error: "Required leave ranges cannot overlap" },
      { status: 409 },
    );

  if (id !== null) {
    await db.execute(
      "UPDATE RequiredLeave SET name = ?, startDate = ?, endDate = ?, recurring = ? WHERE id = ?",
      [name, startDate, endDate, candidate.recurring, id],
    );
  } else {
    await db.execute(
      "INSERT INTO RequiredLeave (name, startDate, endDate, recurring) VALUES (?, ?, ?, ?)",
      [name, startDate, endDate, candidate.recurring],
    );
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN")
    return NextResponse.json(
      { error: "Super admin access required" },
      { status: 403 },
    );
  const body = (await request.json()) as { id?: number };
  if (!body.id)
    return NextResponse.json({ error: "A holiday is required" }, { status: 400 });
  const [deleted] = await db.execute<ResultSetHeader>(
    "DELETE FROM RequiredLeave WHERE id = ?",
    [body.id],
  );
  if (!deleted.affectedRows)
    return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}