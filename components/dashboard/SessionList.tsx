"use client";

import { useState } from "react";

type DayFilter = "Hoy" | "Mañana";

const PATIENTS = [
  { id: 1, name: "María González",  initials: "MG", age: 34, session: "Hoy 10:00",    status: "confirmed" as const, tag: "Ansiedad",  color: "#8B7355", sessions: 12, next: "Hoy"    as DayFilter },
  { id: 2, name: "Carlos Mendoza",  initials: "CM", age: 28, session: "Hoy 11:30",    status: "pending"   as const, tag: "Depresión", color: "#4A7BA7", sessions: 7,  next: "Hoy"    as DayFilter },
  { id: 3, name: "Ana Reyes",       initials: "AR", age: 41, session: "Hoy 14:00",    status: "confirmed" as const, tag: "Trauma",    color: "#5C8A6E", sessions: 23, next: "Hoy"    as DayFilter },
  { id: 4, name: "Joaquín Torres",  initials: "JT", age: 19, session: "Mañana 9:00",  status: "confirmed" as const, tag: "TDAH",      color: "#C47B2B", sessions: 4,  next: "Mañana" as DayFilter },
  { id: 5, name: "Sofía Vargas",    initials: "SV", age: 52, session: "Mañana 15:30", status: "new"       as const, tag: "Estrés",    color: "#B5594A", sessions: 1,  next: "Mañana" as DayFilter },
];

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const TODAY_IDX = 2;
const CALENDAR_EVENTS: Record<number, { time: string; name: string; color: string }[]> = {
  0: [{ time: "9:00",  name: "Lucía Paredes",  color: "#5C8A6E" }],
  1: [{ time: "10:00", name: "María González", color: "#8B7355" }, { time: "11:30", name: "Carlos Mendoza", color: "#4A7BA7" }],
  2: [{ time: "10:00", name: "María González", color: "#8B7355" }, { time: "11:30", name: "Carlos Mendoza", color: "#4A7BA7" }, { time: "14:00", name: "Ana Reyes", color: "#5C8A6E" }],
  3: [{ time: "9:00",  name: "Pedro Salas",    color: "#C47B2B" }, { time: "16:00", name: "Laura Díaz",    color: "#B5594A" }],
  4: [{ time: "10:30", name: "Emilio Ruiz",    color: "#4A7BA7" }, { time: "13:00", name: "Claudia Mora",  color: "#8B7355" }],
  5: [], 6: [],
};

export function SessionList() {
  const [dayFilter, setDayFilter] = useState<DayFilter>("Hoy");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* SESSIONS */}
      <div className="card" style={{ padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="sec-t" style={{ margin: 0 }}>Sesiones</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {(["Hoy", "Mañana"] as const).map((d) => (
              <span key={d} className={`chip${dayFilter === d ? " on" : ""}`} onClick={() => setDayFilter(d)}>{d}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {PATIENTS.filter((p) => p.next === dayFilter).map((p) => (
            <div key={p.id} className="p-row" style={{ flexWrap: "wrap", gap: 8 }}>
              <div className="avatar" style={{ background: `${p.color}18`, color: p.color }}>{p.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{p.name}</span>
                  <span className="tag" style={{ background: `${p.color}14`, color: p.color }}>{p.tag}</span>
                  {p.status === "new" && <span className="tag" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>Nueva</span>}
                </div>
                <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  Sesión #{p.sessions} · {p.session.split(" ")[1]}
                  <span style={{ marginLeft: 6, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.status === "confirmed" ? "var(--green)" : p.status === "pending" ? "var(--amber)" : "var(--blue)", display: "inline-block" }} />
                    {p.status === "confirmed" ? "Confirmada" : p.status === "pending" ? "Pendiente" : "Primera vez"}
                  </span>
                </div>
              </div>
              <button className="btn-g" style={{ padding: "5px 10px", fontSize: 11, alignSelf: "center" }}>Ver</button>
            </div>
          ))}
        </div>
      </div>

      {/* WEEKLY STRIP */}
      <div className="card" style={{ padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="sec-t" style={{ margin: 0 }}>Semana en curso</h2>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--text-muted)" }}>Ene 5–11</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
          {WEEK_DAYS.map((d, i) => {
            const evs = CALENDAR_EVENTS[i] ?? [];
            const isToday = i === TODAY_IDX;
            return (
              <div key={i} className={`cal-d${isToday ? " today" : ""}`} style={{ flex: 1 }}>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 10, fontWeight: 500, color: isToday ? "#FAF7F2" : "var(--text-muted)" }}>{d}</span>
                <span style={{ fontFamily: "var(--font-lora)", fontSize: 14, fontWeight: 600, color: isToday ? "#FAF7F2" : "var(--text-primary)" }}>{5 + i}</span>
                <div style={{ display: "flex", gap: 2, minHeight: 5 }}>
                  {evs.slice(0, 3).map((e, j) => (
                    <span key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: isToday ? "rgba(250,247,242,.6)" : e.color }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 14 }}>
          <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Próximas — hoy</div>
          {(CALENDAR_EVENTS[TODAY_IDX] ?? []).map((ev, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 3, height: 32, borderRadius: 2, background: ev.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{ev.name}</div>
                <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--text-muted)" }}>{ev.time} · 50 min</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}