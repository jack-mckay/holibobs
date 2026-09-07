export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";
export type DayPortion = "AM" | "PM";
export type Session = {
  userId: number;
  email: string;
  name: string;
  role: Role;
  teamId: number;
};
export type Request = {
  id: number;
  name: string;
  requesterId: number;
  requesterTeam: string;
  requesterTeamId: number;
  start: string;
  end: string;
  type: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  startPortion: DayPortion;
  endPortion: DayPortion;
  daysTaken: number;
  color: string;
};
export type Member = {
  id: number;
  name: string;
  email: string;
  initials: string;
  role: string;
  team: string;
  teamId: number;
  allowance: number;
  takenDays: number;
  accent: string;
};
export const displayTeam = (team: string) =>
  team.replace(/\b\w/g, (char) => char.toUpperCase());
export const teamColor = (teamId: number) =>
  ["teal", "purple", "orange", "blue", "pink"][teamId - 1] ?? "teal";
export const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");
export const mapRequest = (row: Record<string, unknown>): Request => {
  const teamId = Number(row.requesterTeamId);
  return {
    id: Number(row.id),
    name: String(row.requesterName),
    requesterId: Number(row.requesterId),
    requesterTeam: String(row.requesterTeam),
    requesterTeamId: teamId,
    start: String(row.startDate).slice(0, 10),
    end: String(row.endDate).slice(0, 10),
    type: String(row.leaveType),
    status: String(row.status) as Request["status"],
    startPortion: String(row.startPortion ?? "AM") as DayPortion,
    endPortion: String(row.endPortion ?? "PM") as DayPortion,
    daysTaken: Number(row.daysTaken ?? 1),
    color: teamColor(teamId),
  };
};
