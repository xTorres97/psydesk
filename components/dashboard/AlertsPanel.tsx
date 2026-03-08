"use client";

const ALERTS = [
  { icon: "📋", text: "PHQ-9 pendiente de revisar — María González",    type: "amber" as const },
  { icon: "🔔", text: "Carlos Mendoza confirmó su cita de las 11:30",  type: "green" as const },
  { icon: "📝", text: "Nota de sesión sin completar — Ana Reyes (ayer)", type: "red" as const },
];

const QUICK_ACTIONS = [
  { icon: "👤", label: "Nuevo paciente" },
  { icon: "📋", label: "Enviar test"    },
  { icon: "📝", label: "Nueva nota"     },
  { icon: "📅", label: "Agendar cita"  },
];

const PROGRESS = [
  { name: "María G.",  tag: "PHQ-9",  from: 18, to: 11, max: 27, trend: "↓ Mejora",      color: "#5C8A6E" },
  { name: "Carlos M.", tag: "GAD-7",  from: 14, to: 12, max: 21, trend: "↓ Leve mejora", color: "#4A7BA7" },
  { name: "Ana R.",    tag: "BDI-II", from: 22, to: 15, max: 63, trend: "↓ Mejora",      color: "#8B7355" },
];

export function AlertsPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ALERTS */}
      <div className="card" style={{ padding: "20px 20px" }}>
        <h2 className="sec-t">Avisos</h2>
        {ALERTS.map((a, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 14px", borderRadius: 10, marginBottom: 6,
            fontFamily: "var(--font-dm-sans)", fontSize: 13,
            background: a.type === "amber" ? "var(--amber-bg)" : a.type === "green" ? "var(--green-bg)" : "var(--red-bg)",
            border: `1px solid ${a.type === "amber" ? "var(--amber)" : a.type === "green" ? "var(--green)" : "var(--red)"}22`,
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{a.icon}</span>
            <span style={{ color: "var(--text-primary)", lineHeight: 1.4 }}>{a.text}</span>
          </div>
        ))}
        <button className="btn-g" style={{ width: "100%", marginTop: 8 }}>Ver todos los avisos</button>
      </div>

      {/* QUICK ACTIONS */}
      <div className="card" style={{ padding: "20px 20px" }}>
        <h2 className="sec-t">Acciones rápidas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {QUICK_ACTIONS.map((a, i) => (
            <button key={i}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border-light)", cursor: "pointer", transition: "all .15s", fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; }}
            >
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* PROGRESS */}
      <div className="card" style={{ padding: "20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 className="sec-t" style={{ margin: 0 }}>Evolución reciente</h2>
          <button className="btn-g" style={{ padding: "4px 10px", fontSize: 11 }}>Ver más</button>
        </div>
        {PROGRESS.map((p, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <div>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{p.name}</span>
                <span style={{ marginLeft: 6, fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "var(--text-muted)" }}>{p.tag}</span>
              </div>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: p.color, fontWeight: 500 }}>{p.trend}</span>
            </div>
            <div className="pbar">
              <div className="pfill" style={{ width: `${(p.to / p.max) * 100}%`, background: p.color }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 10, color: "var(--text-muted)" }}>Antes: {p.from}</span>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 10, color: "var(--text-muted)" }}>Ahora: {p.to}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}