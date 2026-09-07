"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ShieldCheck } from "lucide-react";
import type { Session } from "./types";

type ProfileData = {
  team: string;
  holidayAllowance: number;
  takenDays: number;
};
type ProfileRequest = {
  id: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  startPortion: string;
  endPortion: string;
  daysTaken: number;
  status: string;
};

export function ProfileView({
  session,
  onNotice,
}: {
  session: Session;
  onNotice: (message: string) => void;
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [requests, setRequests] = useState<ProfileRequest[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  useEffect(() => {
    Promise.all([fetch("/api/profile"), fetch("/api/profile/requests")]).then(
      async ([profileResponse, requestsResponse]) => {
        if (profileResponse.ok) setProfile(await profileResponse.json());
        if (requestsResponse.ok) setRequests(await requestsResponse.json());
      },
    );
  }, []);
  async function updatePassword() {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmPassword }),
    });
    const data = await response.json();
    onNotice(response.ok ? "Password updated" : data.error);
    if (response.ok) {
      setPassword("");
      setConfirmPassword("");
    }
  }
  const remaining = Math.max(
    0,
    (profile?.holidayAllowance ?? 0) - Number(profile?.takenDays ?? 0),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="kicker">Your profile</p>
          <h1>{session.name}</h1>
          <p className="subheading">
            {session.email} · {profile?.team}
          </p>
        </div>
      </div>
      <div className="profile-stats">
        <section>
          <CalendarDays size={20} />
          <small>Holiday allowance</small>
          <strong>{profile?.holidayAllowance ?? 0} days</strong>
        </section>
        <section>
          <ShieldCheck size={20} />
          <small>Taken days</small>
          <strong>{profile?.takenDays ?? 0} days</strong>
        </section>
        <section>
          <CalendarDays size={20} />
          <small>Remaining</small>
          <strong>{remaining} days</strong>
        </section>
      </div>
      <section className="panel profile-requests">
        <div className="panel-heading">
          <div>
            <h2>Your requests</h2>
            <p>Pending, approved and past requests.</p>
          </div>
        </div>
        {requests.map((request) => (
          <div className="request-row" key={request.id}>
            <div className="request-main">
              <strong>{request.leaveType}</strong>
              <span>
                {request.startPortion} {String(request.startDate).slice(0, 10)}{" "}
                to {String(request.endDate).slice(0, 10)} {request.endPortion} ·{" "}
                {request.daysTaken} days
              </span>
            </div>
            <span className={`request-status ${request.status.toLowerCase()}`}>
              {request.status.toLowerCase()}
            </span>
          </div>
        ))}
      </section>
      <section className="panel password-panel">
        <div className="panel-heading">
          <div>
            <h2>Update password</h2>
            <p>Choose a new password for your account.</p>
          </div>
        </div>
        <div className="password-form">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
          />
          <button className="primary-button" onClick={updatePassword}>
            Update password
          </button>
        </div>
      </section>
    </>
  );
}
