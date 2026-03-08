interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  color: "accent" | "green" | "amber" | "blue";
  icon: string;
}

export function StatCard({ label, value, sub, color, icon }: StatCardProps) {
  return (
    <div className={`scard ${color}`}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontFamily: "var(--font-lora)", fontSize: 28, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>
          {value}
        </span>
      </div>
      <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "var(--text-muted)" }}>
        {sub}
      </div>
    </div>
  );
}