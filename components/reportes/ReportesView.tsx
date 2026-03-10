"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type ReportTab = "general" | "pacientes" | "tests";

const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="card" style={{ padding: "20px 22px", borderRadius: 16, ...style }}>{children}</div>
);
const SecTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily: "var(--font-lora)", fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>{children}</div>
);

// ─── Empty state para gráficos ────────────────────────────────────────────────
const EmptyChart = ({ message }: { message: string }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 120, gap: 8 }}>
    <span style={{ fontSize: 28, opacity: 0.3 }}>📊</span>
    <span style={{ ...dm("12px"), color: "var(--text-muted)", textAlign: "center" }}>{message}</span>
  </div>
);

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface MonthlyCount { month: string; year: number; count: number; }
interface DiagnosisCount { label: string; value: number; color: string; }
interface TopPatient { name: string; initials: string; color: string; sessions: number; tag: string; avgMood: number | null; }
interface PatientStatusCount { activo: number; lista_espera: number; alta: number; archivado: number; }

const AVATAR_COLORS = ["#8B7355","#4A7BA7","#5C8A6E","#C47B2B","#B5594A","#7B6EA8","#A85E6A","#6A9E8A"];
const DIAG_COLORS: Record<string, string> = {
  "Ansiedad":"#C47B2B","Depresión":"#4A7BA7","Trauma":"#5C8A6E","TDAH":"#8B7355",
  "TOC":"#7B6EA8","Estrés":"#B5594A","Fobia":"#A85E6A","Pareja":"#6A9E8A",
  "Burnout":"#4A7BA7","Duelo":"#8B7355","Otro":"#A8A29E","No evaluado":"#6B7280",
};

function getInitials(name: string) {
  return name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getLast7Months(): { month: string; year: number; label: string }[] {
  const result = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    result.push({ month: String(d.getMonth() + 1).padStart(2,"0"), year: d.getFullYear(), label: months[d.getMonth()] });
  }
  return result;
}

export function ReportesView() {
  const supabase = createClient();
  const [tab, setTab]       = useState<ReportTab>("general");
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

  // ── Datos ──────────────────────────────────────────────────────────────────
  const [monthlySessions, setMonthlySessions]   = useState<MonthlyCount[]>([]);
  const [diagnosisData, setDiagnosisData]       = useState<DiagnosisCount[]>([]);
  const [topPatients, setTopPatients]           = useState<TopPatient[]>([]);
  const [patientStatus, setPatientStatus]       = useState<PatientStatusCount>({ activo:0, lista_espera:0, alta:0, archivado:0 });
  const [totalSessions, setTotalSessions]       = useState(0);
  const [avgMoodGlobal, setAvgMoodGlobal]       = useState<number | null>(null);
  const [newThisMonth, setNewThisMonth]         = useState(0);
  const [monthlyPatients, setMonthlyPatients]   = useState<MonthlyCount[]>([]);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const last7 = getLast7Months();
        const startDate = `${last7[0].year}-${last7[0].month}-01`;

        // ── 1. Pacientes ───────────────────────────────────────────────────
        const { data: patients } = await supabase
          .from("patients")
          .select("id, first_name, last_name, diagnosis, status, session_count, created_at")
          .eq("psychologist_id", user.id);

        if (patients) {
          // Status counts
          const sc = { activo:0, lista_espera:0, alta:0, archivado:0 };
          patients.forEach(p => { if (p.status in sc) (sc as any)[p.status]++; });
          setPatientStatus(sc);

          // Nuevos este mes
          const now = new Date();
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          setNewThisMonth(patients.filter(p => new Date(p.created_at) >= thisMonthStart).length);

          // Nuevos por mes (últimos 7)
          const newByMonth: MonthlyCount[] = last7.map(m => ({
            month: m.label, year: m.year,
            count: patients.filter(p => {
              const d = new Date(p.created_at);
              return String(d.getMonth()+1).padStart(2,"0") === m.month && d.getFullYear() === m.year;
            }).length
          }));
          setMonthlyPatients(newByMonth);

          // Diagnósticos — cada paciente puede tener múltiples (guardados como "Ansiedad, Depresión")
          const diagMap: Record<string, number> = {};
          patients.forEach(p => {
            if (!p.diagnosis) return;
            p.diagnosis.split(",").map((d: string) => d.trim()).filter(Boolean).forEach((d: string) => {
              diagMap[d] = (diagMap[d] ?? 0) + 1;
            });
          });
          const diagArr: DiagnosisCount[] = Object.entries(diagMap)
            .sort((a,b) => b[1]-a[1])
            .slice(0, 7)
            .map(([label, value]) => ({ label, value, color: DIAG_COLORS[label] ?? "#A8A29E" }));
          setDiagnosisData(diagArr);
        }

        // ── 2. Session notes ───────────────────────────────────────────────
        const { data: notes } = await supabase
          .from("session_notes")
          .select("id, patient_id, session_date, mood_rating")
          .eq("psychologist_id", user.id)
          .eq("is_draft", false)
          .gte("session_date", startDate);

        if (notes) {
          setTotalSessions(notes.length);

          // Mood promedio global
          const moods = notes.filter(n => n.mood_rating != null).map(n => n.mood_rating);
          setAvgMoodGlobal(moods.length > 0 ? Math.round((moods.reduce((a,b) => a+b, 0) / moods.length) * 10) / 10 : null);

          // Sesiones por mes
          const sessionsByMonth: MonthlyCount[] = last7.map(m => ({
            month: m.label, year: m.year,
            count: notes.filter(n => {
              const d = new Date(n.session_date);
              return String(d.getMonth()+1).padStart(2,"0") === m.month && d.getFullYear() === m.year;
            }).length
          }));
          setMonthlySessions(sessionsByMonth);

          // Top pacientes por sesiones
          if (patients) {
            const countByPatient: Record<string, number> = {};
            const moodByPatient: Record<string, number[]> = {};
            notes.forEach(n => {
              countByPatient[n.patient_id] = (countByPatient[n.patient_id] ?? 0) + 1;
              if (n.mood_rating != null) {
                if (!moodByPatient[n.patient_id]) moodByPatient[n.patient_id] = [];
                moodByPatient[n.patient_id].push(n.mood_rating);
              }
            });
            const top = Object.entries(countByPatient)
              .sort((a,b) => b[1]-a[1])
              .slice(0, 5)
              .map(([pid, count]) => {
                const p = patients.find(x => x.id === pid);
                if (!p) return null;
                const name = `${p.first_name} ${p.last_name}`.trim();
                const moods = moodByPatient[pid] ?? [];
                const avgMood = moods.length > 0 ? Math.round((moods.reduce((a,b) => a+b,0)/moods.length)*10)/10 : null;
                const colorIdx = name.length % AVATAR_COLORS.length;
                return {
                  name, initials: getInitials(name),
                  color: AVATAR_COLORS[colorIdx],
                  sessions: count,
                  tag: p.diagnosis?.split(",")[0]?.trim() ?? "—",
                  avgMood,
                };
              })
              .filter(Boolean) as TopPatient[];
            setTopPatients(top);
          }
        } else {
          // Sin notas aún — sesiones por mes vacías
          setMonthlySessions(last7.map(m => ({ month: m.label, year: m.year, count: 0 })));
        }

      } catch (e) {
        console.error("Error cargando reportes:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const totalPatients  = Object.values(patientStatus).reduce((a,b) => a+b, 0);
  const maxSessions    = Math.max(...monthlySessions.map(d => d.count), 1);
  const maxNewPatients = Math.max(...monthlyPatients.map(d => d.count), 1);
  const totalDiag      = diagnosisData.reduce((a,b) => a+b.value, 0);

  // ── Loader ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", gap:12 }}>
      <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin .7s linear infinite" }} />
      <span style={{ ...dm("13px"), color:"var(--text-muted)" }}>Cargando reportes...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", maxWidth:1280, margin:"0 auto" }}>
      <style>{`
        .rep-tabs { display: flex; overflow-x: auto; }
        .rep-tabs::-webkit-scrollbar { display: none; }
        .rep-tab-long  { display: inline; }
        .rep-tab-short { display: none; }
        .rep-grid-kpi  { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .rep-grid-main { display: grid; grid-template-columns: 1.8fr 1fr; gap: 20px; }
        .rep-grid-2    { display: grid; grid-template-columns: repeat(2,1fr); gap: 20px; }
        .rep-grid-3    { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
        .rep-span-2    { grid-column: span 2; }
        .rep-modality  { display: flex; gap: 16px; }
        @media (max-width: 768px) {
          .rep-tab-long  { display: none; }
          .rep-tab-short { display: inline; }
          .rep-grid-kpi  { grid-template-columns: repeat(2,1fr); gap: 10px; }
          .rep-grid-main { grid-template-columns: 1fr; }
          .rep-grid-2    { grid-template-columns: 1fr; }
          .rep-grid-3    { grid-template-columns: 1fr; }
          .rep-span-2    { grid-column: span 1; }
          .rep-modality  { flex-direction: column; gap: 10px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:24, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.3px" }}>Reportes & Estadísticas</h1>
          <p style={{ ...dm("13px"), color:"var(--text-muted)", marginTop:4 }}>
            {new Date().toLocaleString("es-MX", { month:"long", year:"numeric" })} · Datos reales de tu práctica
          </p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <button
            style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 18px", borderRadius:10, height:38, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"0 2px 8px rgba(139,115,85,0.35)", whiteSpace:"nowrap" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}
          >📄 Exportar PDF</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rep-tabs" style={{ borderBottom:"1px solid var(--border-light)", marginBottom:24, flexShrink:0 }}>
        {(["general","pacientes","tests"] as ReportTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:"10px 16px", background:"transparent", border:"none", borderBottom:`2px solid ${tab===t?"var(--accent)":"transparent"}`, cursor:"pointer", transition:"all .15s", ...dm("13px"), color:tab===t?"var(--accent)":"var(--text-secondary)", fontWeight:tab===t?500:400, whiteSpace:"nowrap", flexShrink:0 }}
          >
            <span className="rep-tab-long">
              {t==="general"?"📊 General":t==="pacientes"?"👥 Pacientes":"🧪 Tests"}
            </span>
            <span className="rep-tab-short">
              {t==="general"?"📊":t==="pacientes"?"👥":"🧪"}
            </span>
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex:1, overflowY:"auto" }}>

        {/* ── GENERAL ── */}
        {tab === "general" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* KPIs */}
            <div className="rep-grid-kpi">
              {[
                { icon:"🗓", label:"Sesiones (7 meses)",  value: totalSessions > 0 ? String(totalSessions) : "—",    delta: totalSessions > 0 ? `${totalSessions} registradas` : "Sin datos aún", color:"var(--accent)" },
                { icon:"👤", label:"Pacientes activos",   value: patientStatus.activo > 0 ? String(patientStatus.activo) : "—", delta:`de ${totalPatients} totales`, color:"var(--green)" },
                { icon:"🆕", label:"Nuevos este mes",     value: newThisMonth > 0 ? String(newThisMonth) : "—",      delta: newThisMonth > 0 ? "este mes" : "Sin nuevos aún",   color:"var(--blue)" },
                { icon:"😊", label:"Mood promedio",       value: avgMoodGlobal != null ? `${avgMoodGlobal}/10` : "—", delta: avgMoodGlobal != null ? "de tus pacientes" : "Sin datos aún", color:"var(--amber)" },
              ].map((s,i) => (
                <Card key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ fontSize:22 }}>{s.icon}</span>
                    <span style={{ ...dm("11px"), color:s.color, fontWeight:500, background:`${s.color}14`, padding:"2px 8px", borderRadius:20 }}>{s.delta}</span>
                  </div>
                  <div style={{ fontFamily:"var(--font-lora)", fontSize:28, fontWeight:600, color:"var(--text-primary)" }}>{s.value}</div>
                  <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:2 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            {/* Gráfico sesiones + diagnósticos */}
            <div className="rep-grid-main">
              <Card>
                <SecTitle>Sesiones por mes</SecTitle>
                {monthlySessions.every(m => m.count === 0) ? (
                  <EmptyChart message="Aún no hay notas de sesión registradas" />
                ) : (
                  <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:140, paddingBottom:4 }}>
                    {monthlySessions.map((d,i) => (
                      <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:1 }}>
                        <span style={{ ...dm("10px"), color:"var(--text-muted)" }}>{d.count > 0 ? d.count : ""}</span>
                        <div style={{ width:"100%", height:`${d.count > 0 ? Math.max((d.count/maxSessions)*110, 4) : 4}px`, background: d.count > 0 ? "var(--accent)" : "var(--border)", opacity: i === monthlySessions.length-1 ? 1 : 0.65, borderRadius:"4px 4px 0 0", transition:"height .5s ease" }} />
                        <span style={{ ...dm("10px"), color: i===monthlySessions.length-1 ? "var(--text-primary)" : "var(--text-muted)", fontWeight: i===monthlySessions.length-1 ? 600 : 400 }}>{d.month}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <SecTitle>Por diagnóstico</SecTitle>
                {diagnosisData.length === 0 ? (
                  <EmptyChart message="Agrega diagnósticos a tus pacientes para ver la distribución" />
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {diagnosisData.map((d,i) => (
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
                )}
              </Card>
            </div>

            {/* Top pacientes */}
            <Card>
              <SecTitle>Pacientes con más sesiones</SecTitle>
              {topPatients.length === 0 ? (
                <EmptyChart message="Las notas de sesión completadas aparecerán aquí" />
              ) : (
                topPatients.map((p,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: i < topPatients.length-1 ? "1px solid var(--border-light)" : "none" }}>
                    <span style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-muted)", width:20, textAlign:"center" }}>{i+1}</span>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:`${p.color}18`, color:p.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>{p.initials}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)" }}>{p.name}</div>
                      <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{p.sessions} sesiones · {p.tag}</div>
                    </div>
                    {p.avgMood != null && (
                      <div style={{ textAlign:"right" }}>
                        <div style={{ ...dm("13px"), fontWeight:600, color: p.avgMood >= 7 ? "var(--green)" : p.avgMood >= 4 ? "var(--amber)" : "var(--red)" }}>{p.avgMood}/10</div>
                        <div style={{ ...dm("10px"), color:"var(--text-muted)" }}>mood prom.</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </Card>
          </div>
        )}

        {/* ── PACIENTES ── */}
        {tab === "pacientes" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* Estado de pacientes */}
            <div className="rep-grid-kpi">
              {([
                { label:"Activos",       key:"activo",       icon:"✅", color:"var(--green)" },
                { label:"Lista espera",  key:"lista_espera", icon:"⏳", color:"var(--amber)" },
                { label:"Alta",          key:"alta",         icon:"🎓", color:"var(--blue)"  },
                { label:"Archivados",    key:"archivado",    icon:"📁", color:"var(--text-muted)" },
              ] as const).map((s,i) => (
                <Card key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ fontSize:22 }}>{s.icon}</span>
                    {totalPatients > 0 && (
                      <span style={{ ...dm("11px"), color:s.color, background:`${s.color}14`, padding:"2px 8px", borderRadius:20 }}>
                        {Math.round(patientStatus[s.key]/totalPatients*100)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily:"var(--font-lora)", fontSize:28, fontWeight:600, color:"var(--text-primary)" }}>
                    {patientStatus[s.key] > 0 ? patientStatus[s.key] : "—"}
                  </div>
                  <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:2 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            {/* Nuevos pacientes por mes */}
            <div className="rep-grid-2">
              <Card>
                <SecTitle>Nuevos pacientes por mes</SecTitle>
                {monthlyPatients.every(m => m.count === 0) ? (
                  <EmptyChart message="Aún no hay pacientes registrados en los últimos 7 meses" />
                ) : (
                  <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:100 }}>
                    {monthlyPatients.map((d,i) => (
                      <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:1 }}>
                        <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>{d.count > 0 ? d.count : ""}</span>
                        <div style={{ width:"100%", height:`${d.count > 0 ? Math.max((d.count/maxNewPatients)*80, 4) : 4}px`, background: d.count > 0 ? "var(--green)" : "var(--border)", opacity: i===monthlyPatients.length-1?1:0.6, borderRadius:4, transition:"height .5s ease" }} />
                        <span style={{ ...dm("10px"), color:"var(--text-muted)" }}>{d.month}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Distribución diagnósticos */}
              <Card>
                <SecTitle>Diagnósticos más frecuentes</SecTitle>
                {diagnosisData.length === 0 ? (
                  <EmptyChart message="Agrega diagnósticos a tus pacientes" />
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {diagnosisData.slice(0,5).map((d,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ ...dm("12px"), fontWeight:600, color:"var(--text-primary)", width:100, flexShrink:0 }}>{d.label}</span>
                        <div className="pbar" style={{ flex:1, height:6, borderRadius:3 }}>
                          <div className="pfill" style={{ width:`${(d.value/diagnosisData[0].value)*100}%`, background:d.color, borderRadius:3 }} />
                        </div>
                        <span style={{ ...dm("12px"), color:"var(--text-muted)", width:20, textAlign:"right" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Modalidad */}
            <Card>
              <SecTitle>Estado general de la práctica</SecTitle>
              <div className="rep-modality">
                {[
                  { label:"Total pacientes",  value: totalPatients,          icon:"👥", color:"var(--accent)" },
                  { label:"Nuevos este mes",  value: newThisMonth,            icon:"🆕", color:"var(--green)"  },
                  { label:"Sesiones totales", value: totalSessions,           icon:"🗓", color:"var(--blue)"   },
                  { label:"Mood promedio",    value: avgMoodGlobal != null ? `${avgMoodGlobal}/10` : "—", icon:"😊", color:"var(--amber)" },
                ].map((m,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, flex:1, padding:"14px 16px", background:"var(--surface)", borderRadius:12 }}>
                    <div style={{ width:44, height:44, borderRadius:10, background:`${m.color}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                      {m.icon}
                    </div>
                    <div>
                      <div style={{ fontFamily:"var(--font-lora)", fontSize:20, fontWeight:600, color:"var(--text-primary)" }}>{m.value || "—"}</div>
                      <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{m.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── TESTS ── */}
        {tab === "tests" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20, alignItems:"center", justifyContent:"center", minHeight:300 }}>
            <div style={{ textAlign:"center", padding:"48px 24px" }}>
              <div style={{ fontSize:48, marginBottom:16, opacity:0.5 }}>🧪</div>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:20, fontWeight:600, color:"var(--text-primary)", marginBottom:8 }}>Módulo de Tests</div>
              <div style={{ ...dm("13px"), color:"var(--text-muted)", maxWidth:320, margin:"0 auto", lineHeight:1.6 }}>
                Las estadísticas de tests psicológicos estarán disponibles cuando implementemos el módulo de Tests.
              </div>
              <div style={{ marginTop:20, display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, background:"var(--amber-bg)", border:"1px solid var(--amber)33" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--amber)", display:"block" }} />
                <span style={{ ...dm("12px"), color:"var(--amber)", fontWeight:500 }}>Próximamente</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}