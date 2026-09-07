"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarView } from "@/components/CalendarView";
import { Header } from "@/components/Header";
import { ProfileView } from "@/components/ProfileView";
import { RequestModal } from "@/components/RequestModal";
import { Sidebar } from "@/components/Sidebar";
import { TeamsView } from "@/components/TeamsView";
import type { Request, Session } from "@/components/types";
import { mapRequest } from "@/components/types";
import type { DayPortion } from "@/lib/leave";

type View = "calendar" | "teams" | "profile";
type ProfileSummary = { holidayAllowance: number; takenDays: number };

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [mode, setMode] = useState<"month" | "year">("month");
  const [editing, setEditing] = useState<Request | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const isAdmin = session?.role === "ADMIN" || session?.role === "SUPER_ADMIN";
  const yourRequests = session
    ? requests.filter(
        (request) =>
          request.requesterId === session.userId &&
          (request.status === "PENDING" || request.status === "APPROVED"),
      )
    : [];
  const teamRequests =
    session?.role === "ADMIN"
      ? requests.filter(
          (request) =>
            request.requesterTeamId === session.teamId &&
            request.requesterId !== session.userId &&
            (request.status === "PENDING" || request.status === "APPROVED"),
        )
      : session?.role === "SUPER_ADMIN"
        ? requests.filter(
            (request) =>
              request.requesterId !== session.userId &&
              (request.status === "PENDING" || request.status === "APPROVED"),
          )
        : [];
  const calendarRequests =
    session && session.role === "USER"
      ? requests.filter(
          (request) =>
            request.status === "APPROVED" ||
            (request.requesterId === session.userId &&
              request.status === "PENDING"),
        )
      : session && session.role === "ADMIN"
        ? requests.filter(
            (request) =>
              request.status === "APPROVED" ||
              (request.requesterTeamId === session.teamId &&
                request.status === "PENDING"),
        )
        : session && session.role === "SUPER_ADMIN"
          ? requests.filter(
              (request) =>
                request.status === "APPROVED" || request.status === "PENDING",
            )
          : [];
  const pending = (isAdmin ? teamRequests : yourRequests).filter(
    (request) => request.status === "PENDING",
  );
  const today = localDateKey(new Date());
  const awayTodayRequests = calendarRequests.filter(
    (request) =>
      request.status === "APPROVED" &&
      request.start <= today &&
      request.end >= today,
  );
  const awayTodayTeams = new Set(
    awayTodayRequests.map((request) => request.requesterTeamId),
  ).size;
  const view: View =
    pathname === "/teams"
      ? "teams"
      : pathname === "/profile"
        ? "profile"
        : "calendar";

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) =>
        data?.session ? setSession(data.session) : router.replace("/login"),
      );
  }, [router]);
  useEffect(() => {
    if (session && (view === "calendar" || view === "teams")) refreshRequests();
  }, [session, view]);
  async function refreshRequests() {
    const [requestsResponse, profileResponse] = await Promise.all([
      fetch("/api/requests"),
      fetch("/api/profile"),
    ]);
    if (requestsResponse.ok)
      setRequests((await requestsResponse.json()).map(mapRequest));
    if (profileResponse.ok) setProfile(await profileResponse.json());
  }
  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }
  async function saveRequest(values: {
    start: string;
    end: string;
    type: string;
    startPortion: DayPortion;
    endPortion: DayPortion;
    note: string;
  }) {
    const response = await fetch("/api/requests", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        startDate: values.start,
        endDate: values.end,
        leaveType: values.type,
        startPortion: values.startPortion,
        endPortion: values.endPortion,
        note: values.note,
      }),
    });
    const data = await response.json();
    if (!response.ok) return flash(data.error);
    setModalOpen(false);
    setEditing(null);
    await refreshRequests();
    flash(editing ? "Request updated" : "Request sent for approval");
  }
  async function review(
    id: number,
    action: "APPROVE" | "REJECT" | "UNAPPROVE" | "DELETE",
  ) {
    const response = await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await response.json();
    if (!response.ok) return flash(data.error);
    await refreshRequests();
    flash(
      action === "APPROVE"
        ? "Request approved"
        : action === "UNAPPROVE"
          ? "Request returned to pending"
          : action === "DELETE"
            ? "Request deleted"
            : "Request rejected and user notified",
    );
  }
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  if (!session) return null;

  return (
    <main className="shell">
      <Sidebar
        view={view}
        pendingCount={pending.length}
        onView={(nextView) => {
          router.push(
            nextView === "teams"
              ? "/teams"
              : nextView === "profile"
                ? "/profile"
                : "/",
          );
        }}
      />
      <section className="content">
        <Header
          session={session}
          view={view}
          profileOpen={profileOpen}
          onToggleProfile={() => setProfileOpen(!profileOpen)}
          onCloseProfile={() => setProfileOpen(false)}
          onProfile={() => router.push("/profile")}
          onSignOut={signOut}
        />
        <div className="page-body">
          {view === "calendar" && (
            <CalendarView
              yourRequests={yourRequests}
              teamRequests={teamRequests}
              calendarRequests={calendarRequests}
              pending={pending}
              mode={mode}
              setMode={setMode}
              isAdmin={isAdmin}
              currentUserId={session.userId}
              holidayAllowance={Number(profile?.holidayAllowance ?? 0)}
              holidayRemaining={Math.max(
                0,
                Number(profile?.holidayAllowance ?? 0) -
                  Number(profile?.takenDays ?? 0),
              )}
              awayToday={awayTodayRequests.length}
              awayTodayTeams={awayTodayTeams}
              onNew={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              onEdit={(request) => {
                setEditing(request);
                setModalOpen(true);
              }}
              onReview={review}
            />
          )}
          {view === "teams" && <TeamsView session={session} onNotice={flash} />}
          {view === "profile" && (
            <ProfileView session={session} onNotice={flash} />
          )}
        </div>
      </section>
      {notice && (
        <div className="toast">
          <ShieldCheck size={17} />
          {notice}
        </div>
      )}
      {modalOpen && (
        <RequestModal
          request={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={saveRequest}
        />
      )}
    </main>
  );
}
