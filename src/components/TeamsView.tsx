"use client";

import { Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Member, Session } from "./types";
import { teamColor } from "./types";
import { Avatar } from "./Avatar";
import { UserModal } from "./UserModal";

export function TeamsView({
  session,
  onNotice,
}: {
  session: Session;
  onNotice: (message: string) => void;
}) {
  const [people, setPeople] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Member | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  async function loadData() {
    const [peopleResponse, teamsResponse] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/teams"),
    ]);
    const peopleData = await peopleResponse.json();
    const teamsData = await teamsResponse.json();
    setPeople(
      peopleData.map((person: Record<string, unknown>) => {
        const teamId = Number(person.teamId);
        return {
          id: Number(person.id),
          name: String(person.name),
          email: String(person.email),
          initials: String(person.name)
            .split(" ")
            .map((part) => part[0])
            .join(""),
          role: String(person.role),
          team: String(person.team),
          teamId,
          allowance: Number(person.holidayAllowance),
          takenDays: Number(person.takenDays ?? 0),
          accent: teamColor(teamId),
        };
      }),
    );
    setTeams(teamsData);
  }
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/users"), fetch("/api/teams")]).then(
      async ([peopleResponse, teamsResponse]) => {
        const peopleData = await peopleResponse.json();
        const teamsData = await teamsResponse.json();
        if (!active) return;
        setPeople(
          peopleData.map((person: Record<string, unknown>) => {
            const teamId = Number(person.teamId);
            return {
              id: Number(person.id),
              name: String(person.name),
              email: String(person.email),
              initials: String(person.name)
                .split(" ")
                .map((part) => part[0])
                .join(""),
              role: String(person.role),
              team: String(person.team),
              teamId,
              allowance: Number(person.holidayAllowance),
              takenDays: Number(person.takenDays ?? 0),
              accent: teamColor(teamId),
            };
          }),
        );
        setTeams(teamsData);
      },
    );
    return () => {
      active = false;
    };
  }, []);
  const groupedPeople = useMemo(
    () =>
      teams
        .map((team) => ({
          team,
          people: people.filter(
            (person) =>
              person.teamId === team.id &&
              `${person.name} ${person.email} ${person.team}`
                .toLowerCase()
                .includes(search.toLowerCase()),
          ),
        }))
        .filter((group) => group.people.length > 0),
    [people, teams, search],
  );

  async function saveUser(values: {
    name: string;
    email: string;
    password?: string;
    confirmPassword?: string;
    teamId: number;
    holidayAllowance: number;
    userId?: number;
  }) {
    const response = await fetch("/api/users", {
      method: values.userId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        values.userId
          ? values
          : {
              name: values.name,
              email: values.email,
              password: values.password,
              teamId: values.teamId,
              holidayAllowance: values.holidayAllowance,
            },
      ),
    });
    const data = await response.json();
    if (!response.ok) return onNotice(data.error);
    setModalOpen(false);
    setEditing(null);
    await loadData();
    onNotice(values.userId ? "User updated" : "User added");
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="kicker">Team directory</p>
          <h1>Teams</h1>
          <p className="subheading">
            All users and assigned teams.
          </p>
        </div>
        <div className="team-heading-actions">
          <label className="team-search">
            <span>Search people</span>
            <input
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or team"
            />
          </label>
          {isSuperAdmin && (
            <button
              className="primary-button team-add-button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus size={16} /> Add user
            </button>
          )}
        </div>
      </div>
      <div className="team-grid">
        {teams.map((team) => (
          <section className="team-card" key={team.id}>
            <div className="team-card-head">
              <span className={`team-symbol team-${team.id - 1}`}>
                <Users size={17} />
              </span>
              <div>
                <h3>{team.name}</h3>
                <span>
                  {people.filter((person) => person.teamId === team.id).length}{" "}
                  people
                </span>
              </div>
            </div>
            <div className="team-status">
              <strong>
                {team.id === session.teamId && "Your team"}
              </strong>
            </div>
          </section>
        ))}
      </div>
      {groupedPeople.map(({ team, people: teamPeople }) => (
        <section className="team-section" key={team.id}>
          <div className="team-section__heading">
            <h2>{team.name}</h2>
            <span>{teamPeople.length} people</span>
          </div>
          <section className="panel people-panel">
            <div className="people-list">
              {teamPeople.map((person) => (
                <div className="person-row" key={person.id}>
                  <Avatar teamId={person.teamId} initials={person.initials} />
                  <span className="person-copy">
                    <strong>{person.name}</strong>
                    <small>
                      {person.role.replace(/_/g, " ").toLowerCase()}
                    </small>
                  </span>
                  <span className="person-allowance">
                    <small>Days taken</small>
                    <span className="person-allowance__values">
                      <strong className={person.takenDays > person.allowance ? "over-limit" : undefined}>
                        {person.takenDays} / {person.allowance} days
                      </strong>
                    </span>
                  </span>
                  {isSuperAdmin && (
                    <span className="person-actions">
                      <button
                        className="person-edit-button"
                        onClick={() => {
                          setEditing(person);
                          setModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </section>
      ))}
      {modalOpen && (
        <UserModal
          user={editing}
          teams={teams}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={saveUser}
        />
      )}
    </>
  );
}
