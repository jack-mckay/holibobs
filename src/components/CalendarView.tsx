"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MoreHorizontal,
  Plus,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { Request } from "./types";
import { Avatar } from "./Avatar";
import { ConfirmationModal } from "./ConfirmationModal";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function isInRequestDay(request: Request, date: Date) {
  const day = dateKey(date);
  return day >= request.start && day <= request.end;
}

export function CalendarView({
  yourRequests,
  teamRequests,
  calendarRequests,
  pending,
  mode,
  setMode,
  isAdmin,
  currentUserId,
  holidayAllowance,
  holidayRemaining,
  awayToday,
  awayTodayTeams,
  onNew,
  onEdit,
  onReview,
}: {
  yourRequests: Request[];
  teamRequests: Request[];
  calendarRequests?: Request[];
  pending: Request[];
  mode: "month" | "year";
  setMode: (mode: "month" | "year") => void;
  isAdmin: boolean;
  currentUserId: number;
  holidayAllowance: number;
  holidayRemaining: number;
  awayToday: number;
  awayTodayTeams: number;
  onNew: () => void;
  onEdit: (request: Request) => void;
  onReview: (
    id: number,
    action: "APPROVE" | "REJECT" | "UNAPPROVE" | "DELETE",
  ) => void;
}) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const canEdit = (request: Request) =>
    request.requesterId === currentUserId &&
    (request.status === "PENDING" || request.status === "APPROVED");
  const moveMonth = (amount: number) =>
    setViewDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  const jumpToToday = () => {
    setViewDate(new Date());
    setMode("month");
  };
  const heading =
    mode === "year"
      ? String(viewDate.getFullYear())
      : `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="kicker">
            {new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(
              new Date(),
            )}
          </p>
          <h1>Calendar</h1>
        </div>
        <button className="primary-button" onClick={onNew}>
          <Plus size={18} /> Request time off
        </button>
      </div>
      <div className="stats">
        <Stat
          icon={<CalendarDays size={18} />}
          color="teal-bg"
          label="Holiday remaining"
          value={String(holidayRemaining)}
          valueClassName={holidayRemaining < 0 ? "negative" : undefined}
          detail={`of ${holidayAllowance} days`}
          trend="This year"
          progress={
            holidayAllowance
              ? `${Math.min(100, (holidayRemaining / holidayAllowance) * 100)}%`
              : "0%"
          }
        />
        {isAdmin && (
          <Stat
          icon={<Clock3 size={18} />}
          color="purple-bg"
          label="Pending requests"
          value={String(pending.length)}
          detail="awaiting review"
          trend="This week"
        />
        )}
        <Stat
          icon={<Users size={18} />}
          color="orange-bg"
          label="Away today"
          value={String(awayToday)}
          detail={awayToday === 1 ? "person" : "people"}
          trend={`Across ${awayTodayTeams} ${awayTodayTeams === 1 ? "team" : "teams"}`}
        />
      </div>
      <div className="section-heading">
        <div>
          <h2>Booking calendar</h2>
          <p>
            Approved leave is visible to everyone. Admins see their team
            requests.
          </p>
        </div>
        <div className="view-toggle">
          {(["month", "year"] as const).map((item) => (
            <button
              className={mode === item ? "selected" : ""}
              onClick={() => setMode(item)}
              key={item}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="calendar-card">
        <div className="calendar-toolbar">
          <button className="today-button" onClick={jumpToToday}>
            This month
          </button>
          <div className="month-nav">
            {mode === "month" && (
              <button
                className="round-button"
                onClick={() => moveMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft size={17} />
              </button>
            )}
            <strong>{heading}</strong>
            {mode === "month" && (
              <button
                className="round-button"
                onClick={() => moveMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight size={17} />
              </button>
            )}
          </div>
          <span />
        </div>
        {mode === "year" ? (
          <YearView
            year={viewDate.getFullYear()}
            requests={calendarRequests ?? []}
            canEdit={canEdit}
            onEdit={onEdit}
          />
        ) : (
          <MonthView
            date={viewDate}
            requests={calendarRequests ?? []}
            canEdit={canEdit}
            onEdit={onEdit}
          />
        )}
      </div>
      <section className="panel attention-panel">
        <RequestPanel
          title="Your requests"
          description="Your pending and recently reviewed leave."
          requests={yourRequests}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          canEdit={canEdit}
          onEdit={onEdit}
          onReview={onReview}
        />
        {isAdmin && (
          <RequestPanel
            title="Team requests"
            description="Approve or edit your team's holidays."
            requests={teamRequests}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            canEdit={canEdit}
            onEdit={onEdit}
            onReview={onReview}
          />
        )}
      </section>
    </>
  );
}

function RequestPanel({
  title,
  description,
  requests,
  isAdmin,
  currentUserId,
  canEdit,
  onEdit,
  onReview,
}: {
  title: string;
  description: string;
  requests: Request[];
  isAdmin: boolean;
  currentUserId: number;
  canEdit: (request: Request) => boolean;
  onEdit: (request: Request) => void;
  onReview: (
    id: number,
    action: "APPROVE" | "REJECT" | "UNAPPROVE" | "DELETE",
  ) => void;
}) {
  const [confirmation, setConfirmation] = useState<{
    id: number;
    action: "UNAPPROVE" | "DELETE";
  } | null>(null);
  const pendingCount = requests.filter(
    (request) => request.status === "PENDING",
  ).length;

  return (
    <>
      <div className="request-panel">
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <span className="count-pill">{pendingCount} pending</span>
        </div>
        {requests.map((request) => (
          <div className="request-row" key={request.id}>
            <Avatar
              teamId={request.requesterTeamId}
              initials={request.name
                .split(" ")
                .map((name) => name[0])
                .join("")}
            />
            <div className="request-main">
              <strong>{request.name}</strong>
              <span>
                {request.type} · {request.startPortion} {request.start} to{" "}
                {request.end} {request.endPortion} · {request.daysTaken} days
              </span>
            </div>
            <span className={`request-status ${request.status.toLowerCase()}`}>
              {request.status.toLowerCase()}
            </span>
            {isAdmin && request.status === "PENDING" && (
              <button
                className="approve-button"
                onClick={() => onReview(request.id, "APPROVE")}
              >
                Approve
              </button>
            )}
            {isAdmin && request.status === "APPROVED" && (
              <button
                className="approve-button"
                onClick={() =>
                  setConfirmation({ id: request.id, action: "UNAPPROVE" })
                }
              >
                Unapprove
              </button>
            )}
            {!isAdmin && request.requesterId === currentUserId && (
              <button
                className="reject-button"
                onClick={() =>
                  setConfirmation({ id: request.id, action: "DELETE" })
                }
              >
                Cancel
              </button>
            )}
            {isAdmin && request.status === "PENDING" && (
              <button
                className="reject-button"
                onClick={() =>
                  setConfirmation({ id: request.id, action: "DELETE" })
                }
              >
                Cancel
              </button>
            )}
            {canEdit(request) && (
              <button className="more-button" onClick={() => onEdit(request)}>
                <MoreHorizontal size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
      {confirmation && (
        <ConfirmationModal
          title={
            confirmation.action === "UNAPPROVE"
              ? "Unapprove request?"
              : "Cancel request?"
          }
          message={
            confirmation.action === "UNAPPROVE"
              ? "This will return the approved request to pending."
              : "This will permanently delete the leave request."
          }
          confirmLabel={
            confirmation.action === "UNAPPROVE" ? "Unapprove" : "Cancel request"
          }
          onClose={() => setConfirmation(null)}
          onConfirm={() => {
            onReview(confirmation.id, confirmation.action);
            setConfirmation(null);
          }}
        />
      )}
    </>
  );
}

function MonthView({
  date,
  requests,
  canEdit,
  onEdit,
  compact = false,
}: {
  date: Date;
  requests: Request[];
  canEdit: (request: Request) => boolean;
  onEdit: (request: Request) => void;
  compact?: boolean;
}) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  const totalCells = compact
    ? 35
    : Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const day = index - mondayOffset + 1;
    return day > 0 && day <= daysInMonth
      ? new Date(date.getFullYear(), date.getMonth(), day)
      : null;
  });
  return (
    <div className={compact ? "mini-calendar" : "calendar-month-view"}>
      {!compact && (
        <div className="calendar-weekdays">
          {shortDays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      )}
      <div className="calendar-days">
        {cells.map((cell, index) => {
          const dayRequests = cell
            ? requests.filter((request) => isInRequestDay(request, cell))
            : [];
          const firstRequest = dayRequests[0];
          const isToday =
            cell &&
            cell.getFullYear() === new Date().getFullYear() &&
            cell.getMonth() === new Date().getMonth() &&
            cell.getDate() === new Date().getDate();
          const dayClass = cell
            ? `calendar-day${firstRequest ? ` has-request ${firstRequest.color}` : ""}${isToday ? " today" : ""}`
            : "calendar-day empty";
          return (
            <div
              className={dayClass}
              key={cell ? dateKey(cell) : `empty-${index}`}
            >
              {cell && (
                <>
                  <span className={`date-number${isToday ? " today-mark" : ""}`}>
                    {cell.getDate()}
                  </span>
                  {!compact &&
                    dayRequests.map((request) => (
                      <button
                        className={`event ${request.color} ${request.status.toLowerCase()}`}
                        key={`${request.id}-${dateKey(cell)}`}
                        onClick={() => canEdit(request) && onEdit(request)}
                      >
                        <span>{request.name.split(" ")[0]}</span>
                        <small>{request.type}</small>
                      </button>
                    ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({
  year,
  requests,
  canEdit,
  onEdit,
}: {
  year: number;
  requests: Request[];
  canEdit: (request: Request) => boolean;
  onEdit: (request: Request) => void;
}) {
  return (
    <div className="year-grid">
      {Array.from({ length: 12 }, (_, month) => (
        <section className="mini-month" key={month}>
          <strong>{monthNames[month]}</strong>
          <MonthView
            compact
            date={new Date(year, month, 1)}
            requests={requests}
            canEdit={canEdit}
            onEdit={onEdit}
          />
        </section>
      ))}
    </div>
  );
}
function Stat({
  icon,
  color,
  label,
  value,
  valueClassName,
  detail,
  trend,
  progress,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  valueClassName?: string;
  detail: string;
  trend: string;
  progress?: string;
}) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${color}`}>{icon}</span>
      <div>
        <small>{label}</small>
        <strong className={valueClassName}>
          {value} <em>{detail}</em>
        </strong>
        <div className="progress">
            <i style={{ width: progress ?? "0%" }} />
        </div>
      </div>
      <span className="stat-trend neutral">{trend}</span>
    </div>
  );
}
