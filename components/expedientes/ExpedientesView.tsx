"use client";

import { useState } from "react";

type Section = "resumen" | "notas" | "tests" | "archivos" | "tratamiento";

interface SessionNote {
  id: number; date: string; sessionNum: number; preview: string;
  format: "SOAP" | "DAP" | "Libre"; mood: "positivo" | "neutral" | "difícil"; duration: number;
}
interface TestResult {
  id: number; name: string; date: string; score: number; maxScore: number; level: string; color: string;
}
interface PatientSummary {
  id: number; name: string; initials: string; color: string; age: number; tag: string; sessions: number;
}
interface Patient extends PatientSummary {
  since: string; phone: string; email: string; occupation: string; maritalStatus: string;
  emergencyContact: string; diagnosis: string; medications: string;
  notes: SessionNote[]; tests: TestResult[];
}

const PATIENTS_LIST: PatientSummary[] = [
  { id:1, name:"María González", initials:"MG", color:"#8B7355", age:34, tag:"Ansiedad",  sessions:12 },
  { id:2, name:"Carlos Mendoza", initials:"CM", color:"#4A7BA7", age:28, tag:"Depresión", sessions:8  },
  { id:3, name:"Ana Reyes",      initials:"AR", color:"#5C8A6E", age:41, tag:"Trauma",    sessions:23 },
  { id:4, name:"Joaquín Torres", initials:"JT", color:"#C47B2B", age:19, tag:"TDAH",      sessions:5  },
  { id:5, name:"Sofía Vargas",   initials:"SV", color:"#B5594A", age:52, tag:"Estrés",    sessions:2  },
  { id:6, name:"Lucía Paredes",  initials:"LP", color:"#7B6EA8", age:27, tag:"TOC",       sessions:9  },
];

const FULL_PATIENT: Patient = {
  id:1, name:"María González", initials:"MG", color:"#8B7355", age:34,
  tag:"Ansiedad", sessions:12, since:"Marzo 2024",
  phone:"+52 55 1234 5678", email:"maria.g@email.com",
  occupation:"Diseñadora gráfica", maritalStatus:"Casada",
  emergencyContact:"Ramón González (+52 55 8888 9999)",
  diagnosis:"F41.1 – Trastorno de ansiedad generalizada (CIE-11)",
  medications:"Escitalopram 10mg / Noche (prescrito por Dr. Herrera)",
  notes:[
    { id:1, date:"30 dic 2024", sessionNum:12, preview:"Paciente reporta reducción significativa en episodios de preocupación excesiva. Comenzamos a trabajar técnicas de programación de tiempo de preocupación...", format:"SOAP", mood:"positivo", duration:50 },
    { id:2, date:"23 dic 2024", sessionNum:11, preview:"Sesión centrada en identificación de pensamientos automáticos negativos. María mostró buena disposición para el ejercicio de registro diario...", format:"SOAP", mood:"neutral", duration:50 },
    { id:3, date:"16 dic 2024", sessionNum:10, preview:"Paciente llegó con alta activación ansiosa por situación laboral. Utilizamos técnica de reestructuración cognitiva. Cierre con ejercicio de respiración...", format:"DAP", mood:"difícil", duration:50 },
    { id:4, date:"9 dic 2024",  sessionNum:9,  preview:"Revisión de tareas entre sesiones. Paciente completó diario de pensamientos con buena adherencia. Avanzamos al módulo de tolerancia a la incertidumbre...", format:"SOAP", mood:"positivo", duration:55 },
  ],
  tests:[
    { id:1, name:"GAD-7", date:"30 dic 2024", score:8,  maxScore:21, level:"Moderado",      color:"#C47B2B" },
    { id:2, name:"GAD-7", date:"2 dic 2024",  score:14, maxScore:21, level:"Moderado-Alto", color:"#B5594A" },
    { id:3, name:"GAD-7", date:"4 nov 2024",  score:18, maxScore:21, level:"Severo",        color:"#B5594A" },
    { id:4, name:"PHQ-9", date:"30 dic 2024", score:5,  maxScore:27, level:"Leve",          color:"#5C8A6E" },
  ],
};

const SECTIONS: { id: Section; icon: string; label: string }[] = [
  { id:"resumen",     icon:"📋", label:"Resumen"         },
  { id:"notas",       icon:"📝", label:"Notas"           },
  { id:"tests",       icon:"🧪", label:"Tests"           },
  { id:"archivos",    icon:"📎", label:"Archivos"        },
  { id:"tratamiento", icon:"🎯", label:"Tratamiento"     },
];

const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });

export function ExpedientesView() {
  const [activeSection, setActiveSection]   = useState<Section>("resumen");
  const [selectedPatient, setSelectedPatient] = useState(PATIENTS_LIST[0]);
  const [activeNote, setActiveNote]         = useState<SessionNote | null>(null);
  const [search, setSearch]                 = useState("");

  const moodColor = { positivo:"var(--green)", neutral:"var(--amber)", "difícil":"var(--red)" } as const;
  const moodBg    = { positivo:"var(--green-bg)", neutral:"var(--amber-bg)", "difícil":"var(--red-bg)" } as const;

  const filtered = PATIENTS_LIST.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const patient  = FULL_PATIENT;

  return (
    <div style={{ display:"flex", height:"100%", gap:0, maxWidth:1280, margin:"0 auto", overflow:"hidden" }}>
      <style>{`
        /* Layout principal */
        .exp-sidebar   { display: flex; }
        .exp-mobile-selector { display: none; }

        /* Header paciente */
        .exp-pat-actions { display: flex; gap: 8px; }
        .exp-pat-meta    { display: flex; gap: 12px; }

        /* Tabs */
        .exp-tabs { display: flex; gap: 4px; overflow-x: auto; }
        .exp-tabs::-webkit-scrollbar { display: none; }
        .exp-tab-label { display: inline; }

        /* Grids de contenido */
        .exp-grid-2  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .exp-grid-2t { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        /* Nota expandida */
        .exp-note-panel-desktop { display: flex; }
        .exp-note-panel-mobile  { display: none; }

        @media (max-width: 768px) {
          .exp-sidebar   { display: none !important; }
          .exp-mobile-selector { display: flex !important; }

          .exp-pat-actions { flex-wrap: wrap; gap: 6px; }
          .exp-pat-actions .btn-g { font-size: 11px; padding: 5px 8px; }
          .exp-pat-meta { flex-wrap: wrap; gap: 6px; }

          .exp-tab-label { display: none; }

          .exp-grid-2  { grid-template-columns: 1fr !important; }
          .exp-grid-2t { grid-template-columns: 1fr !important; }

          .exp-note-panel-desktop { display: none !important; }
          .exp-note-panel-mobile  { display: flex !important; }
        }
      `}</style>

      {/* ── Col 1: Lista pacientes (desktop) ── */}
      <div className="exp-sidebar" style={{ width:230, flexShrink:0, flexDirection:"column", marginRight:20, overflow:"hidden" }}>
        <div style={{ marginBottom:14 }}>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:22, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.3px", marginBottom:2 }}>Expedientes</h1>
          <p style={{ ...dm("12px"), color:"var(--text-muted)" }}>{PATIENTS_LIST.length} pacientes</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"7px 12px", marginBottom:12 }}>
          <span style={{ color:"var(--text-muted)", fontSize:13 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            style={{ border:"none", background:"transparent", outline:"none", ...dm("13px"), color:"var(--text-primary)", width:"100%" }} />
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:3, overflowY:"auto", flex:1 }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => setSelectedPatient(p)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, cursor:"pointer", transition:"all .15s", background:selectedPatient.id===p.id?"var(--accent-bg)":"transparent", border:`1px solid ${selectedPatient.id===p.id?"var(--accent-light)":"transparent"}` }}
              onMouseEnter={e => { if (selectedPatient.id!==p.id) (e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
              onMouseLeave={e => { if (selectedPatient.id!==p.id) (e.currentTarget as HTMLDivElement).style.background="transparent"; }}
            >
              <div style={{ width:34, height:34, borderRadius:"50%", background:`${p.color}18`, color:p.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>{p.initials}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{p.tag} · {p.sessions} ses.</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Col 2: Expediente ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

        {/* Selector móvil de paciente */}
        <div className="exp-mobile-selector" style={{ alignItems:"center", gap:10, marginBottom:14 }}>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:20, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.3px", margin:0 }}>Expedientes</h1>
          <select
            value={selectedPatient.id}
            onChange={e => { const p = PATIENTS_LIST.find(p => p.id===Number(e.target.value)); if (p) setSelectedPatient(p); }}
            style={{ flex:1, border:"1px solid var(--border)", borderRadius:10, padding:"8px 12px", background:"var(--surface)", color:"var(--text-primary)", ...dm("13px"), outline:"none" }}
          >
            {PATIENTS_LIST.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Header paciente */}
        <div className="card" style={{ padding:"16px 18px", marginBottom:14, flexShrink:0, borderRadius:16 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:14, justifyContent:"space-between", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:`${patient.color}18`, color:patient.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>{patient.initials}</div>
              <div>
                <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.2px" }}>{patient.name}</div>
                <div className="exp-pat-meta" style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:3 }}>
                  <span>{patient.age} años</span>
                  <span>·</span>
                  <span>{patient.occupation}</span>
                  <span>·</span>
                  <span>Desde {patient.since}</span>
                </div>
              </div>
            </div>
            <div className="exp-pat-actions">
              <button className="btn-g" style={{ fontSize:12 }}>📅 Agendar</button>
              <button className="btn-g" style={{ fontSize:12 }}>📋 Enviar test</button>
              <button
                style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 14px", borderRadius:10, height:34, fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, cursor:"pointer", boxShadow:"0 2px 8px rgba(139,115,85,0.35)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}
              >✏️ Nueva nota</button>
            </div>
          </div>
        </div>

        {/* Tabs — scroll horizontal en móvil */}
        <div className="exp-tabs" style={{ marginBottom:14, flexShrink:0 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:10, border:"none", cursor:"pointer", transition:"all .15s", ...dm("13px"), fontWeight:500, flexShrink:0, background:activeSection===s.id?"var(--accent)":"var(--surface)", color:activeSection===s.id?"#FAF7F2":"var(--text-secondary)" }}
              onMouseEnter={e => { if (activeSection!==s.id) (e.currentTarget as HTMLButtonElement).style.background="var(--surface-2)"; }}
              onMouseLeave={e => { if (activeSection!==s.id) (e.currentTarget as HTMLButtonElement).style.background="var(--surface)"; }}
            >
              <span style={{ fontSize:14 }}>{s.icon}</span>
              <span className="exp-tab-label">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div style={{ flex:1, overflowY:"auto" }}>

          {/* RESUMEN */}
          {activeSection === "resumen" && (
            <div className="exp-grid-2">
              <div className="card" style={{ padding:"18px 20px", borderRadius:16 }}>
                <div className="sec-t" style={{ marginBottom:14 }}>Diagnóstico</div>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 14px", borderRadius:12, background:`${patient.color}0C`, border:`1px solid ${patient.color}22`, marginBottom:12 }}>
                  <span style={{ fontSize:18 }}>🔬</span>
                  <div>
                    <div style={{ ...dm("13px"), fontWeight:600, color:"var(--text-primary)" }}>{patient.tag}</div>
                    <div style={{ ...dm("12px"), color:"var(--text-secondary)", marginTop:3 }}>{patient.diagnosis}</div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 14px", borderRadius:12, background:"var(--surface)" }}>
                  <span style={{ fontSize:16 }}>💊</span>
                  <div>
                    <div style={{ ...dm("12px"), fontWeight:600, color:"var(--text-primary)", marginBottom:2 }}>Medicación</div>
                    <div style={{ ...dm("12px"), color:"var(--text-secondary)" }}>{patient.medications}</div>
                  </div>
                </div>
              </div>
              <div className="card" style={{ padding:"18px 20px", borderRadius:16 }}>
                <div className="sec-t" style={{ marginBottom:14 }}>Datos personales</div>
                {[{ label:"Teléfono", val:patient.phone }, { label:"Email", val:patient.email }, { label:"Estado civil", val:patient.maritalStatus }, { label:"Contacto emergencia", val:patient.emergencyContact }].map((r,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border-light)" }}>
                    <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>{r.label}</span>
                    <span style={{ ...dm("12px"), color:"var(--text-primary)", fontWeight:500, textAlign:"right", maxWidth:"60%" }}>{r.val}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:"18px 20px", borderRadius:16 }}>
                <div className="sec-t" style={{ marginBottom:14 }}>Evolución en tests</div>
                {patient.tests.map(t => (
                  <div key={t.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <div><span style={{ ...dm("13px"), fontWeight:600, color:"var(--text-primary)" }}>{t.name}</span><span style={{ ...dm("11px"), color:"var(--text-muted)", marginLeft:8 }}>{t.date}</span></div>
                      <span style={{ ...dm("12px"), fontWeight:600, color:t.color }}>{t.score}/{t.maxScore} · {t.level}</span>
                    </div>
                    <div className="pbar"><div className="pfill" style={{ width:`${(t.score/t.maxScore)*100}%`, background:t.color }} /></div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:"18px 20px", borderRadius:16 }}>
                <div className="sec-t" style={{ marginBottom:14 }}>Resumen de sesiones</div>
                {[{ label:"Total de sesiones", val:String(patient.sessions) }, { label:"Frecuencia", val:"Semanal" }, { label:"Modalidad", val:"Presencial" }, { label:"Última sesión", val:patient.notes[0]?.date??"—" }, { label:"Próxima sesión", val:"Hoy 10:00" }].map((r,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border-light)" }}>
                    <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>{r.label}</span>
                    <span style={{ ...dm("12px"), color:"var(--text-primary)", fontWeight:500 }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTAS */}
          {activeSection === "notas" && (
            <div style={{ display:"flex", gap:16, height:"100%" }}>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                {patient.notes.map(n => (
                  <div key={n.id} className="card"
                    onClick={() => setActiveNote(activeNote?.id===n.id?null:n)}
                    style={{ padding:"16px 18px", borderRadius:14, cursor:"pointer", borderColor:activeNote?.id===n.id?"var(--accent-light)":"var(--border-light)", background:activeNote?.id===n.id?"var(--accent-bg)":"var(--bg-card)" }}
                    onMouseEnter={e => { if (activeNote?.id!==n.id) (e.currentTarget as HTMLDivElement).style.boxShadow="0 4px 16px rgba(28,25,23,0.10)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow=""; }}
                  >
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ ...dm("13px"), fontWeight:600, color:"var(--text-primary)" }}>Sesión #{n.sessionNum}</span>
                        <span className="tag" style={{ background:"var(--surface)", color:"var(--text-secondary)" }}>{n.format}</span>
                        <span className="tag" style={{ background:moodBg[n.mood], color:moodColor[n.mood] }}>{n.mood}</span>
                      </div>
                      <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>{n.date} · {n.duration} min</span>
                    </div>
                    <p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, margin:0 }}>{n.preview}</p>
                  </div>
                ))}
              </div>

              {/* Nota expandida — desktop */}
              {activeNote && (
                <div className="exp-note-panel-desktop" style={{ width:340, flexShrink:0, flexDirection:"column" }}>
                  <div className="card" style={{ padding:"20px", borderRadius:16, overflowY:"auto", animation:"slideIn .2s ease" }}>
                    <style>{`@keyframes slideIn{from{transform:translateX(10px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <span style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>Sesión #{activeNote.sessionNum}</span>
                      <button onClick={() => setActiveNote(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:16 }}>✕</button>
                    </div>
                    <div style={{ display:"flex", gap:6, marginBottom:16 }}>
                      <span className="tag" style={{ background:"var(--surface)", color:"var(--text-secondary)" }}>{activeNote.format}</span>
                      <span className="tag" style={{ background:moodBg[activeNote.mood], color:moodColor[activeNote.mood] }}>{activeNote.mood}</span>
                      <span className="tag" style={{ background:"var(--surface)", color:"var(--text-secondary)" }}>{activeNote.duration} min</span>
                    </div>
                    <div style={{ ...dm("12px"), color:"var(--text-muted)", marginBottom:8 }}>{activeNote.date}</div>
                    <p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.7 }}>{activeNote.preview}</p>
                    <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:8 }}>
                      <button className="btn-g" style={{ fontSize:12 }}>✏️ Editar nota</button>
                      <button className="btn-g" style={{ fontSize:12 }}>🖨️ Exportar PDF</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TESTS */}
          {activeSection === "tests" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
              {patient.tests.map(t => (
                <div key={t.id} className="card" style={{ padding:"18px 20px", borderRadius:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                    <div><div style={{ ...dm("15px"), fontWeight:700, color:"var(--text-primary)" }}>{t.name}</div><div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:2 }}>{t.date}</div></div>
                    <span className="tag" style={{ background:`${t.color}18`, color:t.color }}>{t.level}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:10 }}>
                    <span style={{ fontFamily:"var(--font-lora)", fontSize:32, fontWeight:600, color:t.color }}>{t.score}</span>
                    <span style={{ ...dm("13px"), color:"var(--text-muted)" }}>/ {t.maxScore}</span>
                  </div>
                  <div className="pbar" style={{ height:6, borderRadius:3 }}>
                    <div className="pfill" style={{ width:`${(t.score/t.maxScore)*100}%`, background:t.color, borderRadius:3 }} />
                  </div>
                </div>
              ))}
              <div className="card" style={{ padding:"18px 20px", borderRadius:16, border:"2px dashed var(--border)", background:"transparent", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, cursor:"pointer", minHeight:140 }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background="transparent"; }}
              >
                <span style={{ fontSize:24 }}>📋</span>
                <span style={{ ...dm("13px"), color:"var(--text-muted)", fontWeight:500 }}>Enviar nuevo test</span>
              </div>
            </div>
          )}

          {/* ARCHIVOS */}
          {activeSection === "archivos" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12 }}>
              {[{ icon:"📄", name:"Consentimiento informado", date:"Mar 2024", size:"245 KB" }, { icon:"📊", name:"Evaluación inicial", date:"Mar 2024", size:"1.2 MB" }, { icon:"📋", name:"Plan de tratamiento", date:"Abr 2024", size:"380 KB" }, { icon:"🖼️", name:"Test de Rorschach", date:"May 2024", size:"3.4 MB" }].map((f,i) => (
                <div key={i} className="card" style={{ padding:"16px", borderRadius:14, cursor:"pointer", display:"flex", flexDirection:"column", gap:10 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(0)"; }}
                >
                  <span style={{ fontSize:28 }}>{f.icon}</span>
                  <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)", lineHeight:1.3 }}>{f.name}</div>
                  <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{f.date} · {f.size}</div>
                </div>
              ))}
              <div className="card" style={{ padding:"16px", borderRadius:14, border:"2px dashed var(--border)", background:"transparent", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, cursor:"pointer", minHeight:130 }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background="transparent"; }}
              >
                <span style={{ fontSize:24 }}>📎</span>
                <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>Subir archivo</span>
              </div>
            </div>
          )}

          {/* TRATAMIENTO */}
          {activeSection === "tratamiento" && (
            <div className="exp-grid-2t">
              <div className="card" style={{ padding:"18px 20px", borderRadius:16 }}>
                <div className="sec-t" style={{ marginBottom:14 }}>Plan de tratamiento</div>
                {[{ done:true, label:"Evaluación inicial y diagnóstico" }, { done:true, label:"Psicoeducación sobre ansiedad" }, { done:true, label:"Técnicas de relajación y respiración" }, { done:true, label:"Reestructuración cognitiva" }, { done:false, label:"Exposición gradual a situaciones ansiosas" }, { done:false, label:"Entrenamiento en habilidades sociales" }, { done:false, label:"Prevención de recaídas" }].map((item,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid var(--border-light)" }}>
                    <div style={{ width:20, height:20, borderRadius:"50%", background:item.done?"var(--green-bg)":"var(--surface)", border:`2px solid ${item.done?"var(--green)":"var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:10, color:"var(--green)" }}>{item.done?"✓":""}</div>
                    <span style={{ ...dm("13px"), color:item.done?"var(--text-secondary)":"var(--text-primary)", textDecoration:item.done?"line-through":"none" }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:"18px 20px", borderRadius:16 }}>
                <div className="sec-t" style={{ marginBottom:14 }}>Objetivos terapéuticos</div>
                {[{ label:"Reducir puntuación GAD-7 a nivel leve (< 5)", progress:62, color:"var(--accent)" }, { label:"Mejorar calidad de sueño", progress:75, color:"var(--green)" }, { label:"Reducir evitación en situaciones sociales", progress:40, color:"var(--blue)" }].map((obj,i) => (
                  <div key={i} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ ...dm("13px"), color:"var(--text-primary)" }}>{obj.label}</span>
                      <span style={{ ...dm("12px"), color:obj.color, fontWeight:600 }}>{obj.progress}%</span>
                    </div>
                    <div className="pbar" style={{ height:6, borderRadius:3 }}><div className="pfill" style={{ width:`${obj.progress}%`, background:obj.color, borderRadius:3 }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nota expandida — móvil bottom sheet */}
      {activeNote && (
        <>
          <div onClick={() => setActiveNote(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:60, backdropFilter:"blur(2px)" }} className="exp-note-panel-mobile" />
          <div className="exp-note-panel-mobile"
            style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--bg-card)", borderRadius:"20px 20px 0 0", border:"1px solid var(--border-light)", boxShadow:"0 -4px 24px rgba(0,0,0,0.12)", zIndex:61, maxHeight:"80vh", flexDirection:"column", padding:"20px", overflowY:"auto", animation:"slideUp .25s ease" }}
          >
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
              <div style={{ width:36, height:4, borderRadius:2, background:"var(--border)" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>Sesión #{activeNote.sessionNum}</span>
              <button onClick={() => setActiveNote(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
              <span className="tag" style={{ background:"var(--surface)", color:"var(--text-secondary)" }}>{activeNote.format}</span>
              <span className="tag" style={{ background:moodBg[activeNote.mood], color:moodColor[activeNote.mood] }}>{activeNote.mood}</span>
              <span className="tag" style={{ background:"var(--surface)", color:"var(--text-secondary)" }}>{activeNote.duration} min</span>
            </div>
            <div style={{ ...dm("12px"), color:"var(--text-muted)", marginBottom:8 }}>{activeNote.date}</div>
            <p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.7 }}>{activeNote.preview}</p>
            <div style={{ marginTop:20, display:"flex", gap:8 }}>
              <button className="btn-g" style={{ flex:1, fontSize:12 }}>✏️ Editar nota</button>
              <button className="btn-g" style={{ flex:1, fontSize:12 }}>🖨️ Exportar PDF</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}