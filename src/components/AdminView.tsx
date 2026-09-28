"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

type RequiredLeave = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  recurring: boolean;
};
type LeaveType = { id: number; code: string; name: string; active: boolean };

async function readJson<T>(response: Response, message: string): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? message);
  return data as T;
}

function formatDateRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  const start = formatter.format(new Date(`${startDate}T00:00:00Z`));
  return startDate === endDate
    ? start
    : `${start} – ${formatter.format(new Date(`${endDate}T00:00:00Z`))}`;
}

export function AdminView({ onNotice }: { onNotice: (message: string) => void }) {
  const [requiredLeave, setRequiredLeave] = useState<RequiredLeave[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requiredName, setRequiredName] = useState("");
  const [requiredStartDate, setRequiredStartDate] = useState("");
  const [requiredEndDate, setRequiredEndDate] = useState("");
  const [requiredRecurring, setRequiredRecurring] = useState(false);
  const [requiredModalOpen, setRequiredModalOpen] = useState(false);
  const [editingRequiredId, setEditingRequiredId] = useState<number | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [typeName, setTypeName] = useState("");
  const [requiredError, setRequiredError] = useState("");
  const [typeError, setTypeError] = useState("");
  const [loadError, setLoadError] = useState("");

  async function refresh() {
    const [requiredResponse, typesResponse] = await Promise.all([
      fetch("/api/holidays"),
      fetch("/api/leave-types?manage=true"),
    ]);
    try {
      const [dates, types] = await Promise.all([
        readJson<RequiredLeave[]>(requiredResponse, "Could not load required leave"),
        readJson<LeaveType[]>(typesResponse, "Could not load leave types"),
      ]);
      setRequiredLeave(dates);
      setLeaveTypes(types);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load Admin settings");
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/holidays"),
      fetch("/api/leave-types?manage=true"),
    ])
      .then(async ([datesResponse, typesResponse]) => Promise.all([
        readJson<RequiredLeave[]>(datesResponse, "Could not load required leave"),
        readJson<LeaveType[]>(typesResponse, "Could not load leave types"),
      ]))
      .then(([dates, types]) => {
        if (active) {
          setRequiredLeave(dates);
          setLeaveTypes(types);
          setLoadError("");
        }
      })
      .catch((error: unknown) => {
        if (active)
          setLoadError(error instanceof Error ? error.message : "Could not load Admin settings");
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveRequiredLeave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingRequiredId,
        name: requiredName,
        startDate: requiredStartDate,
        endDate: requiredEndDate,
        recurring: requiredRecurring,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setRequiredError(data.error ?? "Could not save required leave");
      return;
    }
    setEditingRequiredId(null);
    setRequiredName("");
    setRequiredStartDate("");
    setRequiredEndDate("");
    setRequiredRecurring(false);
    setRequiredError("");
    setRequiredModalOpen(false);
    await refresh();
    onNotice(editingRequiredId ? "Required leave updated" : "Required leave added");
  }

  async function deleteRequiredLeave(item: RequiredLeave) {
    const response = await fetch("/api/holidays", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    const data = await response.json();
    if (!response.ok) {
      setRequiredError(data.error ?? "Could not remove required leave");
      return;
    }
    if (editingRequiredId === item.id) resetRequiredForm();
    await refresh();
    onNotice("Required leave removed");
  }

  function resetRequiredForm() {
    setEditingRequiredId(null);
    setRequiredName("");
    setRequiredStartDate("");
    setRequiredEndDate("");
    setRequiredRecurring(false);
    setRequiredError("");
    setRequiredModalOpen(false);
  }

  function openRequiredLeave(item?: RequiredLeave) {
    setEditingRequiredId(item?.id ?? null);
    setRequiredName(item?.name ?? "");
    setRequiredStartDate(item?.startDate ?? "");
    setRequiredEndDate(item?.endDate ?? "");
    setRequiredRecurring(item?.recurring ?? false);
    setRequiredError("");
    setRequiredModalOpen(true);
  }

  async function saveLeaveType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = leaveTypes.find((type) => type.id === editingTypeId);
    if (!item) return;
    const response = await fetch("/api/leave-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, name: typeName, active: item.active }),
    });
    const data = await response.json();
    if (!response.ok) {
      setTypeError(data.error ?? "Could not save leave type");
      return;
    }
    setEditingTypeId(null);
    setTypeName("");
    setTypeError("");
    await refresh();
    onNotice("Leave type updated");
  }

  async function toggleLeaveType(item: LeaveType) {
    const response = await fetch("/api/leave-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, name: item.name, active: !item.active }),
    });
    const data = await response.json();
    if (!response.ok) {
      setTypeError(data.error ?? "Could not update leave type");
      return;
    }
    setTypeError("");
    await refresh();
    onNotice(item.active ? "Leave type deactivated" : "Leave type activated");
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="kicker">Super admin settings</p>
          <h1>Admin</h1>
        </div>
      </div>
      {loadError && <p className="form-error admin-load-error" role="alert">{loadError}</p>}
      <section className="panel holiday-panel">
        <div className="section-heading">
          <div>
            <h2>Required leave</h2>
            <p>These dates appear on everyone’s calendar and do not use holiday allowance.</p>
          </div>
          <button className="primary-button" onClick={() => openRequiredLeave()}>
            <Plus size={17} /> Add required leave
          </button>
        </div>
        {requiredError && !requiredModalOpen && <p className="form-error" role="alert">{requiredError}</p>}
        <div className="holiday-list">
          {requiredLeave.length ? requiredLeave.map((item) => (
            <div className="holiday-row" key={item.id}>
              <CalendarDays size={18} />
              <strong>{item.name}</strong>
              <span>
                {formatDateRange(item.startDate, item.endDate)}
                {item.recurring && " · Every year"}
              </span>
              <div className="holiday-actions">
                <button className="round-button" onClick={() => openRequiredLeave(item)} aria-label={`Edit ${item.name}`}>
                  <Pencil size={16} />
                </button>
                <button className="round-button" onClick={() => void deleteRequiredLeave(item)} aria-label={`Remove ${item.name}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )) : <p className="holiday-empty">No required leave configured.</p>}
        </div>
      </section>
      <section className="panel holiday-panel">
        <div className="section-heading">
          <div>
            <h2>Leave types</h2>
            <p>Rename types or choose which ones appear when booking leave.</p>
          </div>
        </div>
        <div className="holiday-list">
          {leaveTypes.map((item) => (
            <div className="holiday-row leave-type-row" key={item.id}>
              <span className={`leave-type-status${item.active ? " active" : ""}`} aria-label={item.active ? "Active" : "Inactive"}>
                {item.active && <Check size={10} />}
              </span>
              <strong>{item.name}</strong>
              <span>{item.active ? "Active" : "Inactive"}</span>
              <div className="holiday-actions">
                <button className="round-button" onClick={() => {
                  setEditingTypeId(item.id);
                  setTypeName(item.name);
                  setTypeError("");
                }} aria-label={`Edit ${item.name}`}>
                  <Pencil size={16} />
                </button>
                <button className="secondary-button" onClick={() => void toggleLeaveType(item)} disabled={item.code === "HOLIDAY"}>
                  {item.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {editingTypeId !== null && (
          <form className="leave-type-form" onSubmit={saveLeaveType}>
            <label>
              Leave type name
              <input value={typeName} onChange={(event) => setTypeName(event.target.value)} maxLength={191} required />
            </label>
            <div className="holiday-form-actions">
              <button className="primary-button" type="submit"><Save size={17} /> Save changes</button>
              <button className="secondary-button" type="button" onClick={() => { setEditingTypeId(null); setTypeName(""); setTypeError(""); }}><X size={17} /> Cancel</button>
            </div>
          </form>
        )}
        {typeError && <p className="form-error" role="alert">{typeError}</p>}
      </section>
      {requiredModalOpen && (
        <div className="modal-backdrop" onClick={resetRequiredForm}>
          <section
            className="modal required-leave-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="required-leave-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="kicker">Required leave</span>
                <h2 id="required-leave-modal-title">
                  {editingRequiredId ? "Edit required leave" : "Add required leave"}
                </h2>
              </div>
              <button className="close-button" onClick={resetRequiredForm} aria-label="Close">
                <X size={19} />
              </button>
            </div>
            <form onSubmit={saveRequiredLeave}>
              <label>
                Name
                <input value={requiredName} onChange={(event) => setRequiredName(event.target.value)} maxLength={191} required />
              </label>
              <div className="date-fields">
                <label>
                  Start date
                  <input
                    type="date"
                    value={requiredStartDate}
                    onChange={(event) => {
                      setRequiredStartDate(event.target.value);
                      if (requiredEndDate && event.target.value > requiredEndDate)
                        setRequiredEndDate(event.target.value);
                    }}
                    required
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    value={requiredEndDate}
                    min={requiredStartDate || undefined}
                    onChange={(event) => setRequiredEndDate(event.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="required-recurring-control">
                <input
                  type="checkbox"
                  checked={requiredRecurring}
                  onChange={(event) => setRequiredRecurring(event.target.checked)}
                />
                Repeat every year
              </label>
              {requiredError && <p className="form-error" role="alert">{requiredError}</p>}
              <div className="modal-footer required-leave-footer">
                <button className="secondary-button" type="button" onClick={resetRequiredForm}>Cancel</button>
                <button className="primary-button" type="submit">
                  <Save size={17} /> {editingRequiredId ? "Save changes" : "Add required leave"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}