// src/app/cuestionario/[token]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { TESTS_DATA, calcScore, getMaxScore } from "@/components/tests/tests-data";
import type { CustomQuestion } from "@/components/tests/CustomTestBuilder";

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PageState = "loading" | "ready" | "answering" | "submitting" | "done" | "expired" | "error";
type TestSource = "predefined" | "custom";

interface SubmissionInfo {
  id: string;
  test_id?: string;          // predefinido
  custom_test_id?: string;   // personalizado
  test_short_name: string;
  status: string;
  token: string;
  source: TestSource;
  questions: CustomQuestion[];
  name: string;
}

export default function TestPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [info, setInfo]           = useState<SubmissionInfo | null>(null);
  const [answers, setAnswers]     = useState<Record<number, any>>({});
  const [currentQ, setCurrentQ]   = useState(0);
  const [error, setError]         = useState("");

  useEffect(() => {
    async function load() {
      if (!token) { setPageState("error"); return; }

      // Buscar primero en predefinidos
      const { data: predefined } = await supabasePublic
        .from("test_submissions")
        .select("id, test_id, test_short_name, status, token")
        .eq("token", token)
        .single();

      if (predefined) {
        if (predefined.status === "completed" || predefined.status === "reviewed") { setPageState("expired"); return; }
        const testDef = TESTS_DATA.find(t => t.id === predefined.test_id);
        if (!testDef) { setPageState("error"); return; }
        // Convertir preguntas predefinidas al formato CustomQuestion
        const questions: CustomQuestion[] = testDef.questions.map(q => ({
          id: q.id, text: q.text, type: "radio" as const,
          options: q.options.map(o => ({ label: o.label, value: o.value })),
        }));
        setInfo({ id: predefined.id, test_id: predefined.test_id, test_short_name: predefined.test_short_name, status: predefined.status, token: predefined.token, source: "predefined", questions, name: testDef.name });
        setPageState("ready");
        return;
      }

      // Buscar en tests personalizados
      const { data: custom } = await supabasePublic
        .from("custom_test_submissions")
        .select("id, custom_test_id, test_short_name, status, token")
        .eq("token", token)
        .single();

      if (!custom) { setPageState("error"); return; }
      if (custom.status === "completed" || custom.status === "reviewed") { setPageState("expired"); return; }

      // Obtener definición del test personalizado
      const { data: testDef } = await supabasePublic
        .from("custom_tests")
        .select("name, questions")
        .eq("id", custom.custom_test_id)
        .single();

      if (!testDef) { setPageState("error"); return; }

      setInfo({ id: custom.id, custom_test_id: custom.custom_test_id, test_short_name: custom.test_short_name, status: custom.status, token: custom.token, source: "custom", questions: testDef.questions as CustomQuestion[], name: testDef.name });
      setPageState("ready");
    }
    load();
  }, [token]);

  const questions  = info?.questions ?? [];
  const currentQuestion = questions[currentQ];
  const progress   = questions.length > 0 ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0;
  const allAnswered = questions.length > 0 && questions.every(q => q.type === "text" ? true : answers[q.id] !== undefined);

  async function handleSubmit() {
    if (!info) return;
    setPageState("submitting");

    try {
      if (info.source === "predefined") {
        const { score, level } = calcScore(info.test_id!, answers as Record<number, number>);
        const maxScore = getMaxScore(info.test_id!);
        const { error } = await supabasePublic.from("test_submissions").update({
          status: "completed", answers, score, max_score: maxScore, level, completed_at: new Date().toISOString(),
        }).eq("token", token);
        if (error) throw error;
      } else {
        // Tests personalizados: no calculamos score automático
        const { error } = await supabasePublic.from("custom_test_submissions").update({
          status: "completed", answers, completed_at: new Date().toISOString(),
        }).eq("token", token);
        if (error) throw error;
      }
      setPageState("done");
    } catch (e: any) {
      setError("Error al enviar. Por favor intenta de nuevo.");
      setPageState("answering");
    }
  }

  const dm = (size: string) => ({ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: size });

  if (pageState === "loading") return (
    <div style={{ minHeight:"100vh", background:"#F5F0EA", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid #E8DFD0", borderTopColor:"#8B7355", animation:"spin .7s linear infinite", margin:"0 auto 16px" }} />
        <p style={{ ...dm("14px"), color:"#A8A29E" }}>Cargando cuestionario...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (pageState === "expired") return (
    <div style={{ minHeight:"100vh", background:"#F5F0EA", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ maxWidth:440, width:"100%", background:"#FFFDF9", borderRadius:20, padding:"40px 36px", textAlign:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
        <h1 style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:600, color:"#1C1917", marginBottom:8 }}>Cuestionario ya completado</h1>
        <p style={{ ...dm("14px"), color:"#57534E", lineHeight:1.6 }}>Este cuestionario ya fue respondido. Si crees que es un error, contacta a tu profesional de salud.</p>
      </div>
    </div>
  );

  if (pageState === "error") return (
    <div style={{ minHeight:"100vh", background:"#F5F0EA", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ maxWidth:440, width:"100%", background:"#FFFDF9", borderRadius:20, padding:"40px 36px", textAlign:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔗</div>
        <h1 style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:600, color:"#1C1917", marginBottom:8 }}>Link no válido</h1>
        <p style={{ ...dm("14px"), color:"#57534E", lineHeight:1.6 }}>Este enlace no existe o ha expirado. Solicita uno nuevo a tu profesional de salud.</p>
      </div>
    </div>
  );

  if (pageState === "done") return (
    <div style={{ minHeight:"100vh", background:"#F5F0EA", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ maxWidth:480, width:"100%", background:"#FFFDF9", borderRadius:20, padding:"48px 40px", textAlign:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", animation:"fadeIn .4s ease" }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ width:72, height:72, borderRadius:"50%", background:"#5C8A6E18", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:32 }}>✓</div>
        <h1 style={{ fontFamily:"Georgia,serif", fontSize:24, fontWeight:600, color:"#1C1917", marginBottom:12 }}>¡Gracias por completarlo!</h1>
        <p style={{ ...dm("15px"), color:"#57534E", lineHeight:1.7, marginBottom:24 }}>Tus respuestas han sido enviadas de forma segura a tu profesional de salud. Puedes cerrar esta página.</p>
        <div style={{ background:"#F5F0EA", borderRadius:12, padding:"16px 20px" }}>
          <p style={{ margin:0, ...dm("13px"), color:"#A8A29E", lineHeight:1.5 }}>🔒 Tus respuestas son confidenciales y solo tu profesional puede verlas.</p>
        </div>
      </div>
    </div>
  );

  if (pageState === "ready") return (
    <div style={{ minHeight:"100vh", background:"#F5F0EA", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ maxWidth:500, width:"100%", background:"#FFFDF9", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", animation:"fadeIn .3s ease" }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ background:"#8B7355", padding:"28px 36px" }}>
          <p style={{ margin:0, fontSize:20, fontWeight:700, color:"#FAF7F2", fontFamily:"Georgia,serif" }}>PsyDesk</p>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#D4C5B0" }}>Cuestionario de salud</p>
        </div>
        <div style={{ padding:"36px" }}>
          <h1 style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:600, color:"#1C1917", marginBottom:12 }}>Bienvenido/a</h1>
          <p style={{ ...dm("14px"), color:"#57534E", lineHeight:1.7, marginBottom:20 }}>Tu profesional de salud te ha enviado este cuestionario. Por favor, responde con sinceridad — no hay respuestas correctas o incorrectas.</p>
          <div style={{ background:"#FAF7F2", border:"1px solid #E8DFD0", borderRadius:12, padding:"16px 20px", marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ ...dm("12px"), color:"#A8A29E" }}>Preguntas</span>
              <span style={{ ...dm("12px"), fontWeight:600, color:"#1C1917" }}>{questions.length} ítems</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ ...dm("12px"), color:"#A8A29E" }}>Tiempo estimado</span>
              <span style={{ ...dm("12px"), fontWeight:600, color:"#1C1917" }}>~{Math.ceil(questions.length * 0.5)} minutos</span>
            </div>
          </div>
          <button onClick={() => setPageState("answering")}
            style={{ width:"100%", padding:"14px", background:"#8B7355", color:"#FAF7F2", border:"none", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"'Helvetica Neue',Arial,sans-serif", transition:"opacity .15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}>
            Comenzar cuestionario →
          </button>
          <p style={{ margin:"16px 0 0", ...dm("12px"), color:"#A8A29E", textAlign:"center" }}>🔒 Tus respuestas son confidenciales</p>
        </div>
      </div>
    </div>
  );

  // ── Pantalla de preguntas ─────────────────────────────────────────────────
  if (!currentQuestion) return null;

  return (
    <div style={{ minHeight:"100vh", background:"#F5F0EA", padding:"24px 16px" }}>
      <style>{`
        @keyframes slideQ { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        .opt-btn:hover { border-color: #8B7355 !important; background: #FAF7F2 !important; }
      `}</style>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <p style={{ margin:0, fontSize:16, fontWeight:700, color:"#8B7355", fontFamily:"Georgia,serif" }}>PsyDesk</p>
          <span style={{ ...dm("13px"), color:"#A8A29E" }}>{currentQ + 1} / {questions.length}</span>
        </div>
        <div style={{ height:4, background:"#E8DFD0", borderRadius:2, marginBottom:32, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${progress}%`, background:"#8B7355", borderRadius:2, transition:"width .4s ease" }} />
        </div>

        <div key={currentQ} style={{ animation:"slideQ .25s ease" }}>
          <div style={{ background:"#FFFDF9", borderRadius:20, padding:"32px 28px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", marginBottom:16 }}>
            <p style={{ margin:"0 0 28px", fontFamily:"Georgia,serif", fontSize:18, fontWeight:600, color:"#1C1917", lineHeight:1.5 }}>
              {currentQuestion.text}
            </p>

            {/* Radio / Boolean */}
            {(currentQuestion.type === "radio" || currentQuestion.type === "boolean") && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {(currentQuestion.options ?? []).map(opt => {
                  const selected = answers[currentQuestion.id] === opt.value;
                  return (
                    <button key={opt.value} className="opt-btn"
                      onClick={() => {
                        setAnswers(prev => ({ ...prev, [currentQuestion.id]: opt.value }));
                        setTimeout(() => { if (currentQ < questions.length - 1) setCurrentQ(q => q + 1); }, 300);
                      }}
                      style={{ padding:"14px 18px", border:`2px solid ${selected?"#8B7355":"#E8DFD0"}`, borderRadius:12, background: selected ? "#FAF7F2" : "#FFFDF9", cursor:"pointer", textAlign:"left", ...dm("14px"), color: selected ? "#8B7355" : "#57534E", fontWeight: selected ? 600 : 400, transition:"all .15s", display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${selected?"#8B7355":"#D4C5B0"}`, background:selected?"#8B7355":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                        {selected && <span style={{ width:8, height:8, borderRadius:"50%", background:"#FAF7F2", display:"block" }} />}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Escala numérica */}
            {currentQuestion.type === "scale" && (() => {
              const min = currentQuestion.scaleMin ?? 0;
              const max = currentQuestion.scaleMax ?? 4;
              const vals = Array.from({ length: max - min + 1 }, (_, i) => min + i);
              return (
                <div>
                  <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginBottom:10 }}>
                    {vals.map(v => {
                      const selected = answers[currentQuestion.id] === v;
                      return (
                        <button key={v} onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: v }))}
                          style={{ width:48, height:48, borderRadius:12, border:`2px solid ${selected?"#8B7355":"#E8DFD0"}`, background:selected?"#8B7355":"#FFFDF9", color:selected?"#FAF7F2":"#57534E", fontSize:16, fontWeight:600, cursor:"pointer", transition:"all .15s" }}>
                          {v}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", ...dm("11px"), color:"#A8A29E" }}>
                    <span>{currentQuestion.scaleMinLabel || min}</span>
                    <span>{currentQuestion.scaleMaxLabel || max}</span>
                  </div>
                </div>
              );
            })()}

            {/* Texto libre */}
            {currentQuestion.type === "text" && (
              <textarea value={answers[currentQuestion.id] ?? ""} onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                placeholder="Escribe tu respuesta aquí..." rows={4}
                style={{ width:"100%", padding:"14px", borderRadius:12, border:"1px solid #E8DFD0", background:"#FAF7F2", ...dm("14px"), color:"#1C1917", outline:"none", resize:"vertical", boxSizing:"border-box" }} />
            )}
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"space-between" }}>
            <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
              style={{ padding:"12px 20px", border:"1px solid #E8DFD0", borderRadius:12, background:"#FFFDF9", cursor: currentQ===0?"not-allowed":"pointer", ...dm("14px"), color: currentQ===0?"#D4C5B0":"#57534E", opacity: currentQ===0?0.5:1 }}>
              ← Anterior
            </button>
            {currentQ < questions.length - 1 ? (
              <button onClick={() => setCurrentQ(q => q + 1)}
                disabled={currentQuestion.type !== "text" && answers[currentQuestion.id] === undefined}
                style={{ padding:"12px 24px", border:"none", borderRadius:12, background: (currentQuestion.type === "text" || answers[currentQuestion.id] !== undefined) ? "#8B7355" : "#E8DFD0", color: (currentQuestion.type === "text" || answers[currentQuestion.id] !== undefined) ? "#FAF7F2" : "#A8A29E", cursor:"pointer", ...dm("14px"), fontWeight:600 }}>
                Siguiente →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!allAnswered || pageState === "submitting"}
                style={{ padding:"12px 28px", border:"none", borderRadius:12, background: allAnswered?"#8B7355":"#E8DFD0", color: allAnswered?"#FAF7F2":"#A8A29E", cursor: allAnswered?"pointer":"not-allowed", ...dm("14px"), fontWeight:600 }}>
                {pageState === "submitting" ? "Enviando..." : "✓ Enviar respuestas"}
              </button>
            )}
          </div>

          {error && <p style={{ ...dm("13px"), color:"#B5594A", textAlign:"center", marginTop:12 }}>{error}</p>}

          {allAnswered && currentQ === questions.length - 1 && (
            <div style={{ background:"#FFFDF9", border:"1px solid #E8DFD0", borderRadius:16, padding:"16px 20px", marginTop:16, textAlign:"center" }}>
              <p style={{ margin:0, ...dm("13px"), color:"#5C8A6E" }}>✓ Has respondido todas las preguntas. Puedes enviar cuando estés listo/a.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}