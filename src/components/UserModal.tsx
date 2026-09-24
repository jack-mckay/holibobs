"use client";

import { ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { Member, Role } from "./types";

export function UserModal({
  user,
  teams,
  onClose,
  onSave,
}: {
  user: Member | null;
  teams: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSave: (values: {
    name: string;
    email: string;
    password?: string;
    confirmPassword?: string;
    role?: Role;
    teamId: number;
    holidayAllowance: number;
    userId?: number;
  }) => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>((user?.role as Role) ?? "USER");
  const [teamId, setTeamId] = useState(user?.teamId ?? teams[0]?.id ?? 1);
  const [allowance, setAllowance] = useState(String(user?.allowance ?? 27));
  const handleAllowanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^-?\d*$/.test(raw)) setAllowance(raw);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal user-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="kicker">{user ? "Edit user" : "Add user"}</span>
            <h2>{user ? "Update user details" : "Create a user"}</h2>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label>
          {user ? "Update password" : "Password"}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        {user && (
          <label>
            Role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super admin</option>
            </select>
          </label>
        )}
        <div className="date-fields">
          <label>
            Team
            <select
              value={teamId}
              onChange={(event) => setTeamId(Number(event.target.value))}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Holiday allowance
            <input
              type="number"
              value={allowance}
              onChange={handleAllowanceChange}
            />
          </label>
        </div>
        <div className="modal-footer">
          <button
            className="primary-button"
            disabled={
              !name ||
              !email ||
              (!user && !password) ||
              (password.length > 0 && password !== confirmPassword)
            }
            onClick={() =>
              onSave({
                name,
                email,
                password: password || undefined,
                confirmPassword: password ? confirmPassword : undefined,
                role: user ? role : undefined,
                teamId,
                holidayAllowance: Number(allowance),
                userId: user?.id,
              })
            }
          >
            {user ? "Save changes" : "Add user"} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
