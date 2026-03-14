// src/components/dashboard/AlertsPanel.tsx
"use client";

import { useRouter } from "next/navigation";

interface Alert {
  icon: string;
  text: string;
  type: "amber" | "green" | "red";
  href?: string;
}

interface ProgressItem {
  name: string;
  tag: string;
  from: number;
  to: number;
  max: number;
  trend: string;
  color: string;
  trendUp: boolean;
}

interface AlertsPanelProps {
  alerts: Alert[];
  progress: ProgressItem[];
  onNewPatient: () => void;
  onSendTest: () => void;
  onNewNote: () => void;
  onNewAppointment: () => void;
}

const QUICK_ACTIONS = [
  { icon: "👤", label: "Nuevo paciente", key: "patient"     },
  { icon: "📋", label: "Enviar test",    key: "test"        },
  { icon: "📝", label: "Nueva nota",     key: "note"        },
  { icon: "📅", label: "Agendar cita",   key: "appointment" },
];

export function AlertsPanel({ alerts, progress, onNewPatient, onSendTest, onNewNote, onNewAppointment }: AlertsPanelProps) {
  const router = useRouter();

  function handleAction(key: string) {
    if (key === "patient")     onNewPatient();
    if (key === "test")        onSendTest();
    if (key === "note")        onNewNote();
    if (key === "appointment") onNewAppointment();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* AVISOS */}
      <div className="card" style={{ padding: "20px 16px" }}>
        <h2 className="sec-t">Avisos</h2>
        {alerts.length === 0 ? (
          <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
            ✅ Sin avisos pendientes
          </div>
        ) : (
          alerts.map((a, i) => (
            <div key={i}
              onClick={() => a.href && router.push(a.href)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 12px", borderRadius: 10, marginBottom: 6,
                fontFamily: "var(--font-dm-sans)", fontSize: 13,
                background: a.type === "amber" ? "var(--amber-bg)" : a.type === "green" ? "var(--green-bg)" : "var(--red-bg)",
                border: `1px solid ${a.type === "amber" ? "var(--amber)" : a.type === "green" ? "var(--green)" : "var(--red)"}22`,
                cursor: a.href ? "pointer" : "default",
                transition: "opacity .15s",
              }}
              onMouseEnter={e => { if (a.href) (e.currentTarget as HTMLDivElement).style.opacity = "0.8"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{a.icon}</span>
              <span style={{ color: "var(--text-primary)", lineHeight: 1.4 }}>{a.text}</span>
            </div>
          ))
        )}
        <button className="btn-g" style={{ width: "100%", marginTop: 8 }}
          onClick={() => router.push("/dashboard/tests")}>
          Ver todos los avisos
        </button>
      </div>

      {/* ACCIONES RÁPIDAS */}
      <div className="card" style={{ padding: "20px 16px" }}>
        <h2 className="sec-t">Acciones rápidas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {QUICK_ACTIONS.map((a) => (
            <button key={a.key} onClick={() => handleAction(a.key)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border-light)", cursor: "pointer", transition: "all .15s", fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-bg)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)44"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-light)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
            >
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* EVOLUCIÓN RECIENTE */}
      <div className="card" style={{ padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 className="sec-t" style={{ margin: 0 }}>Evolución reciente</h2>
          <button className="btn-g" style={{ padding: "4px 10px", fontSize: 11 }}
            onClick={() => router.push("/dashboard/reportes")}>
            Ver más
          </button>
        </div>
        {progress.length === 0 ? (
          <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
            Sin datos de tests aún
          </div>
        ) : (
          progress.map((p, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <div>
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{p.name}</span>
                  <span style={{ marginLeft: 6, fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "var(--text-muted)" }}>{p.tag}</span>
                </div>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: p.trendUp ? "var(--red)" : "var(--green)", fontWeight: 500 }}>{p.trend}</span>
              </div>
              <div className="pbar">
                <div className="pfill" style={{ width: `${Math.min((p.to / p.max) * 100, 100)}%`, background: p.color }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 10, color: "var(--text-muted)" }}>Anterior: {p.from}</span>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 10, color: "var(--text-muted)" }}>Actual: {p.to}/{p.max}</span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}