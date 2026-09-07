export type DayPortion = "AM" | "PM";

export function calculateDaysTaken(startDate: Date, endDate: Date, startPortion: DayPortion, endPortion: DayPortion) {
  const startDay = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const endDay = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  const dayDifference = Math.round((endDay - startDay) / 86_400_000);

  if (dayDifference < 0 || (dayDifference === 0 && startPortion === "PM" && endPortion === "AM")) return null;
  if (dayDifference === 0) return startPortion === endPortion ? 0.5 : 1;
  const firstDay = startPortion === "AM" ? 1 : 0.5;
  const lastDay = endPortion === "PM" ? 1 : 0.5;
  return dayDifference - 1 + firstDay + lastDay;
}
