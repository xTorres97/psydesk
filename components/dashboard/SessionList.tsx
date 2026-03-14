// src/components/dashboard/SessionList.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DayFilter = "Hoy" | "Mañana";

interface SessionAppt {
  id: string;
  patientName: string;
  initials: string;
  color: string;
  tag: string;
  sessionNum: number;
  time: string;
  status: "programada" | "completada" | "cancelada" | "no_asistio";
  modality: string;
  patientId: string;
  isNew: boolean;
}

interface WeekDay {
  label: string;
  num: number;
  iso: string;
  events: { color: string }[];
  isToday: boolean;
}

interface TodayEvent {
  name: string;
  time: string;
  color: string;
}

interface SessionListProps {
  todayAppts: SessionAppt[];
  tomorrowAppts: SessionAppt[];
  weekDays: WeekDay[];
  todayEvents: TodayEvent[];
  weekLabel: string;
  onNewAppointment: () => void;
  allWeekEvents: Record<string, TodayEvent[]>;
}

const AVATAR_COLORS = ["#8B7355","#4A7BA7","#5C8A6E","#C47B2B","#B5594A","#7B6EA8","#A85E6A","#6A9E8A"];
const STATUS_LABEL: Record<string, string> = {
  programada: "Programada", completada: "Completada", cancelada: "Cancelada", no_asistio: "No asistió",
};
const STATUS_COLOR: Record<string, string> = {
  programada: "var(--amber)", completada: "var(--green)", cancelada: "var(--red)", no_asistio: "var(--text-muted)",
};
const MODALITY_ICON: Record<string, string> = {
  presencial: "🏢", videollamada: "📹", telefono: "📞",
};

export function SessionList({ todayAppts, tomorrowAppts, weekDays, todayEvents, weekLabel, onNewAppointment, allWeekEvents }: SessionListProps) {
  const [dayFilter, setDayFilter] = useState<DayFilter>("Hoy");
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);
  const router = useRouter();

  const appts = dayFilter === "Hoy" ? todayAppts : tomorrowAppts;

  // Día seleccionado en el strip — por defecto hoy
  const todayDay = weekDays.find(d => d.isToday);
  const activeISO = selectedDayISO ?? todayDay?.iso ?? null;
  const activeEvents = activeISO ? (allWeekEvents[activeISO] ?? []) : todayEvents;
  const activeDayLabel = weekDays.find(d => d.iso === activeISO);
  const activeDayNum   = activeDayLabel ? `${activeDayLabel.num} ${activeDayLabel.label}` : "hoy";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* SESIONES */}
      <div className="card" style={{ padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="sec-t" style={{ margin: 0 }}>Sesiones</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {(["Hoy", "Mañana"] as const).map((d) => (
              <span key={d} className={`chip${dayFilter === d ? " on" : ""}`} onClick={() => setDayFilter(d)}>{d}</span>
            ))}
          </div>
        </div>

        {appts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontFamily: "var(--font-dm-sans)", fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
            Sin citas {dayFilter === "Hoy" ? "hoy" : "mañana"}
            <div style={{ marginTop: 12 }}>
              <button className="btn-p" style={{ fontSize: 12, padding: "6px 14px" }} onClick={onNewAppointment}>+ Agendar cita</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {appts.map((p) => (
              <div key={p.id} className="p-row" style={{ flexWrap: "wrap", gap: 8 }}>
                <div className="avatar" style={{ background: `${p.color}18`, color: p.color }}>{p.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{p.patientName}</span>
                    {p.tag && <span className="tag" style={{ background: `${p.color}14`, color: p.color }}>{p.tag}</span>}
                    {p.isNew && <span className="tag" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>Nueva</span>}
                  </div>
                  <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {MODALITY_ICON[p.modality] ?? "🏢"} Sesión #{p.sessionNum} · {p.time}
                    <span style={{ marginLeft: 6, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_COLOR[p.status] ?? "var(--amber)", display: "inline-block" }} />
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                </div>
                <button className="btn-g" style={{ padding: "5px 10px", fontSize: 11, alignSelf: "center" }}
                  onClick={() => router.push(`/dashboard/expedientes?patientId=${p.patientId}`)}>
                  Ver
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEMANA EN CURSO */}
      <div className="card" style={{ padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="sec-t" style={{ margin: 0 }}>Semana en curso</h2>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--text-muted)" }}>{weekLabel}</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
          {weekDays.map((d, i) => {
            const isSelected = d.iso === activeISO;
            return (
              <div key={i}
                className={`cal-d${d.isToday ? " today" : ""}`}
                style={{ flex: 1, cursor: "pointer", outline: isSelected && !d.isToday ? "2px solid var(--accent)" : "none", outlineOffset: 2, borderRadius: 8, transition: "all .15s" }}
                onClick={() => setSelectedDayISO(d.iso)}
              >
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 10, fontWeight: 500, color: d.isToday ? "#FAF7F2" : "var(--text-muted)" }}>{d.label}</span>
                <span style={{ fontFamily: "var(--font-lora)", fontSize: 14, fontWeight: 600, color: d.isToday ? "#FAF7F2" : "var(--text-primary)" }}>{d.num}</span>
                <div style={{ display: "flex", gap: 2, minHeight: 5 }}>
                  {d.events.slice(0, 3).map((e, j) => (
                    <span key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: d.isToday ? "rgba(250,247,242,.6)" : e.color }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 14 }}>
          <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            Citas — {activeDayLabel?.isToday ? "hoy" : activeDayNum}
          </div>
          {activeEvents.length === 0 ? (
            <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>Sin sesiones este día</div>
          ) : (
            activeEvents.map((ev, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 3, height: 32, borderRadius: 2, background: ev.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{ev.name}</div>
                  <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--text-muted)" }}>{ev.time} · 50 min</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}