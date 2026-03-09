"use client";

import { useState, useRef, useEffect, useCallback } from "react";


// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

type Mode = "chat" | "redaccion" | "busqueda";

// ─── Sugerencias rápidas por modo ─────────────────────────────────────────────
const SUGGESTIONS: Record<Mode, string[]> = {
  chat: [
    "¿Cómo está progresando María González?",
    "Dame técnicas para manejar ataques de pánico",
    "¿Qué pacientes tengo hoy?",
    "Explícame el protocolo EMDR brevemente",
  ],
  redaccion: [
    "Redacta una nota de sesión para Ana Reyes",
    "Escribe un informe de alta para Laura Jiménez",
    "Carta de derivación para Carlos Mendoza a psiquiatría",
    "Plan de tratamiento para Joaquín Torres con TDAH",
  ],
  busqueda: [
    "Busca pacientes con diagnóstico de ansiedad",
    "¿Cuántas sesiones lleva Roberto Lima?",
    "Pacientes con cita esta semana",
    "Resumen de todos los pacientes activos",
  ],
};

const MODE_LABELS: Record<Mode, { icon: string; label: string; hint: string }> = {
  chat:      { icon: "💬", label: "Chat",      hint: "Preguntas clínicas y de gestión"  },
  redaccion: { icon: "📝", label: "Redacción", hint: "Notas, informes y documentos"     },
  busqueda:  { icon: "🔍", label: "Búsqueda",  hint: "Buscar y resumir pacientes"       },
};

// ─── Componente de mensaje ────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  // Renderizado simple de markdown (bold, headers, listas)
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("## "))  return <div key={i} style={{ fontFamily:"var(--font-lora)", fontSize:14, fontWeight:600, color:"var(--text-primary)", margin:"12px 0 6px" }}>{line.slice(3)}</div>;
      if (line.startsWith("### ")) return <div key={i} style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:600, color:"var(--text-primary)", margin:"8px 0 4px" }}>{line.slice(4)}</div>;
      if (line.startsWith("- ") || line.startsWith("* ")) return (
        <div key={i} style={{ display:"flex", gap:6, margin:"2px 0" }}>
          <span style={{ color:"var(--accent)", flexShrink:0 }}>·</span>
          <span>{line.slice(2)}</span>
        </div>
      );
      if (/^\d+\.\s/.test(line)) return (
        <div key={i} style={{ display:"flex", gap:6, margin:"2px 0" }}>
          <span style={{ color:"var(--accent)", flexShrink:0, minWidth:16 }}>{line.match(/^\d+/)?.[0]}.</span>
          <span>{line.replace(/^\d+\.\s/, "")}</span>
        </div>
      );
      if (line === "") return <div key={i} style={{ height:6 }} />;
      // Bold **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} style={{ margin:"1px 0" }}>
          {parts.map((p, j) =>
            p.startsWith("**") && p.endsWith("**")
              ? <strong key={j}>{p.slice(2,-2)}</strong>
              : p
          )}
        </div>
      );
    });
  };

  return (
    <div style={{ display:"flex", justifyContent:isUser?"flex-end":"flex-start", marginBottom:12 }}>
      {!isUser && (
        <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,var(--accent-light),var(--accent))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0, marginRight:8, marginTop:2 }}>✦</div>
      )}
      <div style={{
        maxWidth:"82%", padding:"10px 13px", borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
        background: isUser ? "var(--accent)" : "var(--surface)",
        color: isUser ? "#faf7f2" : "var(--text-primary)",
        fontFamily:"var(--font-dm-sans)", fontSize:13, lineHeight:1.55,
      }}>
        {isUser ? msg.content : renderMarkdown(msg.content)}
        <div style={{ fontSize:10, opacity:.5, marginTop:4, textAlign:"right" }}>
          {new Date(msg.ts).toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────
interface AiPanelProps {
  mode?: "floating" | "page";       // flotante o página completa
  onClose?: () => void;             // solo en modo flotante
}

export function AiPanel({ mode = "floating", onClose }: AiPanelProps) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [activeMode, setActiveMode] = useState<Mode>("chat");
  const [listening, setListening] = useState(false);
  const [copied, setCopied]       = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const recognRef  = useRef<SpeechRecognition | null>(null);

  // Scroll al fondo cuando hay mensajes nuevos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  // Inicializar speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as typeof window & { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition
      || (window as typeof window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition();
    recog.lang = "es-MX";
    recog.continuous = false;
    recog.interimResults = true;

    recog.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      setInput(transcript);
    };
    recog.onend = () => setListening(false);
    recognRef.current = recog;
  }, []);

  const toggleVoice = () => {
    if (!recognRef.current) return;
    if (listening) {
      recognRef.current.stop();
    } else {
      setListening(true);
      recognRef.current.start();
    }
  };

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role:"user", content, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role:"assistant", content: data.text, ts: Date.now() }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role:"assistant",
        content:"Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, messages, loading]);

  const copyLast = () => {
    const last = [...messages].reverse().find(m => m.role === "assistant");
    if (!last) return;
    navigator.clipboard.writeText(last.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearChat = () => setMessages([]);

  const isPage = mode === "page";

  // ─── Wrapper según modo ───────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = isPage
    ? { display:"flex", flexDirection:"column", height:"100%" }
    : {
        position:"fixed", bottom:80, right:20, zIndex:200,
        width:400, height:580,
        display:"flex", flexDirection:"column",
        borderRadius:20, overflow:"hidden",
        boxShadow:"0 8px 40px rgba(0,0,0,.25)",
        border:"1px solid var(--border)",
        animation:"aiPanelIn .2s ease",
      };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes aiPanelIn {
          from { opacity:0; transform:translateY(12px) scale(.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);   }
        }
        .ai-suggestion {
          padding: 7px 11px; border-radius: 20px; cursor: pointer;
          font-family: var(--font-dm-sans); font-size: 12px;
          background: var(--surface); color: var(--text-secondary);
          border: 1px solid var(--border); transition: all .15s;
          white-space: nowrap; flex-shrink: 0;
        }
        .ai-suggestion:hover {
          background: var(--accent-bg); color: var(--accent);
          border-color: var(--accent-light);
        }
        .ai-mode-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 20px; cursor: pointer;
          font-family: var(--font-dm-sans); font-size: 12px; font-weight: 500;
          border: 1px solid var(--border); transition: all .15s;
          background: transparent; color: var(--text-secondary);
        }
        .ai-mode-btn.active {
          background: var(--accent-bg); color: var(--accent);
          border-color: var(--accent-light);
        }
        .ai-mode-btn:hover:not(.active) { background: var(--surface); }
        .ai-input {
          flex: 1; resize: none; border: none; outline: none;
          background: transparent; color: var(--text-primary);
          font-family: var(--font-dm-sans); font-size: 13px;
          line-height: 1.5; padding: 10px 12px;
          min-height: 42px; max-height: 120px;
        }
        .ai-send-btn {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--accent); color: #faf7f2;
          border: none; cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          font-size: 16px; transition: opacity .15s; flex-shrink: 0;
        }
        .ai-send-btn:hover { opacity: .85; }
        .ai-send-btn:disabled { opacity: .4; cursor: default; }
        .ai-voice-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid var(--border); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; transition: all .15s; flex-shrink: 0;
          background: transparent; color: var(--text-secondary);
        }
        .ai-voice-btn.listening {
          background: var(--red-bg); border-color: var(--red);
          color: var(--red); animation: pulse 1s infinite;
        }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.6; } }
        .typing-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--accent); opacity: .4;
          animation: typingDot 1.2s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: .2s; }
        .typing-dot:nth-child(3) { animation-delay: .4s; }
        @keyframes typingDot { 0%,100% { opacity:.4; transform:translateY(0); } 50% { opacity:1; transform:translateY(-3px); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border-light)", background:"var(--bg-card)", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:"linear-gradient(135deg,var(--accent-light),var(--accent))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>✦</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"var(--font-lora)", fontSize:14, fontWeight:600, color:"var(--text-primary)" }}>PsyDesk AI</div>
          <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>Asistente clínico inteligente</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {messages.length > 0 && (
            <>
              <button onClick={copyLast} title="Copiar última respuesta"
                style={{ width:28, height:28, borderRadius:8, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)" }}>
                {copied ? "✓" : "⎘"}
              </button>
              <button onClick={clearChat} title="Limpiar chat"
                style={{ width:28, height:28, borderRadius:8, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)" }}>
                ↺
              </button>
            </>
          )}
          {!isPage && onClose && (
            <button onClick={onClose}
              style={{ width:28, height:28, borderRadius:8, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)" }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Selector de modo ── */}
      <div style={{ padding:"10px 16px", borderBottom:"1px solid var(--border-light)", background:"var(--bg-card)", display:"flex", gap:6, overflowX:"auto" }}>
        {(Object.keys(MODE_LABELS) as Mode[]).map(m => (
          <button key={m} className={`ai-mode-btn${activeMode===m?" active":""}`} onClick={() => setActiveMode(m)}>
            <span>{MODE_LABELS[m].icon}</span>
            <span>{MODE_LABELS[m].label}</span>
          </button>
        ))}
      </div>

      {/* ── Área de mensajes ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px", background:"var(--bg-primary)" }}>

        {/* Estado vacío */}
        {messages.length === 0 && (
          <div style={{ textAlign:"center", paddingTop: isPage ? 40 : 20 }}>
            <div style={{ fontSize: isPage ? 40 : 32, marginBottom:10 }}>✦</div>
            <div style={{ fontFamily:"var(--font-lora)", fontSize: isPage ? 17 : 14, fontWeight:600, color:"var(--text-primary)", marginBottom:6 }}>
              Hola, Dra. Laura
            </div>
            <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)", marginBottom:20, lineHeight:1.5 }}>
              {MODE_LABELS[activeMode].hint}
            </div>
            {/* Sugerencias */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
              {SUGGESTIONS[activeMode].map((s, i) => (
                <button key={i} className="ai-suggestion" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensajes */}
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

        {/* Indicador de escritura */}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,var(--accent-light),var(--accent))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>✦</div>
            <div style={{ background:"var(--surface)", borderRadius:"14px 14px 14px 4px", padding:"10px 14px", display:"flex", gap:5, alignItems:"center" }}>
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Sugerencias rápidas (cuando hay mensajes) ── */}
      {messages.length > 0 && !loading && (
        <div style={{ padding:"8px 12px", background:"var(--bg-card)", borderTop:"1px solid var(--border-light)", display:"flex", gap:6, overflowX:"auto" }}>
          {SUGGESTIONS[activeMode].slice(0, 2).map((s, i) => (
            <button key={i} className="ai-suggestion" onClick={() => sendMessage(s)}>{s}</button>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div style={{ padding:"10px 12px", background:"var(--bg-card)", borderTop:"1px solid var(--border-light)" }}>
        {/* Indicador de voz activa */}
        {listening && (
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", marginBottom:8, borderRadius:8, background:"var(--red-bg)", border:"1px solid var(--red)" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--red)", animation:"pulse 1s infinite" }} />
            <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--red)" }}>Escuchando... habla ahora</span>
          </div>
        )}

        <div style={{ display:"flex", gap:8, alignItems:"flex-end", background:"var(--surface)", borderRadius:12, border:"1px solid var(--border)", padding:"4px 8px" }}>
          <textarea
            ref={inputRef}
            className="ai-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={`${MODE_LABELS[activeMode].icon} ${activeMode === "chat" ? "Escribe tu pregunta..." : activeMode === "redaccion" ? "¿Qué documento necesitas?" : "¿Qué paciente buscas?"}`}
            rows={1}
          />
          <div style={{ display:"flex", gap:6, padding:"3px 0", alignItems:"center" }}>
            <button className={`ai-voice-btn${listening?" listening":""}`} onClick={toggleVoice} title={listening?"Detener":"Dictado por voz"}>
              🎤
            </button>
            <button className="ai-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading} title="Enviar (Enter)">
              ↑
            </button>
          </div>
        </div>
        <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:10, color:"var(--text-muted)", marginTop:5, textAlign:"center" }}>
          Enter para enviar · Shift+Enter para nueva línea · 🎤 para dictado
        </div>
      </div>
    </div>
  );
}

// ─── Botón flotante ───────────────────────────────────────────────────────────
export function AiFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <AiPanel mode="floating" onClose={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:"fixed", bottom:20, right:20, zIndex:199,
          width:52, height:52, borderRadius:16,
          background: open ? "var(--surface-2)" : "linear-gradient(135deg,var(--accent-light),var(--accent))",
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, boxShadow:"0 4px 20px rgba(139,115,85,.4)",
          transition:"all .2s",
        }}
        title="PsyDesk AI"
      >
        {open ? "×" : "✦"}
      </button>
    </>
  );
}