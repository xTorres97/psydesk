"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ExpedienteTestsTab } from "@/components/expedientes/ExpedienteTestsTab";
import { ExpedienteArchivosTab } from "@/components/expedientes/ExpedienteArchivosTab";

type Section = "resumen" | "historia" | "notas" | "tests" | "archivos" | "tratamiento";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface PatientRow {
  id: string; first_name: string; last_name: string;
  birth_date: string | null; gender: string | null;
  diagnosis: string | null; status: string;
  session_count: number; phone: string | null; email: string | null;
  occupation: string | null; emergency_contact: string | null;
  emergency_phone: string | null; education: string | null;
  referral_source: string | null; notes: string | null;
  created_at: string;
}
interface SessionNoteRow {
  id: string; session_date: string; session_number: number | null;
  subjective: string | null; objective: string | null;
  assessment: string | null; plan: string | null;
  free_note: string | null; mood_rating: number | null;
  next_session: string | null; is_draft: boolean; created_at: string;
}
interface ClinicalHistory {
  // Motivo
  motivo_consulta: string;
  cuadro_clinico: string;
  examen_mental: string;
  // Antecedentes
  ant_personal_medico: string; ant_personal_psicologico: string; ant_personal_psiquiatrico: string;
  ant_familiar_medico: string; ant_familiar_psicologico: string; ant_familiar_psiquiatrico: string;
  // Dinámica familiar
  dinamica_familiar: string;
  situacion_familiar: string;
  // Biopatografía prenatal
  prenatal_gesta: string; prenatal_duracion: string; prenatal_edad_materna: string;
  prenatal_controlado: string; prenatal_complicaciones: string; prenatal_observaciones: string;
  // Perinatal
  perinatal_tipo_parto: string; perinatal_complicaciones: string; perinatal_observaciones: string;
  // Neonatal
  neonatal_lloro: string; neonatal_peso_talla: string; neonatal_lactancia: string; neonatal_observaciones: string;
  // Desarrollo psicomotor
  psicomotor_control_cefalico: string; psicomotor_sedestacion: string; psicomotor_gateo: string;
  psicomotor_marcha: string; psicomotor_palabras: string; psicomotor_esfinteres: string;
  // Hábitos
  habitos_independencia: string; habitos_alimentacion: string; habitos_sueno: string; habitos_sustancias: string;
  // Personalidad
  personalidad_premorbida: string;
  // Situación actual
  vivienda_tipo: string; vivienda_habitaciones: string; vivienda_servicios: string;
  escolar_edad_inicio: string; escolar_adaptacion: string; escolar_rendimiento: string;
  escolar_fortalezas: string; escolar_dificultades: string; escolar_comportamiento: string;
  // Social
  relaciones_interpersonales: string;
  sexualidad: string;
  recreacion_actividades: string; recreacion_intereses: string; recreacion_electronicos: string;
  observaciones_generales: string;
}

const EMPTY_HISTORY: ClinicalHistory = {
  motivo_consulta:"", cuadro_clinico:"", examen_mental:"",
  ant_personal_medico:"", ant_personal_psicologico:"", ant_personal_psiquiatrico:"",
  ant_familiar_medico:"", ant_familiar_psicologico:"", ant_familiar_psiquiatrico:"",
  dinamica_familiar:"", situacion_familiar:"",
  prenatal_gesta:"", prenatal_duracion:"", prenatal_edad_materna:"",
  prenatal_controlado:"", prenatal_complicaciones:"", prenatal_observaciones:"",
  perinatal_tipo_parto:"", perinatal_complicaciones:"", perinatal_observaciones:"",
  neonatal_lloro:"", neonatal_peso_talla:"", neonatal_lactancia:"", neonatal_observaciones:"",
  psicomotor_control_cefalico:"", psicomotor_sedestacion:"", psicomotor_gateo:"",
  psicomotor_marcha:"", psicomotor_palabras:"", psicomotor_esfinteres:"",
  habitos_independencia:"", habitos_alimentacion:"", habitos_sueno:"", habitos_sustancias:"",
  personalidad_premorbida:"",
  vivienda_tipo:"", vivienda_habitaciones:"", vivienda_servicios:"",
  escolar_edad_inicio:"", escolar_adaptacion:"", escolar_rendimiento:"",
  escolar_fortalezas:"", escolar_dificultades:"", escolar_comportamiento:"",
  relaciones_interpersonales:"", sexualidad:"",
  recreacion_actividades:"", recreacion_intereses:"", recreacion_electronicos:"",
  observaciones_generales:"",
};

const AVATAR_COLORS = ["#8B7355","#4A7BA7","#5C8A6E","#C47B2B","#B5594A","#7B6EA8","#A85E6A","#6A9E8A"];
const SECTIONS: { id: Section; icon: string; label: string }[] = [
  { id:"resumen",     icon:"📋", label:"Resumen"          },
  { id:"historia",    icon:"📖", label:"Historia Clínica" },
  { id:"notas",       icon:"📝", label:"Notas"            },
  { id:"tests",       icon:"🧪", label:"Tests"            },
  { id:"archivos",    icon:"📎", label:"Archivos"         },
  { id:"tratamiento", icon:"🎯", label:"Tratamiento"      },
];

const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });

function calcAge(birth: string) {
  const today = new Date(); const b = new Date(birth);
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth()===b.getMonth() && today.getDate()<b.getDate())) age--;
  return age;
}
function getInitials(first: string, last: string) {
  return `${first[0]??''}${last[0]??''}`.toUpperCase();
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"});
}

// ─── Sub-componentes UI ───────────────────────────────────────────────────────
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className="card" style={{ padding:"18px 20px", borderRadius:16, ...style }}>{children}</div>
);
const SecTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily:"var(--font-lora)", fontSize:14, fontWeight:600, color:"var(--text-primary)", marginBottom:14, paddingBottom:8, borderBottom:"1px solid var(--border-light)" }}>{children}</div>
);
const Field = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border-light)" }}>
    <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>{label}</span>
    <span style={{ ...dm("12px"), color:"var(--text-primary)", fontWeight:500, textAlign:"right", maxWidth:"60%" }}>{value||"—"}</span>
  </div>
);

// ─── Modal Nueva Nota ─────────────────────────────────────────────────────────
interface NuevaNotaModalProps {
  patientId: string;
  psychologistId: string;
  sessionCount: number;
  onClose: () => void;
  onSaved: (note: SessionNoteRow) => void;
}
// ─── Hook dictado por voz ─────────────────────────────────────────────────────
type VoiceFieldId = "subjective"|"objective"|"assessment"|"plan"|"freeNote";

function useVoiceDictation(onResult: (fieldId: VoiceFieldId, text: string) => void) {
  const [activeField, setActiveField] = useState<VoiceFieldId|null>(null);
  const [supported, setSupported]     = useState(true);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
  }, []);

  function toggle(fieldId: VoiceFieldId) {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Si ya está escuchando este campo, detener
    if (activeField === fieldId) {
      recogRef.current?.stop();
      setActiveField(null);
      return;
    }

    // Detener cualquier reconocimiento previo
    recogRef.current?.stop();

    const recog = new SR();
    recog.continuous      = true;
    recog.interimResults  = true;
    recog.maxAlternatives = 1;
    // Sin lang fijo — usa el idioma del sistema/navegador

    let lastFinal = "";

    recog.onresult = (e: any) => {
      let interim = "";
      let final   = lastFinal;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) { final += t + " "; lastFinal = final; }
        else interim += t;
      }
      onResult(fieldId, final + interim);
    };

    recog.onerror = () => { setActiveField(null); };
    recog.onend   = () => { setActiveField(null); };

    recogRef.current = recog;
    recog.start();
    setActiveField(fieldId);
  }

  function stop() { recogRef.current?.stop(); setActiveField(null); }

  return { activeField, supported, toggle, stop };
}

function NuevaNotaModal({ patientId, psychologistId, sessionCount, onClose, onSaved }: NuevaNotaModalProps) {
  const supabase = createClient();
  const [format, setFormat] = useState<"SOAP"|"Libre">("SOAP");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [isDraft, setIsDraft] = useState(false);
  // Campos SOAP
  const [subjective, setSubjective] = useState("");
  const [objective,  setObjective]  = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan,       setPlan]       = useState("");
  // Libre
  const [freeNote, setFreeNote] = useState("");
  // Común
  const [moodRating, setMoodRating] = useState<number|null>(null);
  const [nextSession, setNextSession] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);

  // ── Dictado por voz ──────────────────────────────────────────────────────
  const setters: Record<VoiceFieldId, (v: string) => void> = {
    subjective: setSubjective,
    objective:  setObjective,
    assessment: setAssessment,
    plan:       setPlan,
    freeNote:   setFreeNote,
  };
  const { activeField, supported, toggle, stop } = useVoiceDictation((fieldId, text) => {
    setters[fieldId](text);
  });

  // Al cerrar, detener mic si estaba activo
  const handleClose = () => { stop(); onClose(); };

  // Botón de micrófono reutilizable
  const MicBtn = ({ fieldId }: { fieldId: VoiceFieldId }) => {
    if (!supported) return null;
    const isActive = activeField === fieldId;
    return (
      <button
        onClick={() => toggle(fieldId)}
        title={isActive ? "Detener dictado" : "Dictar con voz"}
        style={{
          position:"absolute", bottom:10, right:10,
          width:32, height:32, borderRadius:"50%", border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          background: isActive ? "var(--red)" : "var(--surface-2,var(--border))",
          color: isActive ? "#fff" : "var(--text-muted)",
          boxShadow: isActive ? "0 0 0 3px var(--red)33" : "none",
          transition:"all .2s", fontSize:14,
          animation: isActive ? "micPulse 1.5s ease-in-out infinite" : "none",
        }}
      >
        {isActive ? "⏹" : "🎙"}
      </button>
    );
  };

  const inputStyle: React.CSSProperties = {
    width:"100%", border:"1px solid var(--border)", borderRadius:10,
    padding:"9px 13px", background:"var(--surface)", outline:"none",
    ...dm("13px"), color:"var(--text-primary)", boxSizing:"border-box",
    transition:"border-color .15s", resize:"vertical" as const,
  };
  const labelStyle: React.CSSProperties = {
    ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase" as const,
    letterSpacing:"0.5px", fontWeight:600, display:"block", marginBottom:5,
  };

  async function handleSave(draft: boolean) {
    setLoading(true); setError("");
    try {
      const payload: any = {
        psychologist_id: psychologistId,
        patient_id:      patientId,
        session_date:    sessionDate,
        session_number:  sessionCount + 1,
        mood_rating:     moodRating,
        next_session:    nextSession || null,
        is_draft:        draft,
      };
      if (format === "SOAP") {
        payload.subjective = subjective || null;
        payload.objective  = objective  || null;
        payload.assessment = assessment || null;
        payload.plan       = plan       || null;
      } else {
        payload.free_note = freeNote || null;
      }
      const { data, error: dbErr } = await supabase.from("session_notes").insert(payload).select().single();
      if (dbErr) throw dbErr;
      onSaved(data);
      onClose();
    } catch(e: any) {
      setError(e.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div onClick={handleClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, backdropFilter:"blur(3px)" }} />
      <div style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:"min(600px,95vw)", maxHeight:"90vh",
        background:"var(--bg-card)", borderRadius:20,
        border:"1px solid var(--border-light)",
        boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
        zIndex:101, display:"flex", flexDirection:"column",
        animation:"modalIn .2s ease",
      }}>
        <style>{`
          @keyframes modalIn{from{transform:translate(-50%,-48%);opacity:0}to{transform:translate(-50%,-50%);opacity:1}}
          @keyframes micPulse{0%,100%{box-shadow:0 0 0 3px var(--red)33}50%{box-shadow:0 0 0 6px var(--red)22}}
        `}</style>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border-light)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>Nueva nota de sesión</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
              <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>Sesión #{sessionCount+1}</div>
              {supported && activeField && (
                <div style={{ display:"flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, background:"var(--red)18", border:"1px solid var(--red)33" }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--red)", display:"block", animation:"micPulse 1s infinite" }} />
                  <span style={{ ...dm("10px"), color:"var(--red)", fontWeight:600 }}>Dictando...</span>
                </div>
              )}
              {supported && !activeField && (
                <div style={{ ...dm("10px"), color:"var(--text-muted)", display:"flex", alignItems:"center", gap:3 }}>
                  🎙 Toca el micrófono en cada campo para dictar
                </div>
              )}
            </div>
          </div>
          <button onClick={handleClose} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:"20px 24px", overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:14 }}>

          {/* Fecha + Mood */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={labelStyle}>Fecha de sesión</label>
              <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} style={{ ...inputStyle, colorScheme:"dark", resize:"none" }} />
            </div>
            <div>
              <label style={labelStyle}>Estado emocional (1–10)</label>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setMoodRating(n===moodRating?null:n)}
                    style={{
                      width:32, height:32, borderRadius:8, border:"1px solid",
                      cursor:"pointer", ...dm("12px"), fontWeight:600,
                      background: moodRating===n ? (n>=7?"var(--green)":n>=4?"var(--amber)":"var(--red)") : "var(--surface)",
                      borderColor: moodRating===n ? (n>=7?"var(--green)":n>=4?"var(--amber)":"var(--red)") : "var(--border)",
                      color: moodRating===n ? "#fff" : "var(--text-secondary)",
                      transition:"all .15s",
                    }}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Formato */}
          <div>
            <label style={labelStyle}>Formato</label>
            <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:3, gap:2 }}>
              {(["SOAP","Libre"] as const).map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  style={{ flex:1, padding:"7px", border:"none", cursor:"pointer", borderRadius:8, ...dm("12px"), fontWeight:500, transition:"all .15s", background:format===f?"var(--accent)":"transparent", color:format===f?"#FAF7F2":"var(--text-secondary)" }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Campos SOAP */}
          {format==="SOAP" ? (
            <>
              {([
                { label:"S — Subjetivo", val:subjective, set:setSubjective, fieldId:"subjective" as VoiceFieldId, ph:"Lo que el paciente reporta: síntomas, emociones, experiencias subjetivas..." },
                { label:"O — Objetivo",  val:objective,  set:setObjective,  fieldId:"objective"  as VoiceFieldId, ph:"Observaciones del terapeuta: comportamiento, lenguaje corporal, afecto..." },
                { label:"A — Análisis",  val:assessment, set:setAssessment, fieldId:"assessment" as VoiceFieldId, ph:"Evaluación clínica, hipótesis, avances o retrocesos observados..." },
                { label:"P — Plan",      val:plan,       set:setPlan,       fieldId:"plan"       as VoiceFieldId, ph:"Intervenciones planificadas, tareas, objetivos para próxima sesión..." },
              ]).map(f => (
                <div key={f.label}>
                  <label style={labelStyle}>{f.label}</label>
                  <div style={{ position:"relative" }}>
                    <textarea
                      value={f.val}
                      onChange={e => f.set(e.target.value)}
                      placeholder={f.ph}
                      rows={3}
                      style={{
                        ...inputStyle, lineHeight:1.5,
                        paddingRight:44,
                        borderColor: activeField===f.fieldId ? "var(--red)" : "var(--border)",
                        boxShadow: activeField===f.fieldId ? "0 0 0 2px var(--red)22" : "none",
                      }}
                    />
                    <MicBtn fieldId={f.fieldId} />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div>
              <label style={labelStyle}>Nota libre</label>
              <div style={{ position:"relative" }}>
                <textarea
                  value={freeNote}
                  onChange={e => setFreeNote(e.target.value)}
                  placeholder="Escribe libremente sobre la sesión..."
                  rows={8}
                  style={{
                    ...inputStyle, lineHeight:1.5,
                    paddingRight:44,
                    borderColor: activeField==="freeNote" ? "var(--red)" : "var(--border)",
                    boxShadow: activeField==="freeNote" ? "0 0 0 2px var(--red)22" : "none",
                  }}
                />
                <MicBtn fieldId="freeNote" />
              </div>
            </div>
          )}

          {/* Próxima sesión */}
          <div>
            <label style={labelStyle}>Próxima sesión <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(opcional)</span></label>
            <input type="date" value={nextSession} onChange={e => setNextSession(e.target.value)} style={{ ...inputStyle, colorScheme:"dark", resize:"none" }} />
          </div>

          {error && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:"var(--red-bg)", border:"1px solid var(--red)33", ...dm("12px"), color:"var(--red)" }}>⚠ {error}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:"1px solid var(--border-light)", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button className="btn-g" onClick={() => handleSave(true)} disabled={loading} style={{ padding:"0 20px", height:38 }}>
            💾 Guardar borrador
          </button>
          <button
            onClick={() => handleSave(false)} disabled={loading}
            style={{ padding:"0 24px", height:38, borderRadius:10, border:"none", background:"var(--accent)", color:"#FAF7F2", ...dm("13px"), fontWeight:500, cursor:"pointer", transition:"all .15s" }}
          >
            {loading ? "Guardando..." : "✓ Guardar nota"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Historia Clínica Tab ─────────────────────────────────────────────────────
interface HistoriaTabProps {
  patientId: string;
  psychologistId: string;
  patientAge: number;
}
function HistoriaTab({ patientId, psychologistId, patientAge }: HistoriaTabProps) {
  const supabase = createClient();
  const [history, setHistory]     = useState<ClinicalHistory>(EMPTY_HISTORY);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [historyId, setHistoryId] = useState<string|null>(null);
  const [activeGroup, setActiveGroup] = useState("motivo");
  const isAdolescent = patientAge >= 10;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from("clinical_histories").select("*").eq("patient_id", patientId).maybeSingle();
      if (data) { setHistoryId(data.id); setHistory(data); }
      setLoading(false);
    }
    load();
  }, [patientId]);

  // Autosave cada 30s si hay cambios
  useEffect(() => {
    const t = setTimeout(() => { if (historyId) saveHistory(true); }, 30000);
    return () => clearTimeout(t);
  }, [history]);

  async function saveHistory(silent = false) {
    if (!silent) setSaving(true);
    try {
      const payload = { ...history, patient_id: patientId, psychologist_id: psychologistId };
      if (historyId) {
        await supabase.from("clinical_histories").update(payload).eq("id", historyId);
      } else {
        const { data } = await supabase.from("clinical_histories").insert(payload).select().single();
        if (data) setHistoryId(data.id);
      }
      if (!silent) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } catch(e) { console.error(e); }
    finally { if (!silent) setSaving(false); }
  }

  const set = (key: keyof ClinicalHistory) => (e: React.ChangeEvent<HTMLTextAreaElement|HTMLInputElement>) =>
    setHistory(prev => ({ ...prev, [key]: e.target.value }));

  const inputStyle: React.CSSProperties = {
    width:"100%", border:"1px solid var(--border)", borderRadius:10,
    padding:"9px 13px", background:"var(--surface)", outline:"none",
    ...dm("13px"), color:"var(--text-primary)", boxSizing:"border-box",
    lineHeight:1.6, transition:"border-color .15s",
  };
  const taStyle: React.CSSProperties = { ...inputStyle, resize:"vertical" as const };
  const labelStyle: React.CSSProperties = {
    ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase" as const,
    letterSpacing:"0.5px", fontWeight:600, display:"block", marginBottom:5,
  };
  const gridStyle: React.CSSProperties = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 };

  const GROUPS = [
    { id:"motivo",      label:"Motivo"         },
    { id:"antecedentes",label:"Antecedentes"   },
    { id:"familia",     label:"Familia"        },
    { id:"bio",         label:"Biopatografía"  },
    { id:"habitos",     label:"Hábitos"        },
    { id:"actual",      label:"Situación actual"},
    { id:"social",      label:"Social"         },
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60, gap:10 }}>
      <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin .7s linear infinite" }} />
      <span style={{ ...dm("13px"), color:"var(--text-muted)" }}>Cargando historia clínica...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      {/* Navegación interna */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:16, paddingBottom:4 }}>
        {GROUPS.map(g => (
          <button key={g.id} onClick={() => setActiveGroup(g.id)}
            style={{ padding:"5px 14px", borderRadius:20, border:"1px solid", cursor:"pointer", ...dm("12px"), fontWeight:500, flexShrink:0, transition:"all .15s",
              background: activeGroup===g.id ? "var(--accent)" : "var(--surface)",
              borderColor: activeGroup===g.id ? "var(--accent)" : "var(--border)",
              color: activeGroup===g.id ? "#FAF7F2" : "var(--text-secondary)",
            }}>{g.label}</button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:8, flexShrink:0 }}>
          {saved && <span style={{ ...dm("12px"), color:"var(--green)", display:"flex", alignItems:"center", gap:4 }}>✓ Guardado</span>}
          <button onClick={() => saveHistory()} disabled={saving}
            style={{ padding:"5px 16px", borderRadius:20, border:"none", cursor:"pointer", ...dm("12px"), fontWeight:500,
              background:"var(--accent)", color:"#FAF7F2", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Guardando..." : "💾 Guardar"}
          </button>
        </div>
      </div>

      {/* Motivo de consulta */}
      {activeGroup==="motivo" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SecTitle>Motivo de consulta</SecTitle>
            <textarea value={history.motivo_consulta} onChange={set("motivo_consulta")} placeholder="Describe el motivo de consulta del paciente..." rows={4} style={taStyle} />
          </Card>
          <Card>
            <SecTitle>Descripción del cuadro clínico actual</SecTitle>
            <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:10, lineHeight:1.5 }}>
              Describe síntomas, signos y experiencias. Incluye inicio, curso, detonantes, tipología, duración, frecuencia e intensidad.
            </div>
            <textarea value={history.cuadro_clinico} onChange={set("cuadro_clinico")} placeholder="Cronología de los síntomas actuales..." rows={6} style={taStyle} />
          </Card>
          <Card>
            <SecTitle>Examen Mental</SecTitle>
            <textarea value={history.examen_mental} onChange={set("examen_mental")} placeholder="Registro del estado mental del paciente..." rows={5} style={taStyle} />
          </Card>
        </div>
      )}

      {/* Antecedentes */}
      {activeGroup==="antecedentes" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SecTitle>Antecedentes Personales</SecTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { label:"Médicos", key:"ant_personal_medico" as keyof ClinicalHistory, ph:"Enfermedades, hospitalizaciones, cirugías, convulsiones, golpes..." },
                { label:"Psicológicos", key:"ant_personal_psicologico" as keyof ClinicalHistory, ph:"Tratamientos previos, diagnósticos anteriores..." },
                { label:"Psiquiátricos", key:"ant_personal_psiquiatrico" as keyof ClinicalHistory, ph:"Medicación psiquiátrica previa, hospitalizaciones..." },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <textarea value={history[f.key] as string} onChange={set(f.key)} placeholder={f.ph} rows={3} style={taStyle} />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SecTitle>Antecedentes Familiares</SecTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { label:"Médicos", key:"ant_familiar_medico" as keyof ClinicalHistory, ph:"Enfermedades hereditarias o relevantes en la familia..." },
                { label:"Psicológicos", key:"ant_familiar_psicologico" as keyof ClinicalHistory, ph:"Tratamientos psicológicos en familiares cercanos..." },
                { label:"Psiquiátricos", key:"ant_familiar_psiquiatrico" as keyof ClinicalHistory, ph:"Diagnósticos psiquiátricos en familiares..." },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <textarea value={history[f.key] as string} onChange={set(f.key)} placeholder={f.ph} rows={3} style={taStyle} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Familia */}
      {activeGroup==="familia" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SecTitle>Situación Familiar</SecTitle>
            <div>
              <label style={labelStyle}>El paciente convive con</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                {["Ambos padres","Solo con la madre","Solo con el padre","Otros"].map(opt => (
                  <button key={opt} onClick={() => setHistory(prev => ({ ...prev, situacion_familiar: opt }))}
                    style={{ padding:"6px 14px", borderRadius:20, border:"1px solid", cursor:"pointer", ...dm("12px"), fontWeight:500, transition:"all .15s",
                      background: history.situacion_familiar===opt ? "var(--accent)" : "var(--surface)",
                      borderColor: history.situacion_familiar===opt ? "var(--accent)" : "var(--border)",
                      color: history.situacion_familiar===opt ? "#FAF7F2" : "var(--text-secondary)",
                    }}>{opt}</button>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <SecTitle>Dinámica Familiar</SecTitle>
            <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:10, lineHeight:1.5 }}>
              Vínculos, roles, formas de interacción, comunicación, resolución de conflictos, factores de riesgo y protección.
            </div>
            <textarea value={history.dinamica_familiar} onChange={set("dinamica_familiar")} placeholder="Describe la dinámica del hogar y su influencia en el bienestar del paciente..." rows={6} style={taStyle} />
          </Card>
        </div>
      )}

      {/* Biopatografía */}
      {activeGroup==="bio" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SecTitle>Antecedente Prenatal</SecTitle>
            <div style={{ ...gridStyle, marginBottom:12 }}>
              {[
                { label:"N° de Gesta", key:"prenatal_gesta" as keyof ClinicalHistory },
                { label:"Duración del embarazo", key:"prenatal_duracion" as keyof ClinicalHistory },
                { label:"Edad materna", key:"prenatal_edad_materna" as keyof ClinicalHistory },
                { label:"Embarazo controlado", key:"prenatal_controlado" as keyof ClinicalHistory },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input value={history[f.key] as string} onChange={set(f.key)} style={{ ...inputStyle, resize:"none" }} />
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Complicaciones y observaciones</label>
              <textarea value={history.prenatal_complicaciones} onChange={set("prenatal_complicaciones")} placeholder="Hemorragias, accidentes, enfermedades, consumo de sustancias, abortos previos..." rows={3} style={taStyle} />
            </div>
          </Card>

          <Card>
            <SecTitle>Antecedente Perinatal</SecTitle>
            <div>
              <label style={labelStyle}>Tipo de parto</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                {["Pretérmino","A Término","Postérmino","Espontáneo","Inducido","Cesárea","Eutócico","Distócico","Fórceps"].map(opt => (
                  <button key={opt}
                    onClick={() => {
                      const parts = history.perinatal_tipo_parto.split(", ").filter(Boolean);
                      const next = parts.includes(opt) ? parts.filter(p=>p!==opt) : [...parts, opt];
                      setHistory(prev => ({ ...prev, perinatal_tipo_parto: next.join(", ") }));
                    }}
                    style={{ padding:"5px 12px", borderRadius:20, border:"1px solid", cursor:"pointer", ...dm("11px"), fontWeight:500, transition:"all .15s",
                      background: history.perinatal_tipo_parto.includes(opt) ? "var(--accent)" : "var(--surface)",
                      borderColor: history.perinatal_tipo_parto.includes(opt) ? "var(--accent)" : "var(--border)",
                      color: history.perinatal_tipo_parto.includes(opt) ? "#FAF7F2" : "var(--text-secondary)",
                    }}>{opt}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Complicaciones y observaciones</label>
              <textarea value={history.perinatal_complicaciones} onChange={set("perinatal_complicaciones")} placeholder="Placenta previa, sufrimiento fetal, ictericia neonatal..." rows={3} style={taStyle} />
            </div>
          </Card>

          <Card>
            <SecTitle>Estado al nacer</SecTitle>
            <div style={{ ...gridStyle, marginBottom:12 }}>
              {[
                { label:"Peso y talla al nacer", key:"neonatal_peso_talla" as keyof ClinicalHistory },
                { label:"Lactancia materna", key:"neonatal_lactancia" as keyof ClinicalHistory },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input value={history[f.key] as string} onChange={set(f.key)} style={{ ...inputStyle, resize:"none" }} />
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
              {["Lloró al nacer","Anoxia","Hipoxia","Incubadora"].map(opt => (
                <button key={opt}
                  onClick={() => {
                    const parts = history.neonatal_lloro.split(", ").filter(Boolean);
                    const next = parts.includes(opt) ? parts.filter(p=>p!==opt) : [...parts,opt];
                    setHistory(prev => ({...prev, neonatal_lloro: next.join(", ")}));
                  }}
                  style={{ padding:"5px 12px", borderRadius:20, border:"1px solid", cursor:"pointer", ...dm("11px"), fontWeight:500, transition:"all .15s",
                    background: history.neonatal_lloro.includes(opt)?"var(--accent)":"var(--surface)",
                    borderColor: history.neonatal_lloro.includes(opt)?"var(--accent)":"var(--border)",
                    color: history.neonatal_lloro.includes(opt)?"#FAF7F2":"var(--text-secondary)",
                  }}>{opt}</button>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Observaciones</label>
              <textarea value={history.neonatal_observaciones} onChange={set("neonatal_observaciones")} rows={2} style={taStyle} />
            </div>
          </Card>

          <Card>
            <SecTitle>Desarrollo Psicomotor</SecTitle>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {[
                { label:"Control cefálico", key:"psicomotor_control_cefalico" as keyof ClinicalHistory },
                { label:"Sedestación",      key:"psicomotor_sedestacion" as keyof ClinicalHistory },
                { label:"Gateo",            key:"psicomotor_gateo" as keyof ClinicalHistory },
                { label:"Marcha",           key:"psicomotor_marcha" as keyof ClinicalHistory },
                { label:"Primeras palabras",key:"psicomotor_palabras" as keyof ClinicalHistory },
                { label:"Control esfínteres",key:"psicomotor_esfinteres" as keyof ClinicalHistory },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input value={history[f.key] as string} onChange={set(f.key)} placeholder="Ej: 3 meses" style={{ ...inputStyle, resize:"none" }} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Hábitos */}
      {activeGroup==="habitos" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SecTitle>Hábitos Psicobiológicos</SecTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {[
                { label:"Independencia y autonomía", key:"habitos_independencia" as keyof ClinicalHistory, ph:"Descripción de la autonomía en actividades cotidianas..." },
                { label:"Alimentación", key:"habitos_alimentacion" as keyof ClinicalHistory, ph:"Hábitos alimenticios, restricciones, preferencias..." },
                { label:"Sueño", key:"habitos_sueno" as keyof ClinicalHistory, ph:"Calidad y cantidad de sueño, dificultades para dormir..." },
                { label:"Consumo de sustancias", key:"habitos_sustancias" as keyof ClinicalHistory, ph:"Cafeína, alcohol, cigarrillos, automedicación, otros..." },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <textarea value={history[f.key] as string} onChange={set(f.key)} placeholder={f.ph} rows={3} style={taStyle} />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SecTitle>Personalidad Premórbida</SecTitle>
            <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:10, lineHeight:1.5 }}>
              Estructura de personalidad previa al inicio del cuadro clínico. Referencia para evaluar cambio o deterioro.
            </div>
            <textarea value={history.personalidad_premorbida} onChange={set("personalidad_premorbida")} placeholder="Descripción del estilo de personalidad previo a la consulta..." rows={5} style={taStyle} />
          </Card>
        </div>
      )}

      {/* Situación actual */}
      {activeGroup==="actual" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SecTitle>Condiciones Socioeconómicas</SecTitle>
            <div style={{ ...gridStyle, marginBottom:12 }}>
              {[
                { label:"Tipo de vivienda", key:"vivienda_tipo" as keyof ClinicalHistory, ph:"Propia / Alquilada" },
                { label:"N° de habitaciones", key:"vivienda_habitaciones" as keyof ClinicalHistory, ph:"Ej: 3" },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input value={history[f.key] as string} onChange={set(f.key)} placeholder={f.ph} style={{ ...inputStyle, resize:"none" }} />
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Servicios básicos</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["Energía eléctrica","Agua","Aseo urbano","Internet"].map(opt => (
                  <button key={opt}
                    onClick={() => {
                      const parts = history.vivienda_servicios.split(", ").filter(Boolean);
                      const next = parts.includes(opt) ? parts.filter(p=>p!==opt) : [...parts,opt];
                      setHistory(prev => ({...prev, vivienda_servicios: next.join(", ")}));
                    }}
                    style={{ padding:"5px 12px", borderRadius:20, border:"1px solid", cursor:"pointer", ...dm("11px"), fontWeight:500, transition:"all .15s",
                      background: history.vivienda_servicios.includes(opt)?"var(--accent)":"var(--surface)",
                      borderColor: history.vivienda_servicios.includes(opt)?"var(--accent)":"var(--border)",
                      color: history.vivienda_servicios.includes(opt)?"#FAF7F2":"var(--text-secondary)",
                    }}>{opt}</button>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <SecTitle>Historia Escolar / Académica</SecTitle>
            <div style={{ ...gridStyle, marginBottom:12 }}>
              {[
                { label:"Edad de inicio escolar", key:"escolar_edad_inicio" as keyof ClinicalHistory },
                { label:"Proceso de adaptación", key:"escolar_adaptacion" as keyof ClinicalHistory },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input value={history[f.key] as string} onChange={set(f.key)} style={{ ...inputStyle, resize:"none" }} />
                </div>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { label:"Rendimiento académico", key:"escolar_rendimiento" as keyof ClinicalHistory, ph:"Promedio, nivel general..." },
                { label:"Fortalezas académicas", key:"escolar_fortalezas" as keyof ClinicalHistory, ph:"Áreas en las que destaca..." },
                { label:"Dificultades / Barreras", key:"escolar_dificultades" as keyof ClinicalHistory, ph:"Materias difíciles, problemas de aprendizaje..." },
                { label:"Comportamiento en clases", key:"escolar_comportamiento" as keyof ClinicalHistory, ph:"Relación con docentes, compañeros, actitud..." },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <textarea value={history[f.key] as string} onChange={set(f.key)} placeholder={f.ph} rows={2} style={taStyle} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Social */}
      {activeGroup==="social" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SecTitle>Relaciones Interpersonales</SecTitle>
            <textarea value={history.relaciones_interpersonales} onChange={set("relaciones_interpersonales")} placeholder="Vínculos con pares, amigos, figuras de autoridad, relaciones afectivas..." rows={5} style={taStyle} />
          </Card>
          <Card>
            <SecTitle>Sexualidad</SecTitle>
            <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:10, lineHeight:1.5 }}>
              {isAdolescent
                ? "Educación sexual, conocimientos sobre anticoncepción y prevención de ITS, consentimiento, cambios puberales, imagen corporal, experiencias de enamoramiento."
                : "Curiosidad sobre el tema, comprensión de diferencias, conocimiento sobre cuidado del cuerpo, imagen de sí mismo, reconocimiento de situaciones inapropiadas."}
            </div>
            <textarea value={history.sexualidad} onChange={set("sexualidad")} placeholder="Registro de la dimensión psicosexual según la edad del paciente..." rows={5} style={taStyle} />
          </Card>
          <Card>
            <SecTitle>Recreación y Uso del Tiempo Libre</SecTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { label:"Actividades extracurriculares e intereses", key:"recreacion_actividades" as keyof ClinicalHistory, ph:"Deportes, arte, música, grupos..." },
                { label:"Habilidades creativas", key:"recreacion_intereses" as keyof ClinicalHistory, ph:"Talentos, hobbies destacados..." },
                { label:"Uso de dispositivos electrónicos", key:"recreacion_electronicos" as keyof ClinicalHistory, ph:"Tipo, tiempo de uso, impacto..." },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <textarea value={history[f.key] as string} onChange={set(f.key)} placeholder={f.ph} rows={2} style={taStyle} />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SecTitle>Observaciones Generales</SecTitle>
            <textarea value={history.observaciones_generales} onChange={set("observaciones_generales")} placeholder="Cualquier información adicional relevante..." rows={4} style={taStyle} />
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────
export function ExpedientesView() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId");

  const [activeSection, setActiveSection]     = useState<Section>("resumen");
  const [patients, setPatients]               = useState<PatientRow[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [notes, setNotes]                     = useState<SessionNoteRow[]>([]);
  const [activeNote, setActiveNote]           = useState<SessionNoteRow | null>(null);
  const [search, setSearch]                   = useState("");
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingNotes, setLoadingNotes]       = useState(false);
  const [showNoteModal, setShowNoteModal]     = useState(false);
  const [userId, setUserId]                   = useState<string>("");

  // Cargar pacientes
  useEffect(() => {
    async function load() {
      setLoadingPatients(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("patients").select("*").eq("psychologist_id", user.id).order("first_name");
      if (data) {
        setPatients(data);
        // Si viene patientId en la URL, preseleccionar ese paciente
        if (patientIdFromUrl) {
          const found = data.find((p: PatientRow) => p.id === patientIdFromUrl);
          if (found) setSelectedPatient(found);
        } else if (data.length > 0) {
          setSelectedPatient(data[0]);
        }
      }
      setLoadingPatients(false);
    }
    load();
  }, []);

  // Cargar notas cuando cambia el paciente
  useEffect(() => {
    if (!selectedPatient) return;
    setLoadingNotes(true);
    setActiveNote(null);
    supabase.from("session_notes").select("*").eq("patient_id", selectedPatient.id).order("session_date", { ascending: false })
      .then(({ data }) => { setNotes(data ?? []); setLoadingNotes(false); });
  }, [selectedPatient?.id]);

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const p = selectedPatient;
  const pName = p ? `${p.first_name} ${p.last_name}` : "";
  const pAge  = p?.birth_date ? calcAge(p.birth_date) : 0;
  const pColor = p ? AVATAR_COLORS[pName.length % AVATAR_COLORS.length] : "#8B7355";
  const pInitials = p ? getInitials(p.first_name, p.last_name) : "??";

  const moodColor = (r: number | null) => !r ? "var(--text-muted)" : r>=7?"var(--green)":r>=4?"var(--amber)":"var(--red)";
  const moodLabel = (r: number | null) => !r ? "—" : r>=7?"Positivo":r>=4?"Neutral":"Difícil";
  const moodBg    = (r: number | null) => !r ? "var(--surface)" : r>=7?"var(--green-bg)":r>=4?"var(--amber-bg)":"var(--red-bg)";

  return (
    <div style={{ display:"flex", height:"100%", gap:0, maxWidth:1280, margin:"0 auto", overflow:"hidden" }}>
      <style>{`
        .exp-sidebar { display: flex; }
        .exp-mobile-selector { display: none; }
        .exp-tab-label { display: inline; }
        .exp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .exp-note-panel-desktop { display: flex; }
        .exp-note-panel-mobile  { display: none; }
        @media (max-width: 768px) {
          .exp-sidebar { display: none !important; }
          .exp-mobile-selector { display: flex !important; }
          .exp-tab-label { display: none; }
          .exp-grid-2 { grid-template-columns: 1fr !important; }
          .exp-note-panel-desktop { display: none !important; }
          .exp-note-panel-mobile { display: flex !important; }
        }
      `}</style>

      {/* ── Col 1: Lista pacientes ── */}
      <div className="exp-sidebar" style={{ width:230, flexShrink:0, flexDirection:"column", marginRight:20, overflow:"hidden" }}>
        <div style={{ marginBottom:14 }}>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:22, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.3px", marginBottom:2 }}>Expedientes</h1>
          <p style={{ ...dm("12px"), color:"var(--text-muted)" }}>{patients.length} pacientes</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"7px 12px", marginBottom:12 }}>
          <span style={{ color:"var(--text-muted)", fontSize:13 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            style={{ border:"none", background:"transparent", outline:"none", ...dm("13px"), color:"var(--text-primary)", width:"100%" }} />
        </div>
        {loadingPatients ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:20, gap:8 }}>
            <div style={{ width:16, height:16, borderRadius:"50%", border:"2px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin .7s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...dm("12px"), color:"var(--text-muted)", textAlign:"center", padding:20 }}>
            {patients.length === 0 ? "Aún no hay pacientes" : "Sin resultados"}
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:3, overflowY:"auto", flex:1 }}>
            {filtered.map(pt => {
              const name = `${pt.first_name} ${pt.last_name}`;
              const color = AVATAR_COLORS[name.length % AVATAR_COLORS.length];
              const initials = getInitials(pt.first_name, pt.last_name);
              const isSelected = selectedPatient?.id === pt.id;
              return (
                <div key={pt.id} onClick={() => { setSelectedPatient(pt); setActiveSection("resumen"); }}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, cursor:"pointer", transition:"all .15s", background:isSelected?"var(--accent-bg)":"transparent", border:`1px solid ${isSelected?"var(--accent-light)":"transparent"}` }}
                  onMouseEnter={e => { if (!isSelected)(e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
                  onMouseLeave={e => { if (!isSelected)(e.currentTarget as HTMLDivElement).style.background="transparent"; }}
                >
                  <div style={{ width:34, height:34, borderRadius:"50%", background:`${color}18`, color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>{initials}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{name}</div>
                    <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{pt.diagnosis?.split(",")[0]?.trim() ?? "Sin diagnóstico"} · {pt.session_count} ses.</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Col 2: Expediente ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

        {/* Selector móvil */}
        <div className="exp-mobile-selector" style={{ alignItems:"center", gap:10, marginBottom:14 }}>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:20, fontWeight:600, color:"var(--text-primary)", margin:0 }}>Expedientes</h1>
          <select value={selectedPatient?.id ?? ""} onChange={e => { const pt = patients.find(x => x.id===e.target.value); if (pt) setSelectedPatient(pt); }}
            style={{ flex:1, border:"1px solid var(--border)", borderRadius:10, padding:"8px 12px", background:"var(--surface)", color:"var(--text-primary)", ...dm("13px"), outline:"none" }}>
            {patients.map(pt => <option key={pt.id} value={pt.id}>{pt.first_name} {pt.last_name}</option>)}
          </select>
        </div>

        {!p ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, gap:10 }}>
            <span style={{ fontSize:40, opacity:0.3 }}>📋</span>
            <span style={{ ...dm("13px"), color:"var(--text-muted)" }}>Selecciona un paciente para ver su expediente</span>
          </div>
        ) : (
          <>
            {/* Header paciente */}
            <div className="card" style={{ padding:"16px 18px", marginBottom:14, flexShrink:0, borderRadius:16 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:14, justifyContent:"space-between", flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:48, height:48, borderRadius:"50%", background:`${pColor}18`, color:pColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>{pInitials}</div>
                  <div>
                    <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)" }}>{pName}</div>
                    <div style={{ display:"flex", gap:8, ...dm("12px"), color:"var(--text-muted)", marginTop:3, flexWrap:"wrap" }}>
                      {pAge > 0 && <span>{pAge} años</span>}
                      {p.occupation && <><span>·</span><span>{p.occupation}</span></>}
                      <span>·</span><span>Desde {fmtDate(p.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button className="btn-g" style={{ fontSize:12 }}>📅 Agendar</button>
                  <button className="btn-g" style={{ fontSize:12 }}>📋 Enviar test</button>
                  <button
                    onClick={() => setShowNoteModal(true)}
                    style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 14px", borderRadius:10, height:34, fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, cursor:"pointer", boxShadow:"0 2px 8px rgba(139,115,85,0.35)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}
                  >✏️ Nueva nota</button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", gap:4, overflowX:"auto", marginBottom:14, flexShrink:0 }}>
              <style>{`.exp-tabs-bar::-webkit-scrollbar{display:none}`}</style>
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:10, border:"none", cursor:"pointer", transition:"all .15s", ...dm("13px"), fontWeight:500, flexShrink:0, background:activeSection===s.id?"var(--accent)":"var(--surface)", color:activeSection===s.id?"#FAF7F2":"var(--text-secondary)", whiteSpace:"nowrap" }}
                  onMouseEnter={e => { if (activeSection!==s.id)(e.currentTarget as HTMLButtonElement).style.background="var(--surface-2,var(--border))"; }}
                  onMouseLeave={e => { if (activeSection!==s.id)(e.currentTarget as HTMLButtonElement).style.background="var(--surface)"; }}
                >
                  <span style={{ fontSize:14 }}>{s.icon}</span>
                  <span className="exp-tab-label">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Contenido */}
            <div style={{ flex:1, overflowY:"auto" }}>

              {/* RESUMEN */}
              {activeSection==="resumen" && (
                <div className="exp-grid-2">
                  <Card>
                    <SecTitle>Diagnóstico</SecTitle>
                    {p.diagnosis ? (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                        {p.diagnosis.split(",").map((d,i) => (
                          <span key={i} className="tag" style={{ background:`${pColor}14`, color:pColor }}>{d.trim()}</span>
                        ))}
                      </div>
                    ) : <span style={{ ...dm("13px"), color:"var(--text-muted)" }}>Sin diagnóstico registrado</span>}
                    {p.notes && (
                      <div style={{ marginTop:12, padding:"10px 14px", borderRadius:12, background:"var(--surface)" }}>
                        <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.4px" }}>Notas del perfil</div>
                        <div style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.5 }}>{p.notes}</div>
                      </div>
                    )}
                  </Card>
                  <Card>
                    <SecTitle>Datos personales</SecTitle>
                    <Field label="Teléfono"           value={p.phone ?? "—"} />
                    <Field label="Email"              value={p.email ?? "—"} />
                    <Field label="Género"             value={p.gender ?? "—"} />
                    <Field label="Educación"          value={p.education ?? "—"} />
                    <Field label="Contacto emergencia" value={p.emergency_contact ? `${p.emergency_contact} ${p.emergency_phone??""}`:"—"} />
                    <Field label="Referido por"       value={p.referral_source ?? "—"} />
                  </Card>
                  <Card>
                    <SecTitle>Resumen de sesiones</SecTitle>
                    <Field label="Total de sesiones" value={String(p.session_count)} />
                    <Field label="Última sesión"     value={notes[0] ? fmtDate(notes[0].session_date) : "—"} />
                    <Field label="Notas registradas" value={String(notes.length)} />
                    <Field label="Estado"            value={p.status} />
                  </Card>
                  <Card>
                    <SecTitle>Actividad reciente</SecTitle>
                    {notes.length === 0 ? (
                      <div style={{ ...dm("12px"), color:"var(--text-muted)", textAlign:"center", padding:"20px 0" }}>Sin notas de sesión aún</div>
                    ) : notes.slice(0,4).map((n,i) => (
                      <div key={n.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:i<3?"1px solid var(--border-light)":"none" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:moodColor(n.mood_rating), flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ ...dm("12px"), fontWeight:500, color:"var(--text-primary)" }}>Sesión #{n.session_number ?? "—"}</div>
                          <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{fmtDate(n.session_date)}</div>
                        </div>
                        <span className="tag" style={{ background:moodBg(n.mood_rating), color:moodColor(n.mood_rating) }}>{moodLabel(n.mood_rating)}</span>
                      </div>
                    ))}
                  </Card>
                </div>
              )}

              {/* HISTORIA CLÍNICA */}
              {activeSection==="historia" && (
                <HistoriaTab patientId={p.id} psychologistId={userId} patientAge={pAge} />
              )}

              {/* NOTAS */}
              {activeSection==="notas" && (
                <div style={{ display:"flex", gap:16, height:"100%" }}>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                    {loadingNotes ? (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:40, gap:8 }}>
                        <div style={{ width:16, height:16, borderRadius:"50%", border:"2px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin .7s linear infinite" }} />
                      </div>
                    ) : notes.length === 0 ? (
                      <div className="card" style={{ padding:"48px 24px", borderRadius:16, display:"flex", flexDirection:"column", alignItems:"center", gap:12, textAlign:"center" }}>
                        <span style={{ fontSize:36, opacity:0.4 }}>📝</span>
                        <div style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>Sin notas de sesión</div>
                        <div style={{ ...dm("13px"), color:"var(--text-muted)" }}>Crea la primera nota con el botón "Nueva nota"</div>
                        <button onClick={() => setShowNoteModal(true)}
                          style={{ marginTop:4, padding:"0 20px", height:36, borderRadius:10, border:"none", background:"var(--accent)", color:"#FAF7F2", ...dm("13px"), fontWeight:500, cursor:"pointer" }}>
                          ✏️ Nueva nota
                        </button>
                      </div>
                    ) : notes.map(n => {
                      const preview = n.subjective || n.free_note || n.assessment || "Sin contenido";
                      const fmt = n.subjective ? "SOAP" : "Libre";
                      return (
                        <div key={n.id} className="card"
                          onClick={() => setActiveNote(activeNote?.id===n.id ? null : n)}
                          style={{ padding:"16px 18px", borderRadius:14, cursor:"pointer", borderColor:activeNote?.id===n.id?"var(--accent-light)":"var(--border-light)", background:activeNote?.id===n.id?"var(--accent-bg)":"var(--bg-card)" }}
                          onMouseEnter={e => { if (activeNote?.id!==n.id)(e.currentTarget as HTMLDivElement).style.boxShadow="0 4px 16px rgba(28,25,23,0.10)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow=""; }}
                        >
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:6 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ ...dm("13px"), fontWeight:600, color:"var(--text-primary)" }}>
                                Sesión #{n.session_number ?? "—"}
                              </span>
                              <span className="tag" style={{ background:"var(--surface)", color:"var(--text-secondary)" }}>{fmt}</span>
                              {n.mood_rating && (
                                <span className="tag" style={{ background:moodBg(n.mood_rating), color:moodColor(n.mood_rating) }}>
                                  {moodLabel(n.mood_rating)} · {n.mood_rating}/10
                                </span>
                              )}
                              {n.is_draft && (
                                <span className="tag" style={{ background:"var(--amber-bg)", color:"var(--amber)" }}>Borrador</span>
                              )}
                            </div>
                            <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>{fmtDate(n.session_date)}</span>
                          </div>
                          <p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, margin:0, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                            {preview}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Nota expandida — desktop */}
                  {activeNote && (
                    <div className="exp-note-panel-desktop" style={{ width:340, flexShrink:0, flexDirection:"column" }}>
                      <div className="card" style={{ padding:"20px", borderRadius:16, overflowY:"auto", animation:"slideIn .2s ease" }}>
                        <style>{`@keyframes slideIn{from{transform:translateX(10px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                          <span style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>Sesión #{activeNote.session_number}</span>
                          <button onClick={() => setActiveNote(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:16 }}>✕</button>
                        </div>
                        <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
                          {activeNote.mood_rating && <span className="tag" style={{ background:moodBg(activeNote.mood_rating), color:moodColor(activeNote.mood_rating) }}>{moodLabel(activeNote.mood_rating)} · {activeNote.mood_rating}/10</span>}
                          {activeNote.is_draft && <span className="tag" style={{ background:"var(--amber-bg)", color:"var(--amber)" }}>Borrador</span>}
                        </div>
                        <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:12 }}>{fmtDate(activeNote.session_date)}</div>
                        {activeNote.subjective && <><div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:4 }}>Subjetivo</div><p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, marginBottom:12 }}>{activeNote.subjective}</p></>}
                        {activeNote.objective  && <><div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:4 }}>Objetivo</div><p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, marginBottom:12 }}>{activeNote.objective}</p></>}
                        {activeNote.assessment && <><div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:4 }}>Análisis</div><p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, marginBottom:12 }}>{activeNote.assessment}</p></>}
                        {activeNote.plan       && <><div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:4 }}>Plan</div><p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, marginBottom:12 }}>{activeNote.plan}</p></>}
                        {activeNote.free_note  && <p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.7 }}>{activeNote.free_note}</p>}
                        {activeNote.next_session && <div style={{ marginTop:12, padding:"8px 12px", borderRadius:10, background:"var(--surface)", ...dm("12px"), color:"var(--text-secondary)" }}>📅 Próxima sesión: {fmtDate(activeNote.next_session)}</div>}
                        <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
                          <button className="btn-g" style={{ fontSize:12 }}>✏️ Editar nota</button>
                          <button className="btn-g" style={{ fontSize:12 }}>🖨️ Exportar PDF</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSection==="tests" && p && (
              <ExpedienteTestsTab
                patientId={p.id}
                patient={{ id: p.id, first_name: p.first_name, last_name: p.last_name, email: p.email }}
                psychologistId={userId}
              />
              )}

              {/* ARCHIVOS */}
             {activeSection==="archivos" && p && (
              <ExpedienteArchivosTab
                patientId={p.id}
                psychologistId={userId}
                patientName={pName}
              />
             )}

              {/* TRATAMIENTO */}
              {activeSection==="tratamiento" && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:300, textAlign:"center", padding:48 }}>
                  <span style={{ fontSize:40, opacity:0.3, marginBottom:12 }}>🎯</span>
                  <div style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)", marginBottom:8 }}>Plan de tratamiento</div>
                  <div style={{ ...dm("13px"), color:"var(--text-muted)", maxWidth:280, lineHeight:1.6 }}>Esta sección se habilitará en próximas versiones.</div>
                  <div style={{ marginTop:16, display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, background:"var(--amber-bg)", border:"1px solid var(--amber)33" }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--amber)", display:"block" }} />
                    <span style={{ ...dm("12px"), color:"var(--amber)", fontWeight:500 }}>Próximamente</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Nota expandida — móvil */}
      {activeNote && (
        <>
          <div onClick={() => setActiveNote(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:60, backdropFilter:"blur(2px)" }} className="exp-note-panel-mobile" />
          <div className="exp-note-panel-mobile"
            style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--bg-card)", borderRadius:"20px 20px 0 0", border:"1px solid var(--border-light)", boxShadow:"0 -4px 24px rgba(0,0,0,0.12)", zIndex:61, maxHeight:"80vh", flexDirection:"column", padding:"20px", overflowY:"auto", animation:"slideUp .25s ease" }}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
              <div style={{ width:36, height:4, borderRadius:2, background:"var(--border)" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <span style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>Sesión #{activeNote.session_number}</span>
              <button onClick={() => setActiveNote(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
            </div>
            {activeNote.subjective && <><div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:4 }}>Subjetivo</div><p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, marginBottom:12 }}>{activeNote.subjective}</p></>}
            {activeNote.free_note  && <p style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.7 }}>{activeNote.free_note}</p>}
          </div>
        </>
      )}

      {/* Modal nueva nota */}
      {showNoteModal && p && (
        <NuevaNotaModal
          patientId={p.id}
          psychologistId={userId}
          sessionCount={p.session_count}
          onClose={() => setShowNoteModal(false)}
          onSaved={(note) => {
            setNotes(prev => [note, ...prev]);
            setActiveSection("notas");
          }}
        />
      )}
    </div>
  );
}