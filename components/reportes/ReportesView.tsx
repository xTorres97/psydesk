"use client";

import { useState } from "react";

type ReportTab = "general" | "pacientes" | "tests" | "financiero";

const MONTHLY_DATA = [
  { month:"Jul", sessions:38, hours:32 }, { month:"Ago", sessions:42, hours:35 },
  { month:"Sep", sessions:39, hours:33 }, { month:"Oct", sessions:45, hours:38 },
  { month:"Nov", sessions:41, hours:34 }, { month:"Dic", sessions:36, hours:30 },
  { month:"Ene", sessions:44, hours:37 },
];
const DIAGNOSIS_DATA = [
  { label:"Ansiedad",    value:28, color:"#C47B2B" },
  { label:"Depresión",   value:22, color:"#4A7BA7" },
  { label:"Trauma/TEPT", value:15, color:"#5C8A6E" },
  { label:"TDAH",        value:12, color:"#8B7355" },
  { label:"TOC",         value:8,  color:"#7B6EA8" },
  { label:"Otros",       value:15, color:"#A8A29E" },
];
const TOP_PATIENTS = [
  { name:"Ana Reyes",      initials:"AR", color:"#5C8A6E", sessions:23, tag:"Trauma",   evolution:"↑ Mejora"  },
  { name:"María González", initials:"MG", color:"#8B7355", sessions:12, tag:"Ansiedad", evolution:"↑ Mejora"  },
  { name:"Emilio Ruiz",    initials:"ER", color:"#4A7BA7", sessions:11, tag:"Burnout",  evolution:"→ Estable" },
  { name:"Lucía Paredes",  initials:"LP", color:"#7B6EA8", sessions:9,  tag:"TOC",      evolution:"↑ Mejora"  },
];
const WEEKLY_HOURS = [
  { day:"L", hours:6 }, { day:"M", hours:8 }, { day:"M", hours:7 },
  { day:"J", hours:5 }, { day:"V", hours:6 }, { day:"S", hours:0 }, { day:"D", hours:0 },
];

const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="card" style={{ padding:"20px 22px", borderRadius:16, ...style }}>{children}</div>
);
const SecTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily:"var(--font-lora)", fontSize:15, fontWeight:600, color:"var(--text-primary)", marginBottom:16 }}>{children}</div>
);

export function ReportesView() {
  const [tab, setTab]       = useState<ReportTab>("general");
  const [period, setPeriod] = useState("month");

  const maxSessions = Math.max(...MONTHLY_DATA.map(d => d.sessions));
  const maxHours    = Math.max(...WEEKLY_HOURS.map(d => d.hours));
  const totalDiag   = DIAGNOSIS_DATA.reduce((a, b) => a + b.value, 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", maxWidth:1280, margin:"0 auto" }}>
      <style>{`
        /* Tabs */
        .rep-tabs { display: flex; overflow-x: auto; }
        .rep-tabs::-webkit-scrollbar { display: none; }
        .rep-tab-long  { display: inline; }
        .rep-tab-short { display: none; }

        /* Grids */
        .rep-grid-kpi  { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .rep-grid-main { display: grid; grid-template-columns: 1.8fr 1fr; gap: 20px; }
        .rep-grid-week { display: grid; grid-template-columns: 1fr 1.4fr; gap: 20px; }
        .rep-grid-2    { display: grid; grid-template-columns: repeat(2,1fr); gap: 20px; }
        .rep-grid-3    { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
        .rep-span-2    { grid-column: span 2; }
        .rep-span-3    { grid-column: span 3; }
        .rep-modality  { display: flex; gap: 16px; }

        @media (max-width: 768px) {
          .rep-tab-long  { display: none; }
          .rep-tab-short { display: inline; }

          .rep-grid-kpi  { grid-template-columns: repeat(2,1fr); gap: 10px; }
          .rep-grid-main { grid-template-columns: 1fr; }
          .rep-grid-week { grid-template-columns: 1fr; }
          .rep-grid-2    { grid-template-columns: 1fr; }
          .rep-grid-3    { grid-template-columns: 1fr; }
          .rep-span-2    { grid-column: span 1; }
          .rep-span-3    { grid-column: span 1; }
          .rep-modality  { flex-direction: column; gap: 10px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:24, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.3px" }}>Reportes & Estadísticas</h1>
          <p style={{ ...dm("13px"), color:"var(--text-muted)", marginTop:4 }}>Enero 2026 · Resumen de actividad clínica</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:4 }}>
            {["week","month","year"].map(p => (
              <span key={p} className={`chip${period===p?" on":""}`} onClick={() => setPeriod(p)} style={{ cursor:"pointer" }}>
                {p==="week"?"Semana":p==="month"?"Mes":"Año"}
              </span>
            ))}
          </div>
          <button
            style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 18px", borderRadius:10, height:38, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"0 2px 8px rgba(139,115,85,0.35)", whiteSpace:"nowrap" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}
          >📄 Exportar PDF</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rep-tabs" style={{ borderBottom:"1px solid var(--border-light)", marginBottom:24, flexShrink:0 }}>
        {(["general","pacientes","tests","financiero"] as ReportTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:"10px 16px", background:"transparent", border:"none", borderBottom:`2px solid ${tab===t?"var(--accent)":"transparent"}`, cursor:"pointer", transition:"all .15s", ...dm("13px"), color:tab===t?"var(--accent)":"var(--text-secondary)", fontWeight:tab===t?500:400, whiteSpace:"nowrap", flexShrink:0 }}
          >
            <span className="rep-tab-long">
              {t==="general"?"📊 General":t==="pacientes"?"👥 Pacientes":t==="tests"?"🧪 Tests":"💰 Financiero"}
            </span>
            <span className="rep-tab-short">
              {t==="general"?"📊":t==="pacientes"?"👥":t==="tests"?"🧪":"💰"}
            </span>
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex:1, overflowY:"auto" }}>

        {/* ── GENERAL ── */}
        {tab === "general" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div className="rep-grid-kpi">
              {[
                { icon:"🗓", label:"Sesiones este mes",  value:"44",  delta:"+10%",      color:"var(--green)"  },
                { icon:"👤", label:"Pacientes activos",  value:"34",  delta:"+2",        color:"var(--green)"  },
                { icon:"⏱", label:"Horas clínicas",     value:"37h", delta:"+3h",       color:"var(--green)"  },
                { icon:"📋", label:"Tests aplicados",    value:"12",  delta:"+4",        color:"var(--green)"  },
              ].map((s,i) => (
                <Card key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ fontSize:22 }}>{s.icon}</span>
                    <span style={{ ...dm("11px"), color:s.color, fontWeight:600, background:`${s.color}14`, padding:"2px 8px", borderRadius:20 }}>{s.delta}</span>
                  </div>
                  <div style={{ fontFamily:"var(--font-lora)", fontSize:28, fontWeight:600, color:"var(--text-primary)" }}>{s.value}</div>
                  <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:2 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            <div className="rep-grid-main">
              <Card>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:8 }}>
                  <SecTitle>Sesiones mensuales</SecTitle>
                  <div style={{ display:"flex", gap:12 }}>
                    {[{ color:"var(--accent)", label:"Sesiones" }, { color:"var(--blue)", label:"Horas" }].map((l,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{ width:10, height:10, borderRadius:2, background:l.color, display:"block" }} />
                        <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:140, paddingBottom:4 }}>
                  {MONTHLY_DATA.map((d,i) => (
                    <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:1 }}>
                      <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:120 }}>
                        <div style={{ width:14, height:`${(d.sessions/maxSessions)*110}px`, background:"var(--accent)", opacity:i===6?1:0.65, borderRadius:"4px 4px 0 0", transition:"height .5s ease" }} />
                        <div style={{ width:14, height:`${(d.hours/maxSessions)*110}px`, background:"var(--blue)", opacity:i===6?1:0.65, borderRadius:"4px 4px 0 0", transition:"height .5s ease" }} />
                      </div>
                      <span style={{ ...dm("10px"), color:i===6?"var(--text-primary)":"var(--text-muted)", fontWeight:i===6?600:400 }}>{d.month}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <SecTitle>Por diagnóstico</SecTitle>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {DIAGNOSIS_DATA.map((d,i) => (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ ...dm("12px"), color:"var(--text-secondary)" }}>{d.label}</span>
                        <span style={{ ...dm("12px"), color:"var(--text-primary)", fontWeight:600 }}>{Math.round(d.value/totalDiag*100)}%</span>
                      </div>
                      <div className="pbar" style={{ height:5, borderRadius:3 }}>
                        <div className="pfill" style={{ width:`${(d.value/totalDiag)*100}%`, background:d.color, borderRadius:3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="rep-grid-week">
              <Card>
                <SecTitle>Horas esta semana</SecTitle>
                <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:80 }}>
                  {WEEKLY_HOURS.map((d,i) => (
                    <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:1 }}>
                      <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>{d.hours>0?d.hours:""}</span>
                      <div style={{ width:"100%", height:`${d.hours>0?(d.hours/maxHours)*60:4}px`, background:d.hours>0?"var(--accent)":"var(--surface)", borderRadius:4, transition:"height .5s ease" }} />
                      <span style={{ ...dm("10px"), color:"var(--text-muted)" }}>{d.day}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:14, padding:"10px 12px", borderRadius:10, background:"var(--surface)" }}>
                  <span style={{ ...dm("12px"), color:"var(--text-secondary)" }}>Total: <strong style={{ color:"var(--text-primary)" }}>32h</strong> de 40h objetivo <span style={{ color:"var(--green)" }}>↑ 80%</span></span>
                </div>
              </Card>
              <Card>
                <SecTitle>Pacientes con más sesiones</SecTitle>
                {TOP_PATIENTS.map((p,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:i<3?"1px solid var(--border-light)":"none" }}>
                    <span style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-muted)", width:20, textAlign:"center" }}>{i+1}</span>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:`${p.color}18`, color:p.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>{p.initials}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)" }}>{p.name}</div>
                      <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{p.sessions} sesiones · {p.tag}</div>
                    </div>
                    <span style={{ ...dm("12px"), color:p.evolution.startsWith("↑")?"var(--green)":"var(--text-muted)", fontWeight:500 }}>{p.evolution}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ── PACIENTES ── */}
        {tab === "pacientes" && (
          <div className="rep-grid-2" style={{ alignItems:"start" }}>
            {[
              { title:"Nuevos pacientes por mes", data:[4,6,3,5,4,2,5], color:"var(--green)" },
              { title:"Altas clínicas por mes",   data:[1,2,1,3,2,1,2], color:"var(--blue)"  },
            ].map((chart,ci) => {
              const mx = Math.max(...chart.data);
              const labels = ["Jul","Ago","Sep","Oct","Nov","Dic","Ene"];
              return (
                <Card key={ci}>
                  <SecTitle>{chart.title}</SecTitle>
                  <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:100 }}>
                    {chart.data.map((v,i) => (
                      <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:1 }}>
                        <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>{v}</span>
                        <div style={{ width:"100%", height:`${(v/mx)*80}px`, background:chart.color, opacity:i===6?1:0.6, borderRadius:4, transition:"height .5s ease" }} />
                        <span style={{ ...dm("10px"), color:"var(--text-muted)" }}>{labels[i]}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
            <div className="rep-span-2">
            <Card>
              <SecTitle>Distribución por modalidad</SecTitle>
              <div className="rep-modality">
                {[
                  { label:"Presencial", value:22, color:"var(--accent)" },
                  { label:"Online",     value:10, color:"var(--blue)"   },
                  { label:"Mixto",      value:2,  color:"var(--green)"  },
                ].map((m,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, flex:1, padding:"14px 16px", background:"var(--surface)", borderRadius:12 }}>
                    <div style={{ width:44, height:44, borderRadius:10, background:`${m.color}14`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontFamily:"var(--font-lora)", fontSize:20, fontWeight:600, color:m.color }}>{m.value}</span>
                    </div>
                    <div>
                      <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)" }}>{m.label}</div>
                      <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{Math.round(m.value/34*100)}% del total</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            </div>
          </div>
        )}

        {/* ── TESTS ── */}
        {tab === "tests" && (
          <div className="rep-grid-2">
            <Card>
              <SecTitle>Tests más aplicados</SecTitle>
              {[{ name:"GAD-7", count:18, color:"#C47B2B" }, { name:"PHQ-9", count:14, color:"#4A7BA7" }, { name:"BDI-II", count:9, color:"#B5594A" }, { name:"PCL-5", count:6, color:"#5C8A6E" }, { name:"AUDIT", count:3, color:"#7B6EA8" }].map((t,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <span style={{ ...dm("12px"), fontWeight:600, color:"var(--text-primary)", width:52 }}>{t.name}</span>
                  <div className="pbar" style={{ flex:1, height:6, borderRadius:3 }}>
                    <div className="pfill" style={{ width:`${(t.count/18)*100}%`, background:t.color, borderRadius:3 }} />
                  </div>
                  <span style={{ ...dm("12px"), color:"var(--text-muted)", width:24, textAlign:"right" }}>{t.count}</span>
                </div>
              ))}
            </Card>
            <Card>
              <SecTitle>Niveles de severidad (GAD-7)</SecTitle>
              {[{ label:"Mínimo", range:"0–4", count:4, color:"var(--green)" }, { label:"Leve", range:"5–9", count:8, color:"var(--blue)" }, { label:"Moderado", range:"10–14", count:4, color:"var(--amber)" }, { label:"Severo", range:"15–21", count:2, color:"var(--red)" }].map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ width:80, flexShrink:0 }}>
                    <div style={{ ...dm("12px"), color:"var(--text-primary)", fontWeight:500 }}>{s.label}</div>
                    <div style={{ ...dm("10px"), color:"var(--text-muted)" }}>{s.range}</div>
                  </div>
                  <div className="pbar" style={{ flex:1, height:6, borderRadius:3 }}>
                    <div className="pfill" style={{ width:`${(s.count/18)*100}%`, background:s.color, borderRadius:3 }} />
                  </div>
                  <span style={{ ...dm("12px"), color:s.color, fontWeight:600, width:20, textAlign:"right" }}>{s.count}</span>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── FINANCIERO ── */}
        {tab === "financiero" && (
          <div className="rep-grid-3">
            {[
              { icon:"💰", label:"Ingresos este mes",   value:"$34,800", delta:"+12%",      color:"var(--green)"  },
              { icon:"📅", label:"Sesiones facturadas", value:"44",      delta:"de 44",     color:"var(--blue)"   },
              { icon:"💸", label:"Tarifa promedio",     value:"$791",    delta:"por sesión", color:"var(--accent)" },
            ].map((s,i) => (
              <Card key={i}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:22 }}>{s.icon}</span>
                  <span style={{ ...dm("11px"), color:s.color, background:`${s.color}14`, padding:"2px 8px", borderRadius:20 }}>{s.delta}</span>
                </div>
                <div style={{ fontFamily:"var(--font-lora)", fontSize:28, fontWeight:600, color:"var(--text-primary)" }}>{s.value}</div>
                <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:2 }}>{s.label}</div>
              </Card>
            ))}
            <div className="rep-span-3"> 
            <Card>
              <SecTitle>Ingresos mensuales (MXN)</SecTitle>
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
                {[28000,33000,30000,36000,32000,26000,34800].map((v,i) => {
                  const mx = 36000;
                  const months = ["Jul","Ago","Sep","Oct","Nov","Dic","Ene"];
                  return (
                    <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:1 }}>
                      <span style={{ ...dm("10px"), color:"var(--text-muted)" }}>${(v/1000).toFixed(0)}k</span>
                      <div style={{ width:"100%", height:`${(v/mx)*100}px`, background:"var(--accent)", opacity:i===6?1:0.6, borderRadius:4, transition:"height .5s ease" }} />
                      <span style={{ ...dm("10px"), color:"var(--text-muted)" }}>{months[i]}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}