import type { ReactNode, CSSProperties } from "react";

/** Contenedor visual compartido por las pantallas de autenticación. */
export function AuthCard({ title, subtitle, children, footer }: {
  title: string; subtitle: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-primary)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:"var(--bg-sidebar)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:"0 4px 20px rgba(28,25,23,.15)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2C8.5 2 6 4.5 6 7.5c0 2 1 3.8 2.5 4.8L8 20h8l-.5-7.7C17 11.3 18 9.5 18 7.5 18 4.5 15.5 2 12 2z" fill="#c4a882"/>
              <circle cx="12" cy="7" r="2" fill="#8b7355"/>
            </svg>
          </div>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:26, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.5px" }}>PsyDesk</h1>
        </div>
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border-light)", borderRadius:20, padding:"28px 28px 24px", boxShadow:"0 4px 24px rgba(28,25,23,.08)" }}>
          <h2 style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)", marginBottom:4 }}>{title}</h2>
          <p style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginBottom:24 }}>{subtitle}</p>
          {children}
        </div>
        {footer && <p style={{ textAlign:"center", fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginTop:20 }}>{footer}</p>}
      </div>
    </div>
  );
}

export const authInputStyle: CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)",
  fontSize: 13, outline: "none", boxSizing: "border-box",
};

export const authLabelStyle: CSSProperties = {
  display: "block", fontFamily: "var(--font-dm-sans)", fontSize: 12, fontWeight: 500,
  color: "var(--text-secondary)", marginBottom: 6,
};

export function authButtonStyle(loading: boolean): CSSProperties {
  return {
    width: "100%", padding: "11px", borderRadius: 12, background: "var(--accent)", color: "#faf7f2",
    border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-dm-sans)",
    fontSize: 14, fontWeight: 500, opacity: loading ? 0.7 : 1, boxShadow: "0 2px 8px rgba(139,115,85,.3)",
  };
}

export function AuthAlert({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const c = kind === "error" ? "red" : "green";
  return (
    <div role={kind === "error" ? "alert" : "status"} style={{ padding:"10px 14px", borderRadius:10, background:`var(--${c}-bg)`, border:`1px solid var(--${c})`, color:`var(--${c})`, fontFamily:"var(--font-dm-sans)", fontSize:13, marginBottom:16 }}>
      {children}
    </div>
  );
}
