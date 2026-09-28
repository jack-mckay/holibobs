import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

type RequiredLeaveRow = RowDataPacket & {
  startDate: string;
  endDate: string;
  recurring: boolean;
};
type LeaveRow = RowDataPacket & {
  requesterId: number;
  startDate: string;
  endDate: string;
  startPortion: "AM" | "PM";
  endPortion: "AM" | "PM";
  daysTaken: number;
};

export async function getTakenDaysByUserIds(userIds: number[]) {
  const totals = new Map(userIds.map((userId) => [userId, 0]));
  if (!userIds.length) return totals;

  const placeholders = userIds.map(() => "?").join(", ");
  const [[requiredLeave], [leaveRows]] = await Promise.all([
    db.query<RequiredLeaveRow[]>(
      "SELECT DATE_FORMAT(startDate, '%Y-%m-%d') AS startDate, DATE_FORMAT(endDate, '%Y-%m-%d') AS endDate, recurring FROM RequiredLeave",
    ),
    db.query<LeaveRow[]>(
      `SELECT lr.requesterId, DATE_FORMAT(lr.startDate, '%Y-%m-%d') AS startDate, DATE_FORMAT(lr.endDate, '%Y-%m-%d') AS endDate, lr.startPortion, lr.endPortion, lr.daysTaken FROM LeaveRequests lr INNER JOIN LeaveTypes lt ON lt.id = lr.leaveTypeId WHERE lt.code = 'HOLIDAY' AND lr.status IN ('PENDING', 'APPROVED') AND lr.requesterId IN (${placeholders})`,
      userIds,
    ),
  ]);
  for (const leave of leaveRows) {
    let deduction = 0;
    for (
      let timestamp = Date.parse(`${leave.startDate}T00:00:00Z`);
      timestamp <= Date.parse(`${leave.endDate}T00:00:00Z`);
      timestamp += 86_400_000
    ) {
      const date = new Date(timestamp).toISOString().slice(0, 10);
      const monthDay = date.slice(5);
      const isRequiredDate = requiredLeave.some((required) => {
        if (!required.recurring)
          return required.startDate <= date && date <= required.endDate;
        const start = required.startDate.slice(5);
        const end = required.endDate.slice(5);
        return start <= end
          ? start <= monthDay && monthDay <= end
          : monthDay >= start || monthDay <= end;
      });
      if (!isRequiredDate) continue;
      if (leave.startDate === leave.endDate) {
        deduction += leave.startPortion === leave.endPortion ? 0.5 : 1;
      } else if (date === leave.startDate) {
        deduction += leave.startPortion === "AM" ? 1 : 0.5;
      } else if (date === leave.endDate) {
        deduction += leave.endPortion === "PM" ? 1 : 0.5;
      } else {
        deduction += 1;
      }
    }
    totals.set(
      leave.requesterId,
      (totals.get(leave.requesterId) ?? 0) +
        Math.max(0, Number(leave.daysTaken) - deduction),
    );
  }

  return totals;
}