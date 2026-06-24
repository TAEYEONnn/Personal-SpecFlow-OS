"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { CaretDown, Plus, GearSix } from "@phosphor-icons/react";

type Team = { id: string; name: string };

const STORAGE_KEY = "specflow:lastTeamId";

export function TeamSwitcher({
  teams,
  activeTeamId,
  onSwitch,
}: {
  teams: Team[];
  activeTeamId: string | null;
  onSwitch: (teamId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(teamId: string | null) {
    if (teamId) localStorage.setItem(STORAGE_KEY, teamId);
    else localStorage.removeItem(STORAGE_KEY);
    onSwitch(teamId);
    setOpen(false);
  }

  return (
    <div className="team-switcher" ref={ref}>
      <button
        className="team-switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="team-switcher-label">
          {activeTeam ? activeTeam.name : "전체 프로젝트"}
        </span>
        <CaretDown size={14} weight="bold" />
      </button>
      {open && (
        <div className="team-switcher-menu">
          <button
            className={`team-switcher-item${activeTeamId === null ? " team-switcher-item--active" : ""}`}
            onClick={() => select(null)}
          >
            전체 프로젝트
          </button>
          {teams.map((t) => (
            <button
              key={t.id}
              className={`team-switcher-item${activeTeamId === t.id ? " team-switcher-item--active" : ""}`}
              onClick={() => select(t.id)}
            >
              {t.name}
            </button>
          ))}
          <div className="team-switcher-divider" />
          {activeTeamId && (
            <Link className="team-switcher-item" href={`/teams/${activeTeamId}`}>
              <GearSix size={14} /> 팀 설정
            </Link>
          )}
          <Link className="team-switcher-item" href="/teams/new">
            <Plus size={14} /> 새 팀 만들기
          </Link>
        </div>
      )}
    </div>
  );
}

export function useLastTeamId(teams: Team[]): [string | null, (id: string | null) => void] {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      if (teams.some((t) => t.id === saved)) setActiveTeamId(saved);
      else localStorage.removeItem(STORAGE_KEY);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [teams]);

  function setAndPersist(id: string | null) {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
    setActiveTeamId(id);
  }

  return [activeTeamId, setAndPersist];
}
