// src/components/expedientes/ExpedienteTestsTab.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TESTS_DATA } from "@/components/tests/tests-data";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TestStatus = "sent" | "completed" | "reviewed";

interface Submission {
  id: string;
  test_id: string;            // test_id (predefinido) o custom_test_id (custom)
  test_short_name: string;
  status: TestStatus;
  sent_at: string;
  completed_at: string | null;
  score: number | null;
  max_score: number | null;
  level: string | null;
  answers: Record<string, any> | null;
  isCustom: boolean;
  customTestName?: string;    // nombre completo del test custom
  customQuestions?: any[];    // preguntas del test custom para mostrar respuestas
}

interface PatientOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface CustomTest {
  id: string;
  name: string;
  short_name: string;
  questions: any[];
}

interface Props {
  patientId: string;
  patient: PatientOption;
  psychologistId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const dm = (size: string): React.CSSProperties => ({
  fontFamily: "var(--font-dm-sans)",
  fontSize: size,
});

const STATUS_META: Record<TestStatus, { label: string; color: string; bg: string }> = {
  sent:      { label: "Enviado",    color: "var(--amber)", bg: "var(--amber-bg)" },
  completed: { label: "Completado", color: "var(--blue)",  bg: "var(--blue-bg)"  },
  reviewed:  { label: "Revisado",   color: "var(--green)", bg: "var(--green-bg)" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function ScoreBar({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  return (
    <div style={{ height: 6, background: "var(--border-light)", borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width .4s ease" }} />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ExpedienteTestsTab({ patientId, patient, psychologistId }: Props) {
  const supabase = createClient();

  const [submissions, setSubmissions]     = useState<Submission[]>([]);
  const [customTests, setCustomTests]     = useState<CustomTest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedSub, setSelectedSub]     = useState<Submission | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // Envío
  const [sendTestId, setSendTestId]             = useState<string>("");
  const [sendIsCustom, setSendIsCustom]         = useState(false);
  const [sending, setSending]                   = useState(false);
  const [sendError, setSendError]               = useState("");
  const [sendSuccess, setSendSuccess]           = useState(false);
  const [copiedLink, setCopiedLink]             = useState("");
  const [linkCopied, setLinkCopied]             = useState(false);

  useEffect(() => {
    loadData();
  }, [patientId]);

  async function loadData() {
    setLoading(true);

    // Tests predefinidos del paciente
    const { data: predefined } = await supabase
      .from("test_submissions")
      .select("id, test_id, test_short_name, status, sent_at, completed_at, score, max_score, level, answers")
      .eq("patient_id", patientId)
      .eq("psychologist_id", psychologistId)
      .order("sent_at", { ascending: false });

    // Tests personalizados del paciente
    const { data: customs } = await supabase
      .from("custom_test_submissions")
      .select("id, custom_test_id, test_short_name, status, sent_at, completed_at, answers")
      .eq("patient_id", patientId)
      .eq("psychologist_id", psychologistId)
      .order("sent_at", { ascending: false });

    // Definiciones de tests personalizados para mostrar nombres y preguntas
    const { data: ctests } = await supabase
      .from("custom_tests")
      .select("id, name, short_name, questions")
      .eq("psychologist_id", psychologistId);

    const ctestsMap: Record<string, CustomTest> = {};
    (ctests ?? []).forEach((ct: CustomTest) => { ctestsMap[ct.id] = ct; });
    setCustomTests(ctests ?? []);

    const predSubs: Submission[] = (predefined ?? []).map((s: any) => ({
      ...s,
      isCustom: false,
    }));

    const custSubs: Submission[] = (customs ?? []).map((s: any) => {
      const def = ctestsMap[s.custom_test_id];
      return {
        id: s.id,
        test_id: s.custom_test_id,
        test_short_name: s.test_short_name,
        status: s.status,
        sent_at: s.sent_at,
        completed_at: s.completed_at,
        score: null,
        max_score: null,
        level: null,
        answers: s.answers,
        isCustom: true,
        customTestName: def?.name,
        customQuestions: def?.questions,
      };
    });

    const all = [...predSubs, ...custSubs].sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );
    setSubmissions(all);
    setLoading(false);
  }

  async function handleMarkReviewed(sub: Submission) {
    const table = sub.isCustom ? "custom_test_submissions" : "test_submissions";
    await supabase.from(table).update({ status: "reviewed" }).eq("id", sub.id);
    setSubmissions(prev =>
      prev.map(s => s.id === sub.id ? { ...s, status: "reviewed" } : s)
    );
    setSelectedSub(prev => prev?.id === sub.id ? { ...prev, status: "reviewed" } : prev);
  }

  async function handleSend() {
    if (!sendTestId) return;
    if (!patient.email) { setSendError("Este paciente no tiene email registrado."); return; }
    setSending(true); setSendError(""); setSendSuccess(false);

    try {
      const isCustom = sendIsCustom;
      const customDef = isCustom ? customTests.find(ct => ct.id === sendTestId) : null;
      const predDef   = !isCustom ? TESTS_DATA.find(t => t.id === sendTestId) : null;

      const body = isCustom
        ? {
            patientId: patient.id,
            patientEmail: patient.email,
            patientName: `${patient.first_name} ${patient.last_name}`.trim(),
            psychologistId,
            customTestId: sendTestId,
            customTestShortName: customDef?.short_name ?? "",
          }
        : {
            patientId: patient.id,
            patientEmail: patient.email,
            patientName: `${patient.first_name} ${patient.last_name}`.trim(),
            psychologistId,
            testId: sendTestId,
            testShortName: predDef?.shortName ?? "",
          };

      const res  = await fetch("/api/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al enviar");

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      setCopiedLink(`${appUrl}/cuestionario/${json.token}`);
      setSendSuccess(true);
      await loadData();
    } catch (e: any) {
      setSendError(e.message ?? "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  // Combinar todos los tests disponibles para el selector de envío
  const allSendOptions = [
    ...TESTS_DATA.map(t => ({ id: t.id, label: `${t.shortName} — ${t.name}`, isCustom: false })),
    ...customTests.map(ct => ({ id: ct.id, label: `${ct.short_name} — ${ct.name} (personalizado)`, isCustom: true })),
  ];

  const completedCount = submissions.filter(s => s.status === "completed" || s.status === "reviewed").length;
  const pendingCount   = submissions.filter(s => s.status === "sent").length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn  { from { transform: translate(-50%,-48%) scale(.95); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header de sección */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ ...dm("14px"), fontWeight: 600, color: "var(--text-primary)" }}>
              {submissions.length} test{submissions.length !== 1 ? "s" : ""} enviado{submissions.length !== 1 ? "s" : ""}
            </span>
            {completedCount > 0 && (
              <span className="tag" style={{ background: "var(--green-bg)", color: "var(--green)" }}>
                ✓ {completedCount} completado{completedCount > 1 ? "s" : ""}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="tag" style={{ background: "var(--amber-bg)", color: "var(--amber)" }}>
                ⏳ {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <button
          className="btn-p"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          onClick={() => { setShowSendModal(true); setSendSuccess(false); setSendError(""); setSendTestId(allSendOptions[0]?.id ?? ""); setSendIsCustom(allSendOptions[0]?.isCustom ?? false); }}
        >
          📤 Enviar test
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin .7s linear infinite" }} />
          <span style={{ ...dm("13px"), color: "var(--text-muted)" }}>Cargando tests...</span>
        </div>
      ) : submissions.length === 0 ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px 24px", gap: 12, textAlign: "center" }}>
          <span style={{ fontSize: 40, opacity: 0.3 }}>🧪</span>
          <div style={{ fontFamily: "var(--font-lora)", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
            Sin tests enviados a {patient.first_name}
          </div>
          <div style={{ ...dm("13px"), color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 260 }}>
            Envía un cuestionario para evaluar el progreso del paciente.
          </div>
          {!patient.email && (
            <div style={{ padding: "8px 14px", borderRadius: 10, background: "var(--amber-bg)", border: "1px solid var(--amber)33", ...dm("12px"), color: "var(--amber)" }}>
              ⚠ Este paciente no tiene email registrado — agrega uno para poder enviar tests.
            </div>
          )}
          <button
            className="btn-p"
            style={{ marginTop: 4 }}
            onClick={() => { setShowSendModal(true); setSendSuccess(false); setSendError(""); setSendTestId(allSendOptions[0]?.id ?? ""); setSendIsCustom(allSendOptions[0]?.isCustom ?? false); }}
          >
            📤 Enviar primer test
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* Lista */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {submissions.map((s, idx) => {
              const testDef    = !s.isCustom ? TESTS_DATA.find(t => t.id === s.test_id) : null;
              const rangeColor = testDef?.scoring.ranges.find(r => r.level === s.level)?.color ?? "var(--accent)";
              const isSelected = selectedSub?.id === s.id;
              const pct = s.score != null && s.max_score ? Math.round((s.score / s.max_score) * 100) : 0;

              return (
                <div
                  key={s.id}
                  className="card"
                  onClick={() => setSelectedSub(isSelected ? null : s)}
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    cursor: "pointer",
                    borderColor: isSelected ? "var(--accent-light)" : "var(--border-light)",
                    background: isSelected ? "var(--accent-bg)" : "var(--bg-card)",
                    animation: `fadeUp .2s ease ${idx * 0.04}s both`,
                    transition: "all .15s",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(28,25,23,0.10)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: s.score != null ? 10 : 0, flexWrap: "wrap", gap: 8 }}>
                    {/* Info del test */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${rangeColor}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                        {testDef?.icon ?? "✏️"}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ ...dm("13px"), fontWeight: 700, color: "var(--text-primary)" }}>{s.test_short_name}</span>
                          {s.isCustom && (
                            <span style={{ ...dm("9px"), background: "var(--accent-bg)", color: "var(--accent)", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>custom</span>
                          )}
                        </div>
                        <div style={{ ...dm("11px"), color: "var(--text-muted)", marginTop: 1 }}>
                          {s.isCustom ? (s.customTestName ?? "Test personalizado") : testDef?.name}
                        </div>
                      </div>
                    </div>

                    {/* Estado + fecha */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span className="tag" style={{ background: STATUS_META[s.status].bg, color: STATUS_META[s.status].color }}>
                        {STATUS_META[s.status].label}
                      </span>
                      <span style={{ ...dm("11px"), color: "var(--text-muted)" }}>
                        {s.completed_at ? fmtDate(s.completed_at) : fmtDate(s.sent_at)}
                      </span>
                    </div>
                  </div>

                  {/* Score inline (solo predefinidos con score) */}
                  {s.score != null && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <span className="tag" style={{ background: `${rangeColor}18`, color: rangeColor, fontSize: 11 }}>
                          {s.level}
                        </span>
                        <span style={{ ...dm("12px"), fontWeight: 700, color: rangeColor }}>
                          {s.score} / {s.max_score} pts
                        </span>
                      </div>
                      <ScoreBar score={s.score} max={s.max_score!} color={rangeColor} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel detalle */}
          {selectedSub && (
            <div style={{ width: 300, flexShrink: 0, animation: "fadeUp .2s ease" }}>
              <DetailPanel
                sub={selectedSub}
                onClose={() => setSelectedSub(null)}
                onMarkReviewed={() => handleMarkReviewed(selectedSub)}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal enviar test */}
      {showSendModal && (
        <>
          <div
            onClick={() => { setShowSendModal(false); setSendSuccess(false); }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 110, backdropFilter: "blur(4px)" }}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "var(--bg-card)", borderRadius: 20, padding: 28,
            width: "min(460px, 94vw)", zIndex: 111,
            boxShadow: "0 8px 32px rgba(28,25,23,0.18)",
            animation: "popIn .2s ease",
          }}>
            {!sendSuccess ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-lora)", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
                      Enviar test a {patient.first_name}
                    </div>
                    <div style={{ ...dm("12px"), color: "var(--text-muted)", marginTop: 3 }}>
                      {patient.email
                        ? `Se enviará a ${patient.email}`
                        : "⚠ Este paciente no tiene email registrado"}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSendModal(false)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}
                  >✕</button>
                </div>

                {/* Selector de test */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ ...dm("11px"), color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 600, display: "block", marginBottom: 8 }}>
                    Seleccionar test
                  </label>

                  {/* Predefinidos */}
                  <div style={{ ...dm("11px"), color: "var(--text-muted)", marginBottom: 8, fontWeight: 500 }}>BIBLIOTECA</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, maxHeight: 160, overflowY: "auto" }}>
                    {TESTS_DATA.map(t => {
                      const sel = !sendIsCustom && sendTestId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => { setSendTestId(t.id); setSendIsCustom(false); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px", borderRadius: 10,
                            border: `1.5px solid ${sel ? "var(--accent)" : "var(--border-light)"}`,
                            background: sel ? "var(--accent-bg)" : "var(--surface)",
                            cursor: "pointer", textAlign: "left", transition: "all .12s",
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{t.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ ...dm("12px"), fontWeight: 600, color: sel ? "var(--accent)" : "var(--text-primary)" }}>{t.shortName}</div>
                            <div style={{ ...dm("10px"), color: "var(--text-muted)" }}>{t.questions.length} ítems · {t.category}</div>
                          </div>
                          {sel && <span style={{ color: "var(--accent)", fontSize: 14 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Personalizados */}
                  {customTests.length > 0 && (
                    <>
                      <div style={{ ...dm("11px"), color: "var(--text-muted)", marginBottom: 8, fontWeight: 500 }}>MIS TESTS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                        {customTests.map(ct => {
                          const sel = sendIsCustom && sendTestId === ct.id;
                          return (
                            <button
                              key={ct.id}
                              onClick={() => { setSendTestId(ct.id); setSendIsCustom(true); }}
                              style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "10px 12px", borderRadius: 10,
                                border: `1.5px solid ${sel ? "var(--accent)" : "var(--border-light)"}`,
                                background: sel ? "var(--accent-bg)" : "var(--surface)",
                                cursor: "pointer", textAlign: "left", transition: "all .12s",
                              }}
                            >
                              <span style={{ fontSize: 18 }}>✏️</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ ...dm("12px"), fontWeight: 600, color: sel ? "var(--accent)" : "var(--text-primary)" }}>{ct.short_name}</div>
                                <div style={{ ...dm("10px"), color: "var(--text-muted)" }}>{ct.questions.length} preguntas · Personalizado</div>
                              </div>
                              {sel && <span style={{ color: "var(--accent)", fontSize: 14 }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {sendError && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--red-bg)", ...dm("12px"), color: "var(--red)", marginBottom: 14 }}>
                    ⚠ {sendError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-g" style={{ flex: 1 }} onClick={() => setShowSendModal(false)}>Cancelar</button>
                  <button
                    className="btn-p"
                    style={{ flex: 1, opacity: (!sendTestId || !patient.email || sending) ? 0.6 : 1 }}
                    disabled={!sendTestId || !patient.email || sending}
                    onClick={handleSend}
                  >
                    {sending ? "Enviando..." : "📤 Enviar por email"}
                  </button>
                </div>
              </>
            ) : (
              /* Éxito */
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>✅</div>
                <div style={{ fontFamily: "var(--font-lora)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                  ¡Test enviado a {patient.first_name}!
                </div>
                <div style={{ ...dm("13px"), color: "var(--text-muted)", marginBottom: 20 }}>
                  El paciente recibirá un email con el link al cuestionario.
                </div>
                {copiedLink && (
                  <div style={{ background: "var(--surface)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, textAlign: "left" }}>
                    <div style={{ ...dm("10px"), color: "var(--text-muted)", marginBottom: 4 }}>Link de respaldo</div>
                    <div style={{ ...dm("11px"), color: "var(--accent)", wordBreak: "break-all", marginBottom: 8 }}>{copiedLink}</div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(copiedLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
                      style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${linkCopied ? "var(--green)" : "var(--border)"}`, background: linkCopied ? "var(--green-bg)" : "var(--surface)", color: linkCopied ? "var(--green)" : "var(--text-secondary)", ...dm("11px"), cursor: "pointer", transition: "all .15s" }}
                    >
                      {linkCopied ? "✓ Copiado" : "📋 Copiar link"}
                    </button>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-g" style={{ flex: 1 }} onClick={() => { setShowSendModal(false); setSendSuccess(false); }}>Cerrar</button>
                  <button className="btn-p" style={{ flex: 1 }} onClick={() => { setSendSuccess(false); setSendTestId(allSendOptions[0]?.id ?? ""); setSendIsCustom(allSendOptions[0]?.isCustom ?? false); }}>
                    📤 Enviar otro
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Panel de detalle lateral ─────────────────────────────────────────────────
function DetailPanel({ sub, onClose, onMarkReviewed }: {
  sub: Submission;
  onClose: () => void;
  onMarkReviewed: () => void;
}) {
  const testDef    = !sub.isCustom ? TESTS_DATA.find(t => t.id === sub.test_id) : null;
  const rangeColor = testDef?.scoring.ranges.find(r => r.level === sub.level)?.color ?? "var(--accent)";
  const rangeDesc  = testDef?.scoring.ranges.find(r => r.level === sub.level)?.description ?? "";
  const pct = sub.score != null && sub.max_score ? Math.round((sub.score / sub.max_score) * 100) : 0;

  const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });

  const questions: any[] = sub.isCustom
    ? (sub.customQuestions ?? [])
    : (testDef?.questions ?? []);

  return (
    <div className="card" style={{ padding: "20px", borderRadius: 16, overflowY: "auto", maxHeight: "70vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-lora)", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            {sub.test_short_name}
          </div>
          <div style={{ ...dm("11px"), color: "var(--text-muted)", marginTop: 2 }}>
            {sub.isCustom ? (sub.customTestName ?? "Test personalizado") : testDef?.name}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}>✕</button>
      </div>

      {/* Score (predefinidos) */}
      {sub.score != null && (
        <div style={{ padding: "16px", background: "var(--surface)", borderRadius: 12, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-lora)", fontSize: 40, fontWeight: 700, color: rangeColor, lineHeight: 1 }}>{sub.score}</div>
          <div style={{ ...dm("12px"), color: "var(--text-muted)", margin: "4px 0 10px" }}>de {sub.max_score} puntos</div>
          <span className="tag" style={{ background: `${rangeColor}18`, color: rangeColor, fontSize: 12, padding: "4px 12px" }}>
            {sub.level}
          </span>
          {rangeDesc && <div style={{ ...dm("11px"), color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.5 }}>{rangeDesc}</div>}
          <div className="pbar" style={{ height: 6, margin: "12px 0 0" }}>
            <div className="pfill" style={{ width: `${pct}%`, background: rangeColor }} />
          </div>
        </div>
      )}

      {/* Info */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border-light)" }}>
          <span style={{ ...dm("12px"), color: "var(--text-muted)" }}>Estado</span>
          <span className="tag" style={{ background: ({ sent: "var(--amber-bg)", completed: "var(--blue-bg)", reviewed: "var(--green-bg)" } as any)[sub.status], color: ({ sent: "var(--amber)", completed: "var(--blue)", reviewed: "var(--green)" } as any)[sub.status] }}>
            {{ sent: "Enviado", completed: "Completado", reviewed: "Revisado" }[sub.status]}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border-light)" }}>
          <span style={{ ...dm("12px"), color: "var(--text-muted)" }}>Enviado</span>
          <span style={{ ...dm("12px"), color: "var(--text-primary)", fontWeight: 500 }}>{fmtDate(sub.sent_at)}</span>
        </div>
        {sub.completed_at && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border-light)" }}>
            <span style={{ ...dm("12px"), color: "var(--text-muted)" }}>Completado</span>
            <span style={{ ...dm("12px"), color: "var(--text-primary)", fontWeight: 500 }}>{fmtDate(sub.completed_at)}</span>
          </div>
        )}
      </div>

      {/* Respuestas */}
      {sub.answers && questions.length > 0 && (
        <>
          <div style={{ ...dm("11px"), color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 600, marginBottom: 10 }}>
            Respuestas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {questions.map((q: any, idx: number) => {
              const answerRaw = (sub.answers as any)?.[String(q.id)];
              const answerLabel = sub.isCustom
                ? (q.type === "text" ? answerRaw : (q.options ?? []).find((o: any) => o.value === answerRaw)?.label ?? String(answerRaw ?? "—"))
                : ((q.options ?? []).find((o: any) => o.value === answerRaw)?.label ?? String(answerRaw ?? "—"));

              return (
                <div key={q.id} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border-light)" }}>
                  <div style={{ ...dm("11px"), color: "var(--text-muted)", marginBottom: 4 }}>
                    {idx + 1}. {q.text}
                  </div>
                  <div style={{ ...dm("12px"), fontWeight: 600, color: "var(--text-primary)" }}>
                    {answerLabel ?? "Sin respuesta"}
                    {typeof answerRaw === "number" && q.type !== "text" && (
                      <span style={{ ...dm("10px"), color: "var(--text-muted)", marginLeft: 6, fontWeight: 400 }}>({answerRaw} pts)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sub.status === "completed" && (
          <button className="btn-p" style={{ width: "100%", fontSize: 12 }} onClick={onMarkReviewed}>
            ✓ Marcar como revisado
          </button>
        )}
      </div>
    </div>
  );
}