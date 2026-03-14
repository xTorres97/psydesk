"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bug, Lightbulb, Pencil, Upload, X, CheckCircle } from "lucide-react";

type FeedbackType = "bug" | "sugerencia" | "correccion";

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: React.ReactNode; color: string; bg: string; desc: string }> = {
  bug: {
    label: "Bug",
    icon:  <Bug size={16} />,
    color: "var(--red)",
    bg:    "var(--red-bg)",
    desc:  "Algo no funciona como debería",
  },
  sugerencia: {
    label: "Sugerencia",
    icon:  <Lightbulb size={16} />,
    color: "var(--amber)",
    bg:    "var(--amber-bg)",
    desc:  "Una idea para mejorar la app",
  },
  correccion: {
    label: "Corrección",
    icon:  <Pencil size={16} />,
    color: "var(--blue)",
    bg:    "var(--blue-bg)",
    desc:  "Algo está mal escrito o es impreciso",
  },
};

export default function FeedbackPage() {
  const { profile } = useAuth();
  const supabase    = createClient();
  const router      = useRouter();
  const fileRef     = useRef<HTMLInputElement>(null);

  const [type, setType]         = useState<FeedbackType>("bug");
  const [message, setMessage]   = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [sending, setSending]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("La imagen no puede superar 5 MB."); return; }
    setScreenshot(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!message.trim()) { setError("El mensaje no puede estar vacío."); return; }
    if (!profile?.id)    { setError("No se pudo identificar tu sesión."); return; }
    setSending(true); setError("");

    try {
      let screenshotUrl: string | null = null;

      // Subir captura si existe
      if (screenshot) {
        const ext  = screenshot.name.split(".").pop() ?? "png";
        const path = `${profile.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("feedback-screenshots")
          .upload(path, screenshot, { upsert: false, contentType: screenshot.type });
        if (uploadErr) throw new Error("Error al subir la captura: " + uploadErr.message);
        const { data } = supabase.storage.from("feedback-screenshots").getPublicUrl(path);
        screenshotUrl = data.publicUrl;
      }

      // Insertar feedback
      const { error: dbErr } = await supabase.from("feedback").insert({
        psychologist_id: profile.id,
        profile_name:    profile.full_name    ?? "Sin nombre",
        profile_email:   (profile as any).email ?? "",
        type,
        message:         message.trim(),
        screenshot_url:  screenshotUrl,
      });
      if (dbErr) throw new Error(dbErr.message);

      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? "Error al enviar el feedback.");
    } finally {
      setSending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)",
    fontSize: 13, outline: "none", transition: "border-color .15s",
    boxSizing: "border-box",
  };

  if (success) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg-primary)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ textAlign:"center", maxWidth:400 }}>
          <div style={{ width:72, height:72, borderRadius:"50%", background:"var(--green-bg)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", color:"var(--green)" }}>
            <CheckCircle size={32} />
          </div>
          <div style={{ fontFamily:"var(--font-lora)", fontSize:22, fontWeight:600, color:"var(--text-primary)", marginBottom:10 }}>
            ¡Gracias por tu feedback!
          </div>
          <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:14, color:"var(--text-muted)", lineHeight:1.6, marginBottom:28 }}>
            Tu mensaje fue recibido y será revisado pronto. Cada reporte ayuda a mejorar PsyDesk.
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            <button
              onClick={() => { setSuccess(false); setMessage(""); setType("bug"); removeScreenshot(); }}
              style={{ padding:"0 20px", height:40, borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer" }}
            >
              Enviar otro
            </button>
            <button
              onClick={() => router.back()}
              style={{ padding:"0 20px", height:40, borderRadius:10, border:"none", background:"var(--accent)", color:"#FAF7F2", fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer" }}
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-primary)", padding:"32px 24px" }}>
      <div style={{ maxWidth:600, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:32 }}>
          <button
            onClick={() => router.back()}
            style={{ width:36, height:36, borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-secondary)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ fontFamily:"var(--font-lora)", fontSize:22, fontWeight:600, color:"var(--text-primary)" }}>
              Enviar feedback
            </div>
            <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginTop:2 }}>
              Ayúdanos a mejorar PsyDesk
            </div>
          </div>
        </div>

        {/* Card del formulario */}
        <div className="card" style={{ padding:"24px 26px", borderRadius:18 }}>

          {/* Datos del tester (solo lectura) */}
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, background:"var(--surface)", border:"1px solid var(--border-light)", marginBottom:24 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", overflow:"hidden", background:"var(--accent-bg)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width:38, height:38, objectFit:"cover" }} />
                : <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:600, color:"var(--accent)" }}>
                    {profile?.full_name?.split(" ").map((n: string) => n[0]).slice(0,2).join("").toUpperCase() ?? "?"}
                  </span>
              }
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>
                {profile?.full_name ?? "—"}
              </div>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>
                {(profile as any)?.email ?? ""}
              </div>
            </div>
            <span style={{ marginLeft:"auto", fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--accent)", background:"var(--accent-bg)", padding:"3px 10px", borderRadius:20, fontWeight:500, flexShrink:0 }}>
              Beta tester
            </span>
          </div>

          {/* Tipo */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:8 }}>
              Tipo de reporte
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {(Object.keys(TYPE_CONFIG) as FeedbackType[]).map(t => {
                const cfg    = TYPE_CONFIG[t];
                const active = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    style={{
                      padding: "12px 8px", borderRadius: 12, cursor: "pointer",
                      border: `1.5px solid ${active ? cfg.color : "var(--border)"}`,
                      background: active ? cfg.bg : "var(--surface)",
                      transition: "all .15s", textAlign: "center",
                    }}
                  >
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:6, color: active ? cfg.color : "var(--text-muted)" }}>
                      {cfg.icon}
                    </div>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:600, color: active ? cfg.color : "var(--text-primary)" }}>
                      {cfg.label}
                    </div>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginTop:2, lineHeight:1.3 }}>
                      {cfg.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mensaje */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:8 }}>
              Descripción
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={
                type === "bug"
                  ? "Describe qué pasó, en qué página ocurrió y cómo reproducirlo..."
                  : type === "sugerencia"
                  ? "Describe tu idea y el problema que resolvería..."
                  : "Indica qué está incorrecto y cómo debería estar..."
              }
              rows={5}
              style={{ ...inputStyle, resize:"vertical", lineHeight:1.6 }}
            />
            <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginTop:4, textAlign:"right" }}>
              {message.length} caracteres
            </div>
          </div>

          {/* Captura de pantalla */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:8 }}>
              Captura de pantalla <span style={{ fontWeight:400, color:"var(--text-muted)" }}>(opcional)</span>
            </div>

            {preview ? (
              <div style={{ position:"relative", display:"inline-block" }}>
                <img
                  src={preview}
                  alt="Captura"
                  style={{ maxWidth:"100%", maxHeight:200, borderRadius:10, border:"1px solid var(--border)", objectFit:"contain", display:"block" }}
                />
                <button
                  onClick={removeScreenshot}
                  style={{ position:"absolute", top:6, right:6, width:24, height:24, borderRadius:"50%", background:"rgba(0,0,0,.55)", border:"none", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                >
                  <X size={12} />
                </button>
                <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginTop:6 }}>
                  {screenshot?.name} · {((screenshot?.size ?? 0) / 1024).toFixed(0)} KB
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border:"2px dashed var(--border)", borderRadius:12, padding:"24px 16px", textAlign:"center", cursor:"pointer", transition:"border-color .15s", background:"var(--surface)" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-light)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}
              >
                <div style={{ color:"var(--text-muted)", display:"flex", justifyContent:"center", marginBottom:8 }}>
                  <Upload size={20} />
                </div>
                <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-secondary)", fontWeight:500 }}>
                  Haz clic para subir una captura
                </div>
                <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginTop:4 }}>
                  PNG, JPG o WEBP · Máx. 5 MB
                </div>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display:"none" }} onChange={handleFile} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:"var(--red-bg)", border:"1px solid var(--red)33", fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--red)", marginBottom:16 }}>
              ⚠ {error}
            </div>
          )}

          {/* Botones */}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button
              onClick={() => router.back()}
              style={{ padding:"0 20px", height:40, borderRadius:10, border:"1px solid var(--border)", background:"transparent", color:"var(--text-secondary)", fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending || !message.trim()}
              style={{
                padding:"0 24px", height:40, borderRadius:10, border:"none",
                background: message.trim() && !sending ? "var(--accent)" : "var(--border)",
                color: message.trim() && !sending ? "#FAF7F2" : "var(--text-muted)",
                fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500,
                cursor: message.trim() && !sending ? "pointer" : "not-allowed",
                transition:"all .15s", display:"flex", alignItems:"center", gap:8,
              }}
            >
              {sending ? "Enviando..." : "Enviar feedback"}
            </button>
          </div>
        </div>

        <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", textAlign:"center", marginTop:16 }}>
          Tu feedback es confidencial y solo visible para el equipo de PsyDesk.
        </div>
      </div>
    </div>
  );
}