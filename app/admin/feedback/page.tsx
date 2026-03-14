"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Bug, Lightbulb, Pencil, Image, ArrowLeft, RefreshCw } from "lucide-react";

const ADMIN_EMAIL = "jsetorres1997@gmail.com";

type FeedbackType = "bug" | "sugerencia" | "correccion";

interface FeedbackItem {
  id:              string;
  psychologist_id: string;
  profile_name:    string;
  profile_email:   string;
  type:            FeedbackType;
  message:         string;
  screenshot_url:  string | null;
  created_at:      string;
}

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  bug: {
    label: "Bug",
    icon:  <Bug size={13} />,
    color: "var(--red)",
    bg:    "var(--red-bg)",
  },
  sugerencia: {
    label: "Sugerencia",
    icon:  <Lightbulb size={13} />,
    color: "var(--amber)",
    bg:    "var(--amber-bg)",
  },
  correccion: {
    label: "Corrección",
    icon:  <Pencil size={13} />,
    color: "var(--blue)",
    bg:    "var(--blue-bg)",
  },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "Hace un momento";
  if (diff < 3600)  return `Hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff/3600)}h`;
  return new Date(iso).toLocaleDateString("es-VE", { day:"numeric", month:"short", year:"numeric" });
}

export default function AdminFeedbackPage() {
  const { profile } = useAuth();
  const supabase    = createClient();
  const router      = useRouter();

  const [items, setItems]         = useState<FeedbackItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<FeedbackType | "all">("all");
  const [selected, setSelected]   = useState<FeedbackItem | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!profile) return;
    const email = (profile as any).email ?? "";
    if (email !== ADMIN_EMAIL) {
      setAuthorized(false);
    } else {
      setAuthorized(true);
      loadFeedback();
    }
  }, [profile]);

  const loadFeedback = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setItems(data ?? []);
    setLoading(false);
  };

  // ── No autorizado ─────────────────────────────────────────────────────────
  if (authorized === false) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg-primary)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
          <div style={{ fontFamily:"var(--font-lora)", fontSize:20, fontWeight:600, color:"var(--text-primary)", marginBottom:8 }}>
            Acceso restringido
          </div>
          <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginBottom:24 }}>
            Esta página solo está disponible para el administrador.
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ padding:"0 20px", height:40, borderRadius:10, border:"none", background:"var(--accent)", color:"#FAF7F2", fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer" }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ── Loading inicial ────────────────────────────────────────────────────────
  if (authorized === null || loading) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg-primary)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, color:"var(--text-muted)", fontFamily:"var(--font-dm-sans)", fontSize:13 }}>
          <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin .7s linear infinite" }} />
          Cargando feedback...
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const filtered = filter === "all" ? items : items.filter(i => i.type === filter);

  const counts = {
    all:        items.length,
    bug:        items.filter(i => i.type === "bug").length,
    sugerencia: items.filter(i => i.type === "sugerencia").length,
    correccion: items.filter(i => i.type === "correccion").length,
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-primary)", padding:"32px 24px" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ width:36, height:36, borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-secondary)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:22, fontWeight:600, color:"var(--text-primary)" }}>
                Panel de Feedback
              </div>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginTop:2 }}>
                {items.length} reporte{items.length !== 1 ? "s" : ""} recibido{items.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <button
            onClick={loadFeedback}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"0 16px", height:38, borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-secondary)", fontFamily:"var(--font-dm-sans)", fontSize:13, cursor:"pointer" }}
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {/* Stats rápidas */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
          {[
            { key:"all",        label:"Total",       color:"var(--accent)",  bg:"var(--accent-bg)"  },
            { key:"bug",        label:"Bugs",        color:"var(--red)",     bg:"var(--red-bg)"     },
            { key:"sugerencia", label:"Sugerencias", color:"var(--amber)",   bg:"var(--amber-bg)"   },
            { key:"correccion", label:"Correcciones",color:"var(--blue)",    bg:"var(--blue-bg)"    },
          ].map(s => (
            <div key={s.key} className="card"
              onClick={() => setFilter(s.key as any)}
              style={{ padding:"14px 16px", borderRadius:14, cursor:"pointer", borderColor: filter===s.key ? s.color : "var(--border-light)", background: filter===s.key ? s.bg : "var(--bg-card)", transition:"all .15s" }}>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:24, fontWeight:700, color:s.color }}>
                {counts[s.key as keyof typeof counts]}
              </div>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Lista + detalle */}
        <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap:16 }}>

          {/* Lista */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.length === 0 ? (
              <div className="card" style={{ padding:"48px 24px", textAlign:"center", borderRadius:16 }}>
                <div style={{ fontSize:36, opacity:.4, marginBottom:10 }}>📭</div>
                <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)" }}>
                  No hay reportes {filter !== "all" ? `de tipo "${TYPE_CONFIG[filter as FeedbackType].label}"` : ""} aún.
                </div>
              </div>
            ) : filtered.map(item => {
              const cfg    = TYPE_CONFIG[item.type];
              const isOpen = selected?.id === item.id;
              return (
                <div
                  key={item.id}
                  className="card"
                  onClick={() => setSelected(isOpen ? null : item)}
                  style={{ padding:"16px 18px", borderRadius:14, cursor:"pointer", borderColor: isOpen ? "var(--accent-light)" : "var(--border-light)", background: isOpen ? "var(--accent-bg)" : "var(--bg-card)", transition:"all .15s" }}
                >
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    {/* Badge tipo */}
                    <span style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:cfg.bg, color:cfg.color, fontFamily:"var(--font-dm-sans)", fontSize:11, fontWeight:600, flexShrink:0, marginTop:1 }}>
                      {cfg.icon} {cfg.label}
                    </span>

                    <div style={{ flex:1, minWidth:0 }}>
                      {/* Tester */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                        <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:600, color:"var(--text-primary)" }}>
                          {item.profile_name}
                        </div>
                        <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", flexShrink:0 }}>
                          {timeAgo(item.created_at)}
                        </div>
                      </div>
                      {/* Preview del mensaje */}
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-secondary)", lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                        {item.message}
                      </div>
                      {/* Indicador de captura */}
                      {item.screenshot_url && (
                        <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:6, color:"var(--text-muted)" }}>
                          <Image size={11} />
                          <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:11 }}>Incluye captura</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel de detalle */}
          {selected && (
            <div className="card" style={{ padding:"20px 22px", borderRadius:16, height:"fit-content", position:"sticky", top:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontFamily:"var(--font-lora)", fontSize:15, fontWeight:600, color:"var(--text-primary)" }}>
                  Detalle del reporte
                </div>
                <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18, lineHeight:1 }}>×</button>
              </div>

              {/* Tipo */}
              <div style={{ marginBottom:14 }}>
                {(() => {
                  const cfg = TYPE_CONFIG[selected.type];
                  return (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:cfg.bg, color:cfg.color, fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:600 }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  );
                })()}
              </div>

              {/* Tester */}
              <div style={{ padding:"10px 12px", borderRadius:10, background:"var(--surface)", marginBottom:14 }}>
                <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginBottom:3 }}>Enviado por</div>
                <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>{selected.profile_name}</div>
                <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{selected.profile_email}</div>
              </div>

              {/* Fecha */}
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginBottom:14 }}>
                {new Date(selected.created_at).toLocaleString("es-VE", { weekday:"long", day:"numeric", month:"long", hour:"2-digit", minute:"2-digit" })}
              </div>

              {/* Mensaje */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.4px", fontWeight:600 }}>Mensaje</div>
                <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)", lineHeight:1.65, whiteSpace:"pre-wrap" }}>
                  {selected.message}
                </div>
              </div>

              {/* Captura */}
              {selected.screenshot_url && (
                <div>
                  <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.4px", fontWeight:600 }}>Captura de pantalla</div>
                  <a href={selected.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selected.screenshot_url}
                      alt="Captura"
                      style={{ width:"100%", borderRadius:10, border:"1px solid var(--border)", objectFit:"contain", maxHeight:260, display:"block", cursor:"zoom-in" }}
                    />
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--accent)", marginTop:6 }}>
                      Ver en tamaño completo →
                    </div>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}