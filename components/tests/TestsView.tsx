// src/components/TestsView.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TESTS_DATA, CATEGORIES, PsychTest } from "@/components/tests/tests-data";
import { CustomTestBuilder, CustomTestDraft } from "@/components/tests/CustomTestBuilder";

type TestStatus  = "sent" | "completed" | "reviewed";
type TabSection  = "biblioteca" | "personalizados" | "enviados" | "resultados";

interface Submission {
  id: string; test_id: string; test_short_name: string; status: TestStatus;
  sent_at: string; completed_at: string | null;
  score: number | null; max_score: number | null; level: string | null;
  notes: string | null; answers: Record<string, number> | null;
  isCustom?: boolean;
  patient: { id: string; first_name: string; last_name: string; email: string | null; };
}

interface CustomTest {
  id: string; name: string; short_name: string; description: string;
  questions: any[]; created_at: string;
}

interface PatientOption { id: string; first_name: string; last_name: string; email: string | null; }

const STATUS_META: Record<TestStatus, { label: string; color: string; bg: string }> = {
  sent:      { label:"Enviado",    color:"var(--amber)", bg:"var(--amber-bg)" },
  completed: { label:"Completado", color:"var(--blue)",  bg:"var(--blue-bg)"  },
  reviewed:  { label:"Revisado",   color:"var(--green)", bg:"var(--green-bg)" },
};

const AVATAR_COLORS = ["#8B7355","#4A7BA7","#5C8A6E","#C47B2B","#B5594A","#7B6EA8"];
const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });
function getInitials(first: string, last: string) { return `${first[0]??''}${last[0]??''}`.toUpperCase(); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("es-MX", { day:"numeric", month:"short", year:"numeric" }); }
function colorForName(name: string) { return AVATAR_COLORS[name.length % AVATAR_COLORS.length]; }

export function TestsView() {
  const supabase = createClient();
  const [tab, setTab]                   = useState<TabSection>("biblioteca");
  const [filterCat, setFilterCat]       = useState("Todos");
  const [selectedTest, setSelectedTest] = useState<PsychTest | null>(null);
  const [sendModal, setSendModal]       = useState<{ test: PsychTest | null; custom: CustomTest | null } | null>(null);
  const [detailModal, setDetailModal]   = useState<Submission | null>(null);
  const [answersModal, setAnswersModal] = useState<Submission | null>(null);
  const [showBuilder, setShowBuilder]   = useState(false);

  const [submissions, setSubmissions]   = useState<Submission[]>([]);
  const [customTests, setCustomTests]   = useState<CustomTest[]>([]);
  const [patients, setPatients]         = useState<PatientOption[]>([]);
  const [loadingSubs, setLoadingSubs]   = useState(true);
  const [userId, setUserId]             = useState("");

  const [sendPatientId, setSendPatientId] = useState("");
  const [sending, setSending]             = useState(false);
  const [sendError, setSendError]         = useState("");
  const [sendSuccess, setSendSuccess]     = useState(false);
  const [copiedLink, setCopiedLink]       = useState("");
  const [linkCopied, setLinkCopied]       = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoadingSubs(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: subs }, { data: customSubs }, { data: pats }, { data: ctests }] = await Promise.all([
      supabase.from("test_submissions").select(`id, test_id, test_short_name, status, sent_at, completed_at, score, max_score, level, notes, answers, patient:patients(id, first_name, last_name, email)`).eq("psychologist_id", user.id).order("sent_at", { ascending: false }),
      supabase.from("custom_test_submissions").select(`id, custom_test_id, test_short_name, status, sent_at, completed_at, notes, answers, patient:patients(id, first_name, last_name, email)`).eq("psychologist_id", user.id).order("sent_at", { ascending: false }),
      supabase.from("patients").select("id, first_name, last_name, email").eq("psychologist_id", user.id).order("first_name"),
      supabase.from("custom_tests").select("id, name, short_name, description, questions, created_at").eq("psychologist_id", user.id).order("created_at", { ascending: false }),
    ]);

    const predefined = (subs ?? []).map((s: any) => ({ ...s, isCustom: false, patient: Array.isArray(s.patient) ? s.patient[0] : s.patient })) as Submission[];
    const customs    = (customSubs ?? []).map((s: any) => ({ ...s, test_id: s.custom_test_id, isCustom: true, score: null, max_score: null, level: null, patient: Array.isArray(s.patient) ? s.patient[0] : s.patient })) as Submission[];

    setSubmissions([...predefined, ...customs].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()));
    setPatients((pats ?? []) as PatientOption[]);
    setCustomTests((ctests ?? []) as CustomTest[]);
    setLoadingSubs(false);
  }

  async function handleCreateCustomTest(draft: CustomTestDraft) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");
    const { error } = await supabase.from("custom_tests").insert({
      psychologist_id: user.id,
      name:        draft.name,
      short_name:  draft.short_name,
      description: draft.description,
      questions:   draft.questions,
    });
    if (error) throw error;
    setShowBuilder(false);
    await load();
    setTab("personalizados");
  }

  async function handleDeleteCustomTest(id: string) {
    if (!confirm("¿Eliminar este test? No se podrá recuperar.")) return;
    await supabase.from("custom_tests").delete().eq("id", id);
    setCustomTests(prev => prev.filter(t => t.id !== id));
  }

  async function handleSendTest() {
    if (!sendModal || !sendPatientId) return;
    setSending(true); setSendError(""); setSendSuccess(false);

    const patient = patients.find(p => p.id === sendPatientId);
    if (!patient)        { setSendError("Paciente no encontrado"); setSending(false); return; }
    if (!patient.email)  { setSendError("Este paciente no tiene email registrado."); setSending(false); return; }

    try {
      const isCustom = !!sendModal.custom;
      const body = isCustom
        ? { patientId: patient.id, patientEmail: patient.email, patientName: `${patient.first_name} ${patient.last_name}`.trim(), psychologistId: userId, customTestId: sendModal.custom!.id, customTestShortName: sendModal.custom!.short_name }
        : { patientId: patient.id, patientEmail: patient.email, patientName: `${patient.first_name} ${patient.last_name}`.trim(), psychologistId: userId, testId: sendModal.test!.id, testShortName: sendModal.test!.shortName };

      const res  = await fetch("/api/send-test", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al enviar");

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      setCopiedLink(`${appUrl}/cuestionario/${json.token}`);
      setSendSuccess(true);
      await load();
    } catch (e: any) {
      setSendError(e.message ?? "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  async function handleMarkReviewed(subId: string, isCustom: boolean) {
    const table = isCustom ? "custom_test_submissions" : "test_submissions";
    const { error } = await supabase.from(table).update({ status: "reviewed" }).eq("id", subId);
    if (!error) {
      setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: "reviewed" } : s));
      setDetailModal(prev => prev?.id === subId ? { ...prev, status: "reviewed" } : prev);
    }
  }

  const filteredTests  = TESTS_DATA.filter(t => filterCat === "Todos" || t.category === filterCat);
  const pendingCount   = submissions.filter(s => s.status === "completed").length;
  const openSendModal  = (test: PsychTest | null, custom: CustomTest | null) => {
    setSendModal({ test, custom }); setSendSuccess(false); setSendError(""); setSendPatientId(patients[0]?.id ?? "");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", maxWidth:1280, margin:"0 auto" }}>
      <style>{`
        .tests-tabs { display: flex; overflow-x: auto; }
        .tests-tabs::-webkit-scrollbar { display: none; }
        .tests-sent-table { display: block; }
        .tests-sent-cards { display: none; }
        .tests-detail-desktop { display: flex; }
        .tests-detail-mobile  { display: none; }
        @media (max-width: 768px) {
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
            {TESTS_DATA.length} predefinidos · {customTests.length} personalizados · {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount>1?"s":""}` : "Sin pendientes"}
          </p>
        </div>
        <button className="btn-p" style={{ display:"flex", alignItems:"center", gap:8 }} onClick={() => setShowBuilder(true)}>
          ＋ Crear test
        </button>
      </div>

      {/* Tabs */}
      <div className="tests-tabs" style={{ borderBottom:"1px solid var(--border-light)", marginBottom:20, flexShrink:0 }}>
        {([
          { key:"biblioteca",    icon:"📚", label:"Biblioteca"     },
          { key:"personalizados",icon:"✏️",  label:"Mis tests"      },
          { key:"enviados",      icon:"📤", label:"Enviados"       },
          { key:"resultados",    icon:"📊", label:"Resultados"     },
        ] as { key: TabSection; icon: string; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:"10px 16px", background:"transparent", border:"none", borderBottom:`2px solid ${tab===t.key?"var(--accent)":"transparent"}`, cursor:"pointer", ...dm("13px"), color:tab===t.key?"var(--accent)":"var(--text-secondary)", fontWeight:tab===t.key?500:400, whiteSpace:"nowrap", flexShrink:0, position:"relative" }}>
            {t.icon} {t.label}
            {t.key==="resultados" && pendingCount > 0 && (
              <span style={{ position:"absolute", top:6, right:4, width:16, height:16, borderRadius:"50%", background:"var(--red)", color:"#fff", ...dm("9px"), display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{pendingCount}</span>
            )}
            {t.key==="personalizados" && customTests.length > 0 && (
              <span style={{ marginLeft:6, padding:"1px 6px", borderRadius:10, background:"var(--accent-bg)", color:"var(--accent)", ...dm("10px"), fontWeight:600 }}>{customTests.length}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden", gap:16 }}>
        <div style={{ flex:1, overflowY:"auto" }}>

          {/* ── BIBLIOTECA ── */}
          {tab === "biblioteca" && (
            <>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
                {CATEGORIES.map(c => <span key={c} className={`chip${filterCat===c?" on":""}`} onClick={() => setFilterCat(c)} style={{ cursor:"pointer", flexShrink:0 }}>{c}</span>)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
                {filteredTests.map(t => (
                  <div key={t.id} className="card"
                    onClick={() => setSelectedTest(t.id===selectedTest?.id?null:t)}
                    style={{ padding:18, cursor:"pointer", borderColor:selectedTest?.id===t.id?"var(--accent-light)":"var(--border-light)", background:selectedTest?.id===t.id?"var(--accent-bg)":"var(--bg-card)", transition:"all .2s" }}
                    onMouseEnter={e => { if(selectedTest?.id!==t.id){(e.currentTarget as HTMLDivElement).style.transform="translateY(-2px)";(e.currentTarget as HTMLDivElement).style.boxShadow="0 4px 16px rgba(28,25,23,0.10)";} }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(0)";(e.currentTarget as HTMLDivElement).style.boxShadow=""; }}>
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
                    <div style={{ display:"flex", gap:12, marginBottom:12 }}>
                      <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>❓ {t.questions.length} ítems</span>
                      <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>⏱ ~{Math.ceil(t.questions.length*0.5)} min</span>
                    </div>
                    <button className="btn-p" style={{ width:"100%", fontSize:12, padding:"8px 0" }}
                      onClick={e => { e.stopPropagation(); openSendModal(t, null); }}>
                      📤 Enviar a paciente
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── MIS TESTS (personalizados) ── */}
          {tab === "personalizados" && (
            <>
              {customTests.length === 0 ? (
                <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 24px", gap:12, textAlign:"center" }}>
                  <span style={{ fontSize:40, opacity:0.3 }}>✏️</span>
                  <div style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)" }}>Sin tests personalizados</div>
                  <div style={{ ...dm("13px"), color:"var(--text-muted)" }}>Crea tu primer test con el botón "Crear test".</div>
                  <button className="btn-p" style={{ marginTop:8 }} onClick={() => setShowBuilder(true)}>＋ Crear test</button>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
                  {customTests.map(ct => (
                    <div key={ct.id} className="card" style={{ padding:18 }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:"var(--accent-bg)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:"var(--accent)" }}>✏️</div>
                        <span className="tag" style={{ background:"var(--accent-bg)", color:"var(--accent)" }}>Personalizado</span>
                      </div>
                      <div style={{ ...dm("15px"), fontWeight:700, color:"var(--text-primary)", marginBottom:2 }}>{ct.short_name}</div>
                      <div style={{ ...dm("12px"), color:"var(--text-muted)", marginBottom:8 }}>{ct.name}</div>
                      {ct.description && <p style={{ ...dm("12px"), color:"var(--text-secondary)", lineHeight:1.5, marginBottom:12 }}>{ct.description}</p>}
                      <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:14 }}>❓ {ct.questions.length} preguntas · Creado {fmtDate(ct.created_at)}</div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button className="btn-p" style={{ flex:1, fontSize:12, padding:"8px 0" }} onClick={() => openSendModal(null, ct)}>📤 Enviar</button>
                        <button className="btn-g" style={{ padding:"8px 12px", fontSize:12 }} onClick={() => handleDeleteCustomTest(ct.id)}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── ENVIADOS ── */}
          {tab === "enviados" && (
            <>
              {loadingSubs ? (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60, gap:10 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin .7s linear infinite" }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : submissions.length === 0 ? (
                <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 24px", gap:12, textAlign:"center" }}>
                  <span style={{ fontSize:40, opacity:0.3 }}>📤</span>
                  <div style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)" }}>Sin envíos aún</div>
                </div>
              ) : (
                <>
                  <div className="tests-sent-table card" style={{ overflow:"hidden" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr auto", gap:12, padding:"10px 18px", background:"var(--surface)", borderBottom:"1px solid var(--border-light)" }}>
                      {["Paciente","Test","Enviado","Estado",""].map((h,i) => (
                        <span key={i} style={{ ...dm("11px"), fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</span>
                      ))}
                    </div>
                    {submissions.map(s => {
                      const pName = `${s.patient.first_name} ${s.patient.last_name}`;
                      const color = colorForName(pName);
                      return (
                        <div key={s.id}
                          style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr auto", gap:12, padding:"12px 18px", borderBottom:"1px solid var(--border-light)", alignItems:"center", transition:"background .15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background="transparent"; }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:32, height:32, borderRadius:"50%", background:`${color}18`, color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:600, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>
                              {getInitials(s.patient.first_name, s.patient.last_name)}
                            </div>
                            <span style={{ ...dm("13px"), color:"var(--text-primary)", fontWeight:500 }}>{pName}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <span style={{ ...dm("13px"), color:"var(--text-primary)", fontWeight:600 }}>{s.test_short_name}</span>
                            {s.isCustom && <span style={{ ...dm("9px"), background:"var(--accent-bg)", color:"var(--accent)", padding:"1px 5px", borderRadius:4 }}>custom</span>}
                          </div>
                          <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>{fmtDate(s.sent_at)}</span>
                          <div><span className="tag" style={{ background:STATUS_META[s.status].bg, color:STATUS_META[s.status].color }}>{STATUS_META[s.status].label}</span></div>
                          <button className="btn-g" style={{ padding:"5px 10px", fontSize:11 }}
                            onClick={() => (s.status==="completed"||s.status==="reviewed") ? setDetailModal(s) : null}>
                            {(s.status==="completed"||s.status==="reviewed")?"Ver resultado":"Pendiente"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {/* Mobile cards */}
                  <div className="tests-sent-cards" style={{ flexDirection:"column", gap:10 }}>
                    {submissions.map(s => {
                      const pName = `${s.patient.first_name} ${s.patient.last_name}`;
                      const color = colorForName(pName);
                      return (
                        <div key={s.id} className="card" style={{ padding:"14px 16px" }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:36, height:36, borderRadius:"50%", background:`${color}18`, color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600 }}>
                                {getInitials(s.patient.first_name, s.patient.last_name)}
                              </div>
                              <div>
                                <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)" }}>{pName}</div>
                                <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{fmtDate(s.sent_at)}</div>
                              </div>
                            </div>
                            <span className="tag" style={{ background:STATUS_META[s.status].bg, color:STATUS_META[s.status].color }}>{STATUS_META[s.status].label}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <span style={{ ...dm("14px"), fontWeight:700, color:"var(--text-primary)" }}>{s.test_short_name}</span>
                            {(s.status==="completed"||s.status==="reviewed") && (
                              <button className="btn-g" style={{ padding:"5px 12px", fontSize:12 }} onClick={() => setDetailModal(s)}>Ver resultado</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── RESULTADOS ── */}
          {tab === "resultados" && (
            <>
              {submissions.filter(s => s.status==="completed"||s.status==="reviewed").length === 0 ? (
                <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 24px", gap:12, textAlign:"center" }}>
                  <span style={{ fontSize:40, opacity:0.3 }}>📊</span>
                  <div style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)" }}>Sin resultados aún</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
                  {submissions.filter(s => s.status==="completed"||s.status==="reviewed").map(s => {
                    const pName = `${s.patient.first_name} ${s.patient.last_name}`;
                    const color = colorForName(pName);
                    const pct   = s.score != null && s.max_score ? Math.round((s.score/s.max_score)*100) : 0;
                    const testDef   = TESTS_DATA.find(t => t.id === s.test_id);
                    const rangeColor = testDef?.scoring.ranges.find(r => r.level === s.level)?.color ?? "var(--accent)";
                    return (
                      <div key={s.id} className="card" style={{ padding:"18px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:38, height:38, borderRadius:"50%", background:`${color}18`, color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600 }}>
                              {getInitials(s.patient.first_name, s.patient.last_name)}
                            </div>
                            <div>
                              <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)" }}>{pName}</div>
                              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>{s.test_short_name} · {s.completed_at ? fmtDate(s.completed_at) : "—"}</span>
                                {s.isCustom && <span style={{ ...dm("9px"), background:"var(--accent-bg)", color:"var(--accent)", padding:"1px 5px", borderRadius:4 }}>custom</span>}
                              </div>
                            </div>
                          </div>
                          <span className="tag" style={{ background:STATUS_META[s.status].bg, color:STATUS_META[s.status].color }}>{STATUS_META[s.status].label}</span>
                        </div>
                        {s.score != null ? (
                          <>
                            <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:8 }}>
                              <span style={{ fontFamily:"var(--font-lora)", fontSize:32, fontWeight:600, color:rangeColor }}>{s.score}</span>
                              <span style={{ ...dm("13px"), color:"var(--text-muted)" }}>/ {s.max_score}</span>
                              {s.level && <span className="tag" style={{ marginLeft:6, background:`${rangeColor}18`, color:rangeColor }}>{s.level}</span>}
                            </div>
                            <div className="pbar" style={{ height:6, marginBottom:12 }}>
                              <div className="pfill" style={{ width:`${pct}%`, background:rangeColor }} />
                            </div>
                          </>
                        ) : (
                          <div style={{ ...dm("12px"), color:"var(--text-muted)", marginBottom:12 }}>Test personalizado — ver respuestas para detalles</div>
                        )}
                        <div style={{ display:"flex", gap:8 }}>
                          <button className="btn-g" style={{ flex:1, fontSize:12, padding:"7px" }} onClick={() => setDetailModal(s)}>📊 Ver detalle</button>
                          {s.status === "completed" && (
                            <button className="btn-p" style={{ flex:1, fontSize:12, padding:"7px" }} onClick={() => handleMarkReviewed(s.id, s.isCustom ?? false)}>✓ Revisado</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel detalle — desktop */}
        {selectedTest && tab==="biblioteca" && (
          <div className="tests-detail-desktop" style={{ width:280, flexShrink:0, flexDirection:"column" }}>
            <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid var(--border-light)", background:"var(--bg-card)", padding:20, overflowY:"auto" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:`${selectedTest.color}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{selectedTest.icon}</div>
                <button onClick={() => setSelectedTest(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:16 }}>✕</button>
              </div>
              <div style={{ ...dm("16px"), fontWeight:700, color:"var(--text-primary)", marginBottom:2 }}>{selectedTest.shortName}</div>
              <div style={{ ...dm("12px"), color:"var(--text-muted)", marginBottom:12 }}>{selectedTest.name}</div>
              <p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, marginBottom:16 }}>{selectedTest.description}</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                {[{ label:"Ítems", val:selectedTest.questions.length }, { label:"Duración", val:`~${Math.ceil(selectedTest.questions.length*0.5)} min` }].map((r,i) => (
                  <div key={i} style={{ background:"var(--surface)", borderRadius:10, padding:"10px 12px" }}>
                    <div style={{ ...dm("10px"), color:"var(--text-muted)", marginBottom:2 }}>{r.label}</div>
                    <div style={{ ...dm("13px"), fontWeight:600, color:"var(--text-primary)" }}>{r.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:8 }}>Rangos</div>
                {selectedTest.scoring.ranges.map((r,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:r.color, flexShrink:0 }} />
                    <span style={{ ...dm("12px"), color:"var(--text-secondary)" }}>{r.level}</span>
                    <span style={{ ...dm("11px"), color:"var(--text-muted)", marginLeft:"auto" }}>{r.min}–{r.max}</span>
                  </div>
                ))}
              </div>
              <button className="btn-p" style={{ width:"100%" }} onClick={() => { openSendModal(selectedTest, null); setSelectedTest(null); }}>📤 Enviar a paciente</button>
            </div>
          </div>
        )}
      </div>

      {/* Builder modal */}
      {showBuilder && <CustomTestBuilder onSave={handleCreateCustomTest} onClose={() => setShowBuilder(false)} />}

      {/* Modal enviar */}
      {sendModal && (
        <>
          <div onClick={() => { setSendModal(null); setSendSuccess(false); }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:70, backdropFilter:"blur(4px)" }} />
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"var(--bg-card)", borderRadius:20, padding:28, width:"min(440px, 92vw)", zIndex:71, boxShadow:"0 8px 28px rgba(28,25,23,0.14)", animation:"popIn .2s ease" }}>
            <style>{`@keyframes popIn{from{transform:translate(-50%,-48%) scale(.95);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}`}</style>
            {!sendSuccess ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                  <div>
                    <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)" }}>Enviar cuestionario</div>
                    <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:3 }}>El paciente recibirá un email con el link</div>
                  </div>
                  <button onClick={() => setSendModal(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:16 }}>✕</button>
                </div>
                <div style={{ padding:"12px 16px", borderRadius:12, background:"var(--surface)", border:"1px solid var(--border-light)", marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:"var(--accent-bg)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                      {sendModal.custom ? "✏️" : sendModal.test?.icon}
                    </div>
                    <div>
                      <div style={{ ...dm("13px"), fontWeight:600, color:"var(--text-primary)" }}>
                        {sendModal.custom ? sendModal.custom.name : `Cuestionario de ${sendModal.test?.category}`}
                      </div>
                      <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>
                        {sendModal.custom ? `${sendModal.custom.questions.length} preguntas` : `${sendModal.test?.questions.length} ítems`}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.4px", fontWeight:600 }}>Paciente</div>
                  <select value={sendPatientId} onChange={e => setSendPatientId(e.target.value)}
                    style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none" }}>
                    <option value="">— Seleccionar paciente —</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.email ? ` — ${p.email}` : " — sin email"}</option>
                    ))}
                  </select>
                </div>
                {sendError && <div style={{ padding:"10px 14px", borderRadius:10, background:"var(--red-bg)", ...dm("12px"), color:"var(--red)", marginBottom:14 }}>⚠ {sendError}</div>}
                <div style={{ display:"flex", gap:10 }}>
                  <button className="btn-g" style={{ flex:1 }} onClick={() => setSendModal(null)}>Cancelar</button>
                  <button className="btn-p" style={{ flex:1, opacity:(!sendPatientId||sending)?0.6:1 }} onClick={handleSendTest} disabled={!sendPatientId||sending}>
                    {sending ? "Enviando..." : "📤 Enviar por email"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center" }}>
                <div style={{ width:60, height:60, borderRadius:"50%", background:"var(--green-bg)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:26 }}>✅</div>
                <div style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)", marginBottom:8 }}>¡Cuestionario enviado!</div>
                <div style={{ ...dm("13px"), color:"var(--text-muted)", marginBottom:20 }}>El paciente recibirá un email con el link.</div>
                {copiedLink && (
                  <div style={{ background:"var(--surface)", borderRadius:10, padding:"10px 14px", marginBottom:16, wordBreak:"break-all" }}>
                    <div style={{ ...dm("10px"), color:"var(--text-muted)", marginBottom:4 }}>Link de respaldo</div>
                    <div style={{ ...dm("12px"), color:"var(--accent)" }}>{copiedLink}</div>
                    <button onClick={() => { navigator.clipboard.writeText(copiedLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
                      style={{ marginTop:8, padding:"5px 14px", borderRadius:8, border:`1px solid ${linkCopied?"var(--green)":"var(--border)"}`, background:linkCopied?"var(--green-bg)":"var(--surface)", color:linkCopied?"var(--green)":"var(--text-secondary)", ...dm("11px"), cursor:"pointer" }}>
                      {linkCopied ? "✓ Copiado" : "📋 Copiar link"}
                    </button>
                  </div>
                )}
                <button className="btn-p" style={{ width:"100%" }} onClick={() => { setSendModal(null); setSendSuccess(false); setTab("enviados"); }}>Ver en Enviados</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal detalle resultado */}
      {detailModal && (
        <>
          <div onClick={() => setDetailModal(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:80, backdropFilter:"blur(4px)" }} />
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"var(--bg-card)", borderRadius:20, padding:28, width:"min(480px, 94vw)", maxHeight:"85vh", overflowY:"auto", zIndex:81, boxShadow:"0 8px 28px rgba(28,25,23,0.2)", animation:"popIn .2s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
              <div>
                <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)" }}>Resultado — {detailModal.test_short_name}</div>
                <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:3 }}>{`${detailModal.patient.first_name} ${detailModal.patient.last_name}`} · {detailModal.completed_at ? fmtDate(detailModal.completed_at) : "—"}</div>
              </div>
              <button onClick={() => setDetailModal(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:16 }}>✕</button>
            </div>
            {detailModal.score != null && (() => {
              const testDef    = TESTS_DATA.find(t => t.id === detailModal.test_id);
              const rangeColor = testDef?.scoring.ranges.find(r => r.level === detailModal.level)?.color ?? "var(--accent)";
              const rangeDesc  = testDef?.scoring.ranges.find(r => r.level === detailModal.level)?.description ?? "";
              const pct = detailModal.max_score ? Math.round((detailModal.score/detailModal.max_score)*100) : 0;
              return (
                <div style={{ background:"var(--surface)", borderRadius:14, padding:"20px", marginBottom:20, textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-lora)", fontSize:48, fontWeight:700, color:rangeColor, lineHeight:1 }}>{detailModal.score}</div>
                  <div style={{ ...dm("13px"), color:"var(--text-muted)", marginBottom:10 }}>de {detailModal.max_score} puntos</div>
                  <span className="tag" style={{ background:`${rangeColor}18`, color:rangeColor, fontSize:13, padding:"5px 14px" }}>{detailModal.level}</span>
                  <div style={{ ...dm("12px"), color:"var(--text-secondary)", marginTop:10, lineHeight:1.5 }}>{rangeDesc}</div>
                  <div className="pbar" style={{ height:8, margin:"16px 0 0" }}>
                    <div className="pfill" style={{ width:`${pct}%`, background:rangeColor }} />
                  </div>
                </div>
              );
            })()}
            {detailModal.isCustom && !detailModal.score && (
              <div style={{ background:"var(--surface)", borderRadius:14, padding:"16px 20px", marginBottom:20, ...dm("13px"), color:"var(--text-muted)" }}>
                Test personalizado — las respuestas son texto o selección libre, sin puntuación automática.
              </div>
            )}
            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <button className="btn-g" style={{ flex:1 }} onClick={() => { setAnswersModal(detailModal); setDetailModal(null); }}>📋 Ver respuestas</button>
              {detailModal.status !== "reviewed" && (
                <button className="btn-p" style={{ flex:1 }} onClick={() => handleMarkReviewed(detailModal.id, detailModal.isCustom ?? false)}>✓ Marcar revisado</button>
              )}
            </div>
            <button className="btn-g" style={{ width:"100%" }} onClick={() => setDetailModal(null)}>Cerrar</button>
          </div>
        </>
      )}

      {/* Modal respuestas */}
      {answersModal && (() => {
        const isCustom  = answersModal.isCustom;
        const testDef   = isCustom ? customTests.find(t => t.id === answersModal.test_id) : TESTS_DATA.find(t => t.id === answersModal.test_id);
        const questions = (testDef as any)?.questions ?? [];
        const rawAnswers = answersModal.answers as Record<string, any> | null;
        const rangeColor = !isCustom ? (TESTS_DATA.find(t => t.id === answersModal.test_id)?.scoring.ranges.find(r => r.level === answersModal.level)?.color ?? "var(--accent)") : "var(--accent)";
        return (
          <>
            <div onClick={() => setAnswersModal(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:90, backdropFilter:"blur(4px)" }} />
            <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"var(--bg-card)", borderRadius:20, padding:28, width:"min(560px, 94vw)", maxHeight:"88vh", overflowY:"auto", zIndex:91, boxShadow:"0 8px 28px rgba(28,25,23,0.2)", animation:"popIn .2s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                <div>
                  <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)" }}>Respuestas — {answersModal.test_short_name}</div>
                  <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:3 }}>{`${answersModal.patient.first_name} ${answersModal.patient.last_name}`} · {answersModal.completed_at ? fmtDate(answersModal.completed_at) : "—"}</div>
                </div>
                <button onClick={() => setAnswersModal(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:16 }}>✕</button>
              </div>
              {answersModal.score != null && (
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", background:"var(--surface)", borderRadius:12, marginBottom:20 }}>
                  <div style={{ fontFamily:"var(--font-lora)", fontSize:32, fontWeight:700, color:rangeColor }}>{answersModal.score}</div>
                  <div>
                    <span className="tag" style={{ background:`${rangeColor}18`, color:rangeColor }}>{answersModal.level}</span>
                    <div style={{ ...dm("11px"), color:"var(--text-muted)", marginTop:4 }}>de {answersModal.max_score} puntos</div>
                  </div>
                </div>
              )}
              {questions.length > 0 && rawAnswers ? (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {questions.map((q: any, idx: number) => {
                    const answerRaw = rawAnswers[String(q.id)];
                    const answerLabel = q.type === "text" ? answerRaw
                      : q.type === "boolean" || q.type === "radio"
                        ? (q.options ?? []).find((o: any) => o.value === answerRaw)?.label ?? String(answerRaw ?? "—")
                        : String(answerRaw ?? "—");
                    return (
                      <div key={q.id} style={{ padding:"14px 16px", borderRadius:12, border:"1px solid var(--border-light)", background:"var(--bg-card)" }}>
                        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                          <span style={{ ...dm("11px"), color:"var(--text-muted)", fontWeight:600, minWidth:22 }}>{idx+1}.</span>
                          <div style={{ flex:1 }}>
                            <div style={{ ...dm("13px"), color:"var(--text-secondary)", marginBottom:8, lineHeight:1.5 }}>{q.text}</div>
                            <div style={{ display:"inline-flex", padding:"6px 12px", borderRadius:8, background:"var(--surface)", border:"1px solid var(--border-light)" }}>
                              <span style={{ ...dm("12px"), fontWeight:600, color:"var(--text-primary)" }}>
                                {answerLabel ?? "Sin respuesta"}
                                {typeof answerRaw === "number" && answerRaw !== undefined && q.type !== "text" && (
                                  <span style={{ ...dm("11px"), color:"var(--text-muted)", marginLeft:6 }}>({answerRaw} pts)</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ ...dm("13px"), color:"var(--text-muted)", textAlign:"center", padding:"24px 0" }}>No hay respuestas registradas</div>
              )}
              <div style={{ marginTop:20, display:"flex", gap:10 }}>
                {answersModal.status !== "reviewed" && (
                  <button className="btn-p" style={{ flex:1 }} onClick={() => { handleMarkReviewed(answersModal.id, answersModal.isCustom ?? false); setAnswersModal(null); }}>✓ Marcar revisado</button>
                )}
                <button className="btn-g" style={{ flex:1 }} onClick={() => setAnswersModal(null)}>Cerrar</button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}