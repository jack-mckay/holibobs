import { teamColor } from "./types";

export function Avatar({
  teamId,
  initials,
  color,
}: {
  teamId?: number;
  initials: string;
  color?: string;
}) {
  const resolvedColor = color ?? (teamId ? teamColor(teamId) : "teal");

  return <span className={`avatar ${resolvedColor}`}>{initials}</span>;
}
