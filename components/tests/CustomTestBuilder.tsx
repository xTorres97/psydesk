// src/components/tests/CustomTestBuilder.tsx
"use client";

import { useState } from "react";

export type QuestionType = "radio" | "scale" | "text" | "boolean";

export interface CustomQuestion {
  id: number;
  text: string;
  type: QuestionType;
  options?: { label: string; value: number }[]; // radio / scale
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

export interface CustomTestDraft {
  name: string;
  short_name: string;
  description: string;
  questions: CustomQuestion[];
}

interface Props {
  onSave: (draft: CustomTestDraft) => Promise<void>;
  onClose: () => void;
}

const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });

const TYPE_LABELS: Record<QuestionType, { label: string; icon: string; hint: string }> = {
  radio:   { label: "Opción múltiple", icon: "◉", hint: "El paciente elige una opción de las que definas" },
  scale:   { label: "Escala numérica", icon: "⊡", hint: "El paciente elige un número en un rango (ej. 0–4)" },
  text:    { label: "Escrito libre",   icon: "✏", hint: "El paciente escribe su respuesta" },
  boolean: { label: "Sí / No",         icon: "⊙", hint: "El paciente responde Sí o No" },
};

function defaultQuestion(id: number): CustomQuestion {
  return { id, text: "", type: "radio", options: [{ label: "", value: 0 }, { label: "", value: 1 }] };
}

export function CustomTestBuilder({ onSave, onClose }: Props) {
  const [name, setName]             = useState("");
  const [shortName, setShortName]   = useState("");
  const [description, setDesc]      = useState("");
  const [questions, setQuestions]   = useState<CustomQuestion[]>([defaultQuestion(1)]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [expandedQ, setExpandedQ]   = useState<number>(1);

  function addQuestion() {
    const newId = Math.max(...questions.map(q => q.id)) + 1;
    const q = defaultQuestion(newId);
    setQuestions(prev => [...prev, q]);
    setExpandedQ(newId);
  }

  function removeQuestion(id: number) {
    if (questions.length === 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  }

  function updateQuestion(id: number, patch: Partial<CustomQuestion>) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
  }

  function changeType(id: number, type: QuestionType) {
    const defaults: Partial<CustomQuestion> = { type };
    if (type === "radio")   defaults.options = [{ label: "", value: 0 }, { label: "", value: 1 }];
    if (type === "scale")   { defaults.scaleMin = 0; defaults.scaleMax = 4; defaults.scaleMinLabel = "Nunca"; defaults.scaleMaxLabel = "Siempre"; defaults.options = undefined; }
    if (type === "boolean") { defaults.options = [{ label: "Sí", value: 1 }, { label: "No", value: 0 }]; }
    if (type === "text")    { defaults.options = undefined; }
    updateQuestion(id, defaults);
  }

  function addOption(qId: number) {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const opts = q.options ?? [];
      return { ...q, options: [...opts, { label: "", value: opts.length }] };
    }));
  }

  function removeOption(qId: number, idx: number) {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const opts = (q.options ?? []).filter((_, i) => i !== idx).map((o, i) => ({ ...o, value: i }));
      return { ...q, options: opts };
    }));
  }

  function updateOption(qId: number, idx: number, label: string) {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const opts = (q.options ?? []).map((o, i) => i === idx ? { ...o, label } : o);
      return { ...q, options: opts };
    }));
  }

  async function handleSave() {
    setError("");
    if (!name.trim())      { setError("El nombre del test es obligatorio"); return; }
    if (!shortName.trim()) { setError("El nombre corto es obligatorio"); return; }
    if (questions.some(q => !q.text.trim())) { setError("Todas las preguntas deben tener texto"); return; }
    if (questions.some(q => q.type === "radio" && (q.options ?? []).some(o => !o.label.trim()))) {
      setError("Todas las opciones de opción múltiple deben tener texto"); return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), short_name: shortName.trim(), description: description.trim(), questions });
    } catch (e: any) {
      setError(e.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:80, backdropFilter:"blur(4px)" }} />
      <div style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        background:"var(--bg-card)", borderRadius:20, padding:0,
        width:"min(620px, 96vw)", maxHeight:"90vh",
        display:"flex", flexDirection:"column",
        zIndex:81, boxShadow:"0 8px 32px rgba(28,25,23,0.18)",
        animation:"popIn .2s ease",
      }}>
        <style>{`@keyframes popIn{from{transform:translate(-50%,-48%) scale(.95);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding:"22px 24px 18px", borderBottom:"1px solid var(--border-light)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)" }}>Crear test personalizado</div>
            <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:2 }}>Define las preguntas y tipos de respuesta</div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", color:"var(--text-muted)", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Body scrollable */}
        <div style={{ overflowY:"auto", padding:"22px 24px", flex:1 }}>

          {/* Info básica */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.4px", fontWeight:600, display:"block", marginBottom:6 }}>Nombre del test *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Escala de bienestar general"
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", ...dm("13px"), outline:"none", boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.4px", fontWeight:600, display:"block", marginBottom:6 }}>Nombre corto *</label>
              <input value={shortName} onChange={e => setShortName(e.target.value.slice(0,10))} placeholder="Ej: BG-10" maxLength={10}
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", ...dm("13px"), outline:"none", boxSizing:"border-box" }} />
              <div style={{ ...dm("10px"), color:"var(--text-muted)", marginTop:4 }}>{shortName.length}/10</div>
            </div>
            <div>
              <label style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.4px", fontWeight:600, display:"block", marginBottom:6 }}>Descripción</label>
              <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Breve descripción del test"
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", ...dm("13px"), outline:"none", boxSizing:"border-box" }} />
            </div>
          </div>

          {/* Preguntas */}
          <div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.4px", fontWeight:600, marginBottom:12 }}>
            Preguntas ({questions.length})
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {questions.map((q, idx) => {
              const isOpen = expandedQ === q.id;
              return (
                <div key={q.id} style={{ border:"1px solid var(--border-light)", borderRadius:14, overflow:"hidden", background:"var(--bg-card)" }}>
                  {/* Cabecera de pregunta */}
                  <div onClick={() => setExpandedQ(isOpen ? 0 : q.id)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", cursor:"pointer", background: isOpen ? "var(--accent-bg)" : "var(--surface)", transition:"background .15s" }}>
                    <span style={{ ...dm("11px"), color:"var(--text-muted)", fontWeight:600, width:20, flexShrink:0 }}>{idx+1}</span>
                    <span style={{ flex:1, ...dm("13px"), color: q.text ? "var(--text-primary)" : "var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {q.text || "Nueva pregunta..."}
                    </span>
                    <span style={{ ...dm("11px"), color:"var(--accent)", background:"var(--accent-bg)", padding:"2px 8px", borderRadius:20, flexShrink:0 }}>{TYPE_LABELS[q.type].icon} {TYPE_LABELS[q.type].label}</span>
                    {questions.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); removeQuestion(q.id); }}
                        style={{ width:24, height:24, borderRadius:6, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", color:"var(--text-muted)", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
                    )}
                    <span style={{ color:"var(--text-muted)", fontSize:12, flexShrink:0 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>

                  {/* Cuerpo de pregunta expandido */}
                  {isOpen && (
                    <div style={{ padding:"16px" }}>
                      {/* Texto */}
                      <div style={{ marginBottom:14 }}>
                        <label style={{ ...dm("11px"), color:"var(--text-muted)", display:"block", marginBottom:5 }}>Texto de la pregunta *</label>
                        <textarea value={q.text} onChange={e => updateQuestion(q.id, { text: e.target.value })}
                          placeholder="Escribe la pregunta aquí..." rows={2}
                          style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", ...dm("13px"), outline:"none", resize:"vertical", boxSizing:"border-box" }} />
                      </div>

                      {/* Tipo */}
                      <div style={{ marginBottom:14 }}>
                        <label style={{ ...dm("11px"), color:"var(--text-muted)", display:"block", marginBottom:8 }}>Tipo de respuesta</label>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                          {(Object.keys(TYPE_LABELS) as QuestionType[]).map(t => (
                            <button key={t} onClick={() => changeType(q.id, t)}
                              style={{ padding:"8px 10px", borderRadius:10, border:`1px solid ${q.type===t?"var(--accent)":"var(--border)"}`, background:q.type===t?"var(--accent-bg)":"var(--surface)", cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
                              <div style={{ ...dm("12px"), color:q.type===t?"var(--accent)":"var(--text-primary)", fontWeight:600 }}>{TYPE_LABELS[t].icon} {TYPE_LABELS[t].label}</div>
                              <div style={{ ...dm("10px"), color:"var(--text-muted)", marginTop:2 }}>{TYPE_LABELS[t].hint}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Opciones según tipo */}
                      {q.type === "radio" && (
                        <div>
                          <label style={{ ...dm("11px"), color:"var(--text-muted)", display:"block", marginBottom:8 }}>Opciones</label>
                          {(q.options ?? []).map((opt, i) => (
                            <div key={i} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center" }}>
                              <span style={{ ...dm("11px"), color:"var(--text-muted)", width:20, textAlign:"center" }}>{i+1}</span>
                              <input value={opt.label} onChange={e => updateOption(q.id, i, e.target.value)}
                                placeholder={`Opción ${i+1}`}
                                style={{ flex:1, padding:"8px 10px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", ...dm("12px"), outline:"none" }} />
                              {(q.options ?? []).length > 2 && (
                                <button onClick={() => removeOption(q.id, i)}
                                  style={{ width:24, height:24, borderRadius:6, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", color:"var(--text-muted)", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addOption(q.id)}
                            style={{ marginTop:4, padding:"6px 12px", borderRadius:8, border:"1px dashed var(--border)", background:"transparent", cursor:"pointer", ...dm("12px"), color:"var(--text-muted)" }}>
                            + Agregar opción
                          </button>
                        </div>
                      )}

                      {q.type === "scale" && (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          {[
                            { label:"Mínimo", field:"scaleMin" as const, val: q.scaleMin ?? 0 },
                            { label:"Máximo", field:"scaleMax" as const, val: q.scaleMax ?? 4 },
                          ].map(f => (
                            <div key={f.field}>
                              <label style={{ ...dm("11px"), color:"var(--text-muted)", display:"block", marginBottom:5 }}>{f.label}</label>
                              <input type="number" value={f.val} onChange={e => updateQuestion(q.id, { [f.field]: Number(e.target.value) })}
                                style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", ...dm("13px"), outline:"none", boxSizing:"border-box" }} />
                            </div>
                          ))}
                          {[
                            { label:"Etiqueta mínimo", field:"scaleMinLabel" as const, val: q.scaleMinLabel ?? "", ph:"Ej: Nunca" },
                            { label:"Etiqueta máximo", field:"scaleMaxLabel" as const, val: q.scaleMaxLabel ?? "", ph:"Ej: Siempre" },
                          ].map(f => (
                            <div key={f.field}>
                              <label style={{ ...dm("11px"), color:"var(--text-muted)", display:"block", marginBottom:5 }}>{f.label}</label>
                              <input value={f.val} onChange={e => updateQuestion(q.id, { [f.field]: e.target.value })} placeholder={f.ph}
                                style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", ...dm("12px"), outline:"none", boxSizing:"border-box" }} />
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === "boolean" && (
                        <div style={{ display:"flex", gap:8 }}>
                          {[{ label:"Sí", value:1 }, { label:"No", value:0 }].map(o => (
                            <div key={o.value} style={{ padding:"8px 20px", borderRadius:10, border:"1px solid var(--border-light)", background:"var(--surface)", ...dm("13px"), color:"var(--text-secondary)" }}>{o.label}</div>
                          ))}
                        </div>
                      )}

                      {q.type === "text" && (
                        <div style={{ padding:"10px 14px", borderRadius:10, border:"1px dashed var(--border)", background:"var(--surface)", ...dm("12px"), color:"var(--text-muted)" }}>
                          El paciente verá un campo de texto libre para escribir su respuesta.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={addQuestion}
            style={{ width:"100%", marginTop:12, padding:"10px", borderRadius:12, border:"1px dashed var(--border)", background:"transparent", cursor:"pointer", ...dm("13px"), color:"var(--text-muted)", transition:"all .15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor="var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color="var(--accent)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor="var(--border)"; (e.currentTarget as HTMLButtonElement).style.color="var(--text-muted)"; }}>
            + Agregar pregunta
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:"1px solid var(--border-light)", display:"flex", gap:10, flexShrink:0 }}>
          {error && <div style={{ flex:1, padding:"8px 12px", borderRadius:8, background:"var(--red-bg)", ...dm("12px"), color:"var(--red)" }}>⚠ {error}</div>}
          {!error && <div style={{ flex:1 }} />}
          <button className="btn-g" onClick={onClose} style={{ padding:"9px 18px" }}>Cancelar</button>
          <button className="btn-p" onClick={handleSave} disabled={saving} style={{ padding:"9px 20px", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Guardando..." : "💾 Guardar test"}
          </button>
        </div>
      </div>
    </>
  );
}