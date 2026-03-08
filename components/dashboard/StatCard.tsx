interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  color: "accent" | "green" | "amber" | "blue";
  icon: string;
}

export function StatCard({ label, value, sub, color, icon }: StatCardProps) {
  return (
    <>
      <style>{`
        .scard-value { font-size: 28px; }
        .scard-label { font-size: 13px; }
        @media (max-width: 768px) {
          .scard-value { font-size: 22px; }
          .scard-label { font-size: 12px; }
        }
      `}</style>
      <div className={`scard ${color}`}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span className="scard-value" style={{ fontFamily: "var(--font-lora)", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>
            {value}
          </span>
        </div>
        <div className="scard-label" style={{ fontFamily: "var(--font-dm-sans)", color: "var(--text-secondary)", fontWeight: 500, marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "var(--text-muted)" }}>
          {sub}
        </div>
      </div>
    </>
  );
}