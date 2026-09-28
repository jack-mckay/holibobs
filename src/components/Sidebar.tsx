"use client";

import { CalendarDays, LayoutGrid, Settings, Users } from "lucide-react";

export function Sidebar({
  view,
  pendingCount,
  isSuperAdmin,
  onView,
}: {
  view: "calendar" | "teams" | "profile" | "admin";
  pendingCount: number;
  isSuperAdmin: boolean;
  onView: (view: "calendar" | "teams" | "profile" | "admin") => void;
}) {
  return (
    <aside className="sidebar">
      <div className="site-title">Holibobs</div>
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
        {isSuperAdmin && (
          <button
            className={view === "admin" ? "nav-item active" : "nav-item"}
            onClick={() => onView("admin")}
          >
            <Settings size={18} /> Admin
          </button>
        )}
      </nav>
    </aside>
  );
}
