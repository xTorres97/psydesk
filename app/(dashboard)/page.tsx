import { StatCard } from "@/components/dashboard/StatCard";
import { SessionList } from "@/components/dashboard/SessionList";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";

const STATS = [
  { label: "Sesiones hoy",      value: "6",   sub: "2 confirmadas, 4 pendientes", color: "accent" as const, icon: "🗓" },
  { label: "Pacientes activos", value: "34",  sub: "+2 este mes",                 color: "green"  as const, icon: "👤" },
  { label: "Tests pendientes",  value: "3",   sub: "Por revisar",                 color: "amber"  as const, icon: "📋" },
  { label: "Horas esta semana", value: "18h", sub: "De 24h estimadas",            color: "blue"   as const, icon: "⏱" },
];

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-lora)", fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
          Resumen del día
        </h1>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Miércoles, 7 de enero de 2026
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Grid principal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <SessionList />
        <AlertsPanel />
      </div>

    </div>
  );
}