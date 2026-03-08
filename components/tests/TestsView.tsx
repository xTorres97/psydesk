"use client";

import { useState } from "react";

type TestStatus = "available" | "sent" | "completed" | "reviewed";
type TabSection = "biblioteca" | "enviados" | "resultados";

interface PsychTest {
  id: number; name: string; shortName: string; category: string;
  description: string; questions: number; duration: number;
  icon: string; color: string; validated: boolean;
}
interface SentTest {
  id: number; testName: string; patientName: string; patientInitials: string;
  patientColor: string; sentDate: string; status: TestStatus;
  score?: number; maxScore?: number; level?: string;
}

const TESTS: PsychTest[] = [
  { id:1, name:"Patient Health Questionnaire – 9",  shortName:"PHQ-9",  category:"Depresión",     description:"Escala de tamizaje para depresión mayor. Ampliamente usado en atención primaria y especializada.",          questions:9,  duration:5,  icon:"🧠", color:"#4A7BA7", validated:true  },
  { id:2, name:"Generalized Anxiety Disorder – 7",  shortName:"GAD-7",  category:"Ansiedad",      description:"Instrumento de cribado para el trastorno de ansiedad generalizada con alta sensibilidad.",                  questions:7,  duration:4,  icon:"💭", color:"#C47B2B", validated:true  },
  { id:3, name:"Beck Depression Inventory II",       shortName:"BDI-II", category:"Depresión",     description:"Inventario de síntomas depresivos con 21 ítems, ampliamente validado a nivel mundial.",                    questions:21, duration:10, icon:"📊", color:"#B5594A", validated:true  },
  { id:4, name:"Burns Anxiety Inventory",            shortName:"BAI",    category:"Ansiedad",      description:"Inventario de 33 síntomas de ansiedad desarrollado por David Burns para uso clínico.",                     questions:33, duration:12, icon:"⚡", color:"#C47B2B", validated:true  },
  { id:5, name:"AUDIT – Alcohol Use Disorders",      shortName:"AUDIT",  category:"Adicciones",    description:"Test de identificación de trastornos por uso de alcohol desarrollado por la OMS.",                         questions:10, duration:5,  icon:"🔍", color:"#7B6EA8", validated:true  },
  { id:6, name:"PCL-5 – PTSD Checklist",             shortName:"PCL-5",  category:"Trauma",        description:"Lista de verificación de síntomas de TEPT basada en criterios DSM-5.",                                      questions:20, duration:8,  icon:"🛡", color:"#5C8A6E", validated:true  },
  { id:7, name:"SCL-90-R",                           shortName:"SCL-90", category:"Sintomatología",description:"Inventario de 90 síntomas para evaluar 9 dimensiones de psicopatología.",                                 questions:90, duration:25, icon:"📋", color:"#8B7355", validated:true  },
  { id:8, name:"Cuestionario personalizado",         shortName:"Custom", category:"Personalizado", description:"Crea tu propio cuestionario con preguntas de opción múltiple, escala Likert o texto.",                     questions:0,  duration:0,  icon:"✏️", color:"#A89880", validated:false },
];

const SENT_TESTS: SentTest[] = [
  { id:1, testName:"GAD-7",  patientName:"María González", patientInitials:"MG", patientColor:"#8B7355", sentDate:"Hoy 9:00",    status:"completed", score:8,  maxScore:21, level:"Moderado"      },
  { id:2, testName:"PHQ-9",  patientName:"Carlos Mendoza", patientInitials:"CM", patientColor:"#4A7BA7", sentDate:"Hoy 8:30",    status:"sent"                                                     },
  { id:3, testName:"BDI-II", patientName:"Ana Reyes",      patientInitials:"AR", patientColor:"#5C8A6E", sentDate:"Ayer 16:00",  status:"reviewed",  score:15, maxScore:63, level:"Leve-Moderado" },
  { id:4, testName:"GAD-7",  patientName:"Joaquín Torres", patientInitials:"JT", patientColor:"#C47B2B", sentDate:"Hace 2 días", status:"sent"                                                     },
  { id:5, testName:"PCL-5",  patientName:"Ana Reyes",      patientInitials:"AR", patientColor:"#5C8A6E", sentDate:"Hace 3 días", status:"completed", score:22, maxScore:80, level:"Moderado"       },
];

const CATEGORIES = ["Todos","Depresión","Ansiedad","Trauma","Adicciones","Sintomatología","Personalizado"];

const STATUS_META: Record<TestStatus, { label: string; color: string; bg: string }> = {
  available: { label:"Disponible", color:"var(--text-muted)", bg:"var(--surface)"  },
  sent:      { label:"Enviado",    color:"var(--amber)",      bg:"var(--amber-bg)" },
  completed: { label:"Completado", color:"var(--blue)",       bg:"var(--blue-bg)"  },
  reviewed:  { label:"Revisado",   color:"var(--green)",      bg:"var(--green-bg)" },
};

const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });

export function TestsView() {
  const [tab, setTab]                   = useState<TabSection>("biblioteca");
  const [filterCat, setFilterCat]       = useState("Todos");
  const [selectedTest, setSelectedTest] = useState<PsychTest | null>(null);
  const [sendModal, setSendModal]       = useState<PsychTest | null>(null);

  const filteredTests = TESTS.filter(t => filterCat === "Todos" || t.category === filterCat);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", maxWidth:1280, margin:"0 auto" }}>
      <style>{`
        /* Tabs */
        .tests-tabs { display: flex; overflow-x: auto; }
        .tests-tabs::-webkit-scrollbar { display: none; }
        .tests-tab-text-long { display: inline; }
        .tests-tab-text-short { display: none; }

        /* Tabla enviados */
        .tests-sent-table { display: block; }
        .tests-sent-cards { display: none; }

        /* Panel detalle */
        .tests-detail-desktop { display: flex; }
        .tests-detail-mobile  { display: none; }

        @media (max-width: 768px) {
          .tests-tab-text-long  { display: none; }
          .tests-tab-text-short { display: inline; }

          .tests-sent-table { display: none !important; }
          .tests-sent-cards { display: flex !important; }

          .tests-detail-desktop { display: none !important; }
          .tests-detail-mobile  { display: flex !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:24, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.3px" }}>Tests psicológicos</h1>
          <p style={{ ...dm("13px"), color:"var(--text-muted)", marginTop:4 }}>
            Biblioteca · {SENT_TESTS.filter(t => t.status==="completed").length} resultados pendientes de revisar
          </p>
        </div>
        <button
          style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 18px", borderRadius:10, height:38, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"0 2px 8px rgba(139,115,85,0.35)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}
        >
          ✏️ Crear cuestionario
        </button>
      </div>

      {/* Tabs */}
      <div className="tests-tabs" style={{ borderBottom:"1px solid var(--border-light)", marginBottom:20, flexShrink:0 }}>
        {(["biblioteca","enviados","resultados"] as TabSection[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:"10px 16px", background:"transparent", border:"none", borderBottom:`2px solid ${tab===t?"var(--accent)":"transparent"}`, cursor:"pointer", transition:"all .15s", ...dm("13px"), color:tab===t?"var(--accent)":"var(--text-secondary)", fontWeight:tab===t?500:400, whiteSpace:"nowrap", flexShrink:0 }}
          >
            <span className="tests-tab-text-long">
              {t==="biblioteca"?"📚 Biblioteca":t==="enviados"?"📤 Enviados & Pendientes":"📊 Resultados"}
            </span>
            <span className="tests-tab-text-short">
              {t==="biblioteca"?"📚":t==="enviados"?"📤":"📊"}
            </span>
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ display:"flex", flex:1, overflow:"hidden", gap:16 }}>
        <div style={{ flex:1, overflowY:"auto" }}>

          {/* ── BIBLIOTECA ── */}
          {tab === "biblioteca" && (
            <>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
                {CATEGORIES.map(c => (
                  <span key={c} className={`chip${filterCat===c?" on":""}`} onClick={() => setFilterCat(c)} style={{ cursor:"pointer", flexShrink:0 }}>{c}</span>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
                {filteredTests.map(t => (
                  <div key={t.id} className="card"
                    onClick={() => setSelectedTest(t.id===selectedTest?.id?null:t)}
                    style={{ padding:18, cursor:"pointer", borderColor:selectedTest?.id===t.id?"var(--accent-light)":"var(--border-light)", background:selectedTest?.id===t.id?"var(--accent-bg)":"var(--bg-card)", transition:"all .2s" }}
                    onMouseEnter={e => { if (selectedTest?.id!==t.id) { (e.currentTarget as HTMLDivElement).style.transform="translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow="0 4px 16px rgba(28,25,23,0.10)"; } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow=""; }}
                  >
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:`${t.color}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{t.icon}</div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                        <span className="tag" style={{ background:`${t.color}14`, color:t.color }}>{t.category}</span>
                        {t.validated && <span className="tag" style={{ background:"var(--green-bg)", color:"var(--green)" }}>✓ Validado</span>}
                      </div>
                    </div>
                    <div style={{ ...dm("15px"), fontWeight:700, color:"var(--text-primary)", marginBottom:2 }}>{t.shortName}</div>
                    <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:8 }}>{t.name}</div>
                    <p style={{ ...dm("12px"), color:"var(--text-secondary)", lineHeight:1.5, marginBottom:12, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" } as React.CSSProperties}>{t.description}</p>
                    {t.questions > 0 && (
                      <div style={{ display:"flex", gap:12, marginBottom:12 }}>
                        <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>❓ {t.questions} ítems</span>
                        <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>⏱ ~{t.duration} min</span>
                      </div>
                    )}
                    <button className="btn-p" style={{ width:"100%", fontSize:12, padding:"8px 0" }}
                      onClick={e => { e.stopPropagation(); setSendModal(t); }}
                    >📤 Enviar a paciente</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ENVIADOS — desktop tabla ── */}
          {tab === "enviados" && (
            <>
              <div className="tests-sent-table card" style={{ overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr auto", gap:12, padding:"10px 18px", background:"var(--surface)", borderBottom:"1px solid var(--border-light)" }}>
                  {["Paciente","Test","Enviado","Estado",""].map((h,i) => (
                    <span key={i} style={{ ...dm("11px"), fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</span>
                  ))}
                </div>
                {SENT_TESTS.map(t => (
                  <div key={t.id}
                    style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr auto", gap:12, padding:"12px 18px", borderBottom:"1px solid var(--border-light)", alignItems:"center", transition:"background .15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background="transparent"; }}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:`${t.patientColor}18`, color:t.patientColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:600, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>{t.patientInitials}</div>
                      <span style={{ ...dm("13px"), color:"var(--text-primary)", fontWeight:500 }}>{t.patientName}</span>
                    </div>
                    <span style={{ ...dm("13px"), color:"var(--text-primary)", fontWeight:600 }}>{t.testName}</span>
                    <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>{t.sentDate}</span>
                    <div><span className="tag" style={{ background:STATUS_META[t.status].bg, color:STATUS_META[t.status].color }}>{STATUS_META[t.status].label}</span></div>
                    <button className="btn-g" style={{ padding:"5px 10px", fontSize:11 }}>
                      {(t.status==="completed"||t.status==="reviewed")?"Ver resultado":"Reenviar"}
                    </button>
                  </div>
                ))}
              </div>

              {/* Enviados — móvil cards */}
              <div className="tests-sent-cards" style={{ flexDirection:"column", gap:10 }}>
                {SENT_TESTS.map(t => (
                  <div key={t.id} className="card" style={{ padding:"14px 16px", borderRadius:14 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:"50%", background:`${t.patientColor}18`, color:t.patientColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>{t.patientInitials}</div>
                        <div>
                          <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)" }}>{t.patientName}</div>
                          <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{t.sentDate}</div>
                        </div>
                      </div>
                      <span className="tag" style={{ background:STATUS_META[t.status].bg, color:STATUS_META[t.status].color }}>{STATUS_META[t.status].label}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ ...dm("14px"), fontWeight:700, color:"var(--text-primary)" }}>{t.testName}</span>
                      <button className="btn-g" style={{ padding:"5px 12px", fontSize:12 }}>
                        {(t.status==="completed"||t.status==="reviewed")?"Ver resultado":"Reenviar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── RESULTADOS ── */}
          {tab === "resultados" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
              {SENT_TESTS.filter(t => t.status==="completed"||t.status==="reviewed").map(t => (
                <div key={t.id} className="card" style={{ padding:"18px", borderRadius:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:38, height:38, borderRadius:"50%", background:`${t.patientColor}18`, color:t.patientColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, fontFamily:"var(--font-dm-sans)" }}>{t.patientInitials}</div>
                      <div>
                        <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)" }}>{t.patientName}</div>
                        <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{t.testName} · {t.sentDate}</div>
                      </div>
                    </div>
                    <span className="tag" style={{ background:STATUS_META[t.status].bg, color:STATUS_META[t.status].color }}>{STATUS_META[t.status].label}</span>
                  </div>
                  {t.score !== undefined && (
                    <>
                      <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:8 }}>
                        <span style={{ fontFamily:"var(--font-lora)", fontSize:32, fontWeight:600, color:"var(--accent)" }}>{t.score}</span>
                        <span style={{ ...dm("13px"), color:"var(--text-muted)" }}>/ {t.maxScore}</span>
                        <span className="tag" style={{ marginLeft:6, background:"var(--amber-bg)", color:"var(--amber)" }}>{t.level}</span>
                      </div>
                      <div className="pbar" style={{ height:6, borderRadius:3, marginBottom:12 }}>
                        <div className="pfill" style={{ width:`${((t.score??0)/(t.maxScore??1))*100}%`, background:"var(--accent)", borderRadius:3 }} />
                      </div>
                    </>
                  )}
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="btn-g" style={{ flex:1, fontSize:12, padding:"7px" }}>📂 Al expediente</button>
                    <button className="btn-p" style={{ flex:1, fontSize:12, padding:"7px" }}>✓ Marcar revisado</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel detalle — desktop */}
        {selectedTest && tab==="biblioteca" && (
          <div className="tests-detail-desktop" style={{ width:280, flexShrink:0, flexDirection:"column" }}>
            <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid var(--border-light)", background:"var(--bg-card)", padding:20, overflowY:"auto", animation:"slideIn .25s ease" }}>
              <style>{`@keyframes slideIn{from{transform:translateX(10px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:`${selectedTest.color}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{selectedTest.icon}</div>
                <button onClick={() => setSelectedTest(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:16 }}>✕</button>
              </div>
              <div style={{ ...dm("16px"), fontWeight:700, color:"var(--text-primary)", marginBottom:2 }}>{selectedTest.shortName}</div>
              <div style={{ ...dm("12px"), color:"var(--text-muted)", marginBottom:12 }}>{selectedTest.name}</div>
              <p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, marginBottom:16 }}>{selectedTest.description}</p>
              {selectedTest.questions > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                  {[{ label:"Ítems", val:selectedTest.questions }, { label:"Duración", val:`~${selectedTest.duration} min` }, { label:"Categoría", val:selectedTest.category }, { label:"Validación", val:selectedTest.validated?"Clínica":"—" }].map((r,i) => (
                    <div key={i} style={{ background:"var(--surface)", borderRadius:10, padding:"10px 12px" }}>
                      <div style={{ ...dm("10px"), color:"var(--text-muted)", marginBottom:2 }}>{r.label}</div>
                      <div style={{ ...dm("13px"), fontWeight:600, color:"var(--text-primary)" }}>{r.val}</div>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn-p" style={{ width:"100%" }} onClick={() => { setSendModal(selectedTest); setSelectedTest(null); }}>📤 Enviar a paciente</button>
            </div>
          </div>
        )}
      </div>

      {/* Panel detalle — móvil bottom sheet */}
      {selectedTest && tab==="biblioteca" && (
        <>
          <div onClick={() => setSelectedTest(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:60, backdropFilter:"blur(2px)" }} className="tests-detail-mobile" />
          <div className="tests-detail-mobile"
            style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--bg-card)", borderRadius:"20px 20px 0 0", border:"1px solid var(--border-light)", boxShadow:"0 -4px 24px rgba(0,0,0,0.12)", zIndex:61, maxHeight:"80vh", flexDirection:"column", padding:"20px", overflowY:"auto", animation:"slideUp .25s ease" }}
          >
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
              <div style={{ width:36, height:4, borderRadius:2, background:"var(--border)" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div style={{ width:48, height:48, borderRadius:12, background:`${selectedTest.color}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{selectedTest.icon}</div>
              <button onClick={() => setSelectedTest(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
            </div>
            <div style={{ ...dm("16px"), fontWeight:700, color:"var(--text-primary)", marginBottom:2 }}>{selectedTest.shortName}</div>
            <div style={{ ...dm("12px"), color:"var(--text-muted)", marginBottom:12 }}>{selectedTest.name}</div>
            <p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, marginBottom:16 }}>{selectedTest.description}</p>
            {selectedTest.questions > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                {[{ label:"Ítems", val:selectedTest.questions }, { label:"Duración", val:`~${selectedTest.duration} min` }, { label:"Categoría", val:selectedTest.category }, { label:"Validación", val:selectedTest.validated?"Clínica":"—" }].map((r,i) => (
                  <div key={i} style={{ background:"var(--surface)", borderRadius:10, padding:"10px 12px" }}>
                    <div style={{ ...dm("10px"), color:"var(--text-muted)", marginBottom:2 }}>{r.label}</div>
                    <div style={{ ...dm("13px"), fontWeight:600, color:"var(--text-primary)" }}>{r.val}</div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-p" style={{ width:"100%" }} onClick={() => { setSendModal(selectedTest); setSelectedTest(null); }}>📤 Enviar a paciente</button>
          </div>
        </>
      )}

      {/* Modal enviar */}
      {sendModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:70, backdropFilter:"blur(4px)" }}
          onClick={() => setSendModal(null)}
        >
          <div style={{ background:"var(--bg-card)", borderRadius:20, padding:24, width:"min(420px, 92vw)", boxShadow:"0 8px 28px rgba(28,25,23,0.14)", animation:"popIn .2s ease" }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`@keyframes popIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
              <div>
                <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)" }}>Enviar {sendModal.shortName}</div>
                <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:2 }}>Selecciona el paciente y el método de envío</div>
              </div>
              <button onClick={() => setSendModal(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:16 }}>✕</button>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ ...dm("12px"), color:"var(--text-muted)", marginBottom:6 }}>Paciente</div>
              <select style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none" }}>
                <option>María González</option>
                <option>Carlos Mendoza</option>
                <option>Ana Reyes</option>
                <option>Joaquín Torres</option>
              </select>
            </div>
            <div style={{ marginBottom:18 }}>
              <div style={{ ...dm("12px"), color:"var(--text-muted)", marginBottom:8 }}>Método de envío</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[{ icon:"📧", label:"Correo electrónico", active:true }, { icon:"🔗", label:"Link copiable", active:false }].map((m,i) => (
                  <div key={i} style={{ padding:12, borderRadius:10, border:`1px solid ${m.active?"var(--accent-light)":"var(--border)"}`, cursor:"pointer", textAlign:"center", background:m.active?"var(--accent-bg)":"var(--surface)" }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{m.icon}</div>
                    <div style={{ ...dm("12px"), color:m.active?"var(--accent)":"var(--text-secondary)" }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-g" style={{ flex:1 }} onClick={() => setSendModal(null)}>Cancelar</button>
              <button className="btn-p" style={{ flex:1 }} onClick={() => setSendModal(null)}>📤 Enviar test</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}