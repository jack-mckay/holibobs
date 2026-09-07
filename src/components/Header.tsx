"use client";

import { Bell, LogOut } from "lucide-react";
import type { Session } from "./types";
import { initials } from "./types";
import { Avatar } from "./Avatar";

export function Header({
  session,
  view,
  profileOpen,
  onToggleProfile,
  onCloseProfile,
  onProfile,
  onSignOut,
}: {
  session: Session;
  view: "calendar" | "teams" | "profile";
  profileOpen: boolean;
  onToggleProfile: () => void;
  onCloseProfile: () => void;
  onProfile: () => void;
  onSignOut: () => void;
}) {
  const title =
    view === "calendar" ? "Calendar" : view === "teams" ? "Teams" : "Profile";
  return (
    <>
      <header className="topbar">
        <div className="breadcrumb">
          <strong>{title}</strong>
        </div>
        <div className="top-actions">
          {/* <button className="notification-button" aria-label="Notifications">
            <Bell size={18} />
          </button> */}
          <div
            className="profile-menu"
            onBlur={(event) => {
              const nextTarget = event.relatedTarget as Node | null;
              if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                onCloseProfile();
              }
            }}
          >
            <button onClick={onToggleProfile} aria-label="Open profile menu">
              <Avatar
                teamId={session.teamId}
                initials={initials(session.name)}
              />
            </button>
            {profileOpen && (
              <div className="profile-popover">
                <strong>{session.name}</strong>
                <span>{session.email}</span>
                <button onClick={onProfile}>View profile</button>
                <button onClick={onSignOut}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
