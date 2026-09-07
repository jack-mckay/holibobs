"use client";

import { CalendarDays, LayoutGrid, Users } from "lucide-react";

export function Sidebar({
  view,
  pendingCount,
  onView,
}: {
  view: "calendar" | "teams" | "profile";
  pendingCount: number;
  onView: (view: "calendar" | "teams" | "profile") => void;
}) {
  return (
    <aside className="sidebar">
      <nav className="nav">
        <p className="eyebrow">Views</p>
        <button
          className={view === "calendar" ? "nav-item active" : "nav-item"}
          onClick={() => onView("calendar")}
        >
          <CalendarDays size={18} /> Calendar{" "}
          <span className="nav-badge">{pendingCount}</span>
        </button>
        <button
          className={view === "teams" ? "nav-item active" : "nav-item"}
          onClick={() => onView("teams")}
        >
          <Users size={18} /> Teams
        </button>
        <button
          className={view === "profile" ? "nav-item active" : "nav-item"}
          onClick={() => onView("profile")}
        >
          <LayoutGrid size={18} /> Profile
        </button>
      </nav>
    </aside>
  );
}
