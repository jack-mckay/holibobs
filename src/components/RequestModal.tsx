"use client";

import { ChevronRight, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { calculateDaysTaken } from "@/lib/leave";
import type { DayPortion, Request } from "./types";

export function RequestModal({
  request,
  onClose,
  onSave,
}: {
  request: Request | null;
  onClose: () => void;
  onSave: (values: {
    start: string;
    end: string;
    type: string;
    startPortion: DayPortion;
    endPortion: DayPortion;
    note: string;
  }) => void;
}) {
  const [leaveTypes, setLeaveTypes] = useState<
    Array<{ code: string; name: string }>
  >([]);
  const [type, setType] = useState("HOLIDAY");
  const [start, setStart] = useState(request?.start ?? new Date().toISOString().split("T")[0]);
  const [end, setEnd] = useState(request?.end ?? new Date().toISOString().split("T")[0]);
  const [startPortion, setStartPortion] = useState<DayPortion>(
    request?.startPortion ?? "AM",
  );
  const [endPortion, setEndPortion] = useState<DayPortion>(
    request?.endPortion ?? "PM",
  );
  const [note, setNote] = useState("");
  useEffect(() => {
    fetch("/api/leave-types")
      .then((response) => (response.ok ? response.json() : []))
      .then((types: Array<{ code: string; name: string }>) => {
        setLeaveTypes(types);
        if (request) {
          const selectedType = types.find(
            (leaveType) => leaveType.name === request.type,
          );
          if (selectedType) setType(selectedType.code);
        }
      });
  }, []);
  const total = calculateDaysTaken(
    new Date(`${start}T12:00:00`),
    new Date(`${end}T12:00:00`),
    startPortion,
    endPortion,
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="kicker">
              {request ? "Edit request" : "New request"}
            </span>
            <h2>{request ? request.name : "Request time off"}</h2>
            <p className="label-description">
              Please fill out the details of your leave request.<br></br>
              <strong>Tip: use AM or PM to book half days off.</strong>
            </p>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <label>
          Leave type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {leaveTypes.map((leaveType) => (
              <option key={leaveType.code} value={leaveType.code}>
                {leaveType.name}
              </option>
            ))}
          </select>
        </label>
        <div className="date-fields">
          <label>
            Start date
            <input
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
            <select
              value={startPortion}
              onChange={(event) =>
                setStartPortion(event.target.value as DayPortion)
              }
            >
              <option>AM</option>
              <option>PM</option>
            </select>
          </label>
          <label>
            End date
            <input
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
            <select
              value={endPortion}
              onChange={(event) =>
                setEndPortion(event.target.value as DayPortion)
              }
            >
              <option>AM</option>
              <option>PM</option>
            </select>
          </label>
        </div>
        <p className="day-total">
          {total === null ? "Choose a valid range" : `${total} days requested`}
        </p>
        <label>
          Note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="modal-footer">
          <span>
            <ShieldCheck size={15} /> Admin approval required
          </span>
          <button
            className="primary-button"
            disabled={total === null}
            onClick={() =>
              onSave({ start, end, type, startPortion, endPortion, note })
            }
          >
            {request ? "Save changes" : "Send request"}{" "}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
