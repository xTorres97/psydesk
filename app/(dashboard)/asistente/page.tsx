"use client";

import { AiPanel } from "@/components/ai/AiPanel";

export default function AsistentePage() {
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header de página */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,var(--accent-light),var(--accent))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>✦</div>
          <div>
            <h1 style={{ fontFamily:"var(--font-lora)", fontSize:24, fontWeight:600, color:"var(--text-primary)" }}>
              PsyDesk AI
            </h1>
            <p style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginTop:2 }}>
              Tu asistente clínico inteligente · Chat · Redacción · Búsqueda de pacientes
            </p>
          </div>
        </div>
      </div>

      {/* Panel de chat a pantalla completa */}
      <div style={{ flex:1, borderRadius:20, overflow:"hidden", border:"1px solid var(--border-light)", boxShadow:"0 2px 12px rgba(28,25,23,.06)" }}>
        <AiPanel mode="page" />
      </div>
    </div>
  );
}