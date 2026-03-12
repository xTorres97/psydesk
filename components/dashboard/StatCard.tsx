// src/components/dashboard/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  color: "accent" | "green" | "amber" | "blue";
  icon: string;
  loading?: boolean;
}

export function StatCard({ label, value, sub, color, icon, loading }: StatCardProps) {
  return (
    <>
      <style>{`
        .scard-value { font-size: 28px; }
        .scard-label { font-size: 13px; }
        @media (max-width: 768px) {
          .scard-value { font-size: 22px; }
          .scard-label { font-size: 12px; }
        }
        .scard-shimmer {
          background: linear-gradient(90deg, var(--border-light) 25%, var(--surface) 50%, var(--border-light) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.2s infinite;
          border-radius: 6px;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
      <div className={`scard ${color}`}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          {loading
            ? <div className="scard-shimmer" style={{ width: 60, height: 28 }} />
            : <span className="scard-value" style={{ fontFamily: "var(--font-lora)", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>{value}</span>
          }
        </div>
        <div className="scard-label" style={{ fontFamily: "var(--font-dm-sans)", color: "var(--text-secondary)", fontWeight: 500, marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "var(--text-muted)" }}>
          {loading ? <div className="scard-shimmer" style={{ width: "80%", height: 11, marginTop: 2 }} /> : sub}
        </div>
      </div>
    </>
  );
}