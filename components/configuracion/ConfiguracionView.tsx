"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePreferences } from "@/context/PreferencesContext";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { Theme, Density } from "@/context/PreferencesContext";

type ConfigSection = "perfil" | "consultorio" | "notificaciones" | "seguridad" | "facturacion" | "apariencia" | "integraciones";

const CONFIG_SECTIONS: { id: ConfigSection; icon: string; label: string; desc: string }[] = [
  { id:"perfil",         icon:"👤", label:"Perfil profesional", desc:"Datos personales y credenciales"   },
  { id:"consultorio",    icon:"🏥", label:"Consultorio",        desc:"Horarios, dirección y políticas"   },
  { id:"notificaciones", icon:"🔔", label:"Notificaciones",     desc:"Recordatorios y alertas"           },
  { id:"seguridad",      icon:"🔐", label:"Seguridad",          desc:"Contraseña y autenticación"        },
  { id:"facturacion",    icon:"💳", label:"Facturación",        desc:"Plan, pagos y suscripción"         },
  { id:"apariencia",     icon:"🎨", label:"Apariencia",         desc:"Tema, idioma y preferencias"       },
  { id:"integraciones",  icon:"🔗", label:"Integraciones",      desc:"Google Calendar, Meet y Drive"     },
];

const ACCENT_PALETTE = [
  { color:"#8B7355", name:"Café cálido"  },
  { color:"#4A7BA7", name:"Azul sereno"  },
  { color:"#5C8A6E", name:"Verde salvia" },
  { color:"#B5594A", name:"Terracota"    },
  { color:"#7B6EA8", name:"Lavanda"      },
  { color:"#C47B2B", name:"Ámbar"        },
  { color:"#1C1917", name:"Grafito"      },
];

const GOOGLE_SCOPES = {
  calendar: "https://www.googleapis.com/auth/calendar",
  meet:     "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/meetings.space.created",
  drive:    "https://www.googleapis.com/auth/drive.file",
};

const INTEGRATION_NAMES: Record<string, string> = {
  calendar: "Google Calendar",
  meet:     "Google Meet",
  drive:    "Google Drive",
};

const MAX_AVATAR_HISTORY = 5;

// ── Comprime una imagen usando canvas ────────────────────────────────────────
async function compressImage(file: File, maxSize = 400, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale  = Math.min(1, maxSize / Math.max(img.width, img.height));
      const width  = Math.round(img.width  * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Compresión fallida")), "image/jpeg", quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function Toggle({ checked, onChange, color = "var(--accent)" }: { checked: boolean; onChange: () => void; color?: string }) {
  return (
    <div onClick={onChange} style={{ width:44, height:24, borderRadius:12, background:checked?color:"var(--surface-2)", cursor:"pointer", transition:"background .2s", position:"relative", border:`1px solid ${checked?color:"var(--border)"}`, flexShrink:0 }}>
      <div style={{ width:18, height:18, borderRadius:9, background:"#FFFFFF", position:"absolute", top:2, left:checked?22:2, transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.15)" }} />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:hint?3:7 }}>{label}</div>
      {hint && <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginBottom:7 }}>{hint}</div>}
      {children}
    </div>
  );
}

function CardSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="card" style={{ padding:"20px 22px", marginBottom:20, borderRadius:16, ...style }}>{children}</div>;
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily:"var(--font-lora)", fontSize:15, fontWeight:600, color:"var(--text-primary)", marginBottom:14 }}>{children}</div>;
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid var(--border-light)", gap:10, flexWrap:"wrap" }}>{children}</div>
);

// ── Modal historial de avatares ───────────────────────────────────────────────
function AvatarModal({
  currentUrl, history, onSelect, onUpload, uploading, onClose,
}: {
  currentUrl: string | null;
  history: string[];
  onSelect: (url: string) => void;
  onUpload: () => void;
  uploading: boolean;
  onClose: () => void;
}) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:"var(--bg-card)", borderRadius:20, padding:28, width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>Foto de perfil</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"var(--text-muted)", lineHeight:1 }}>×</button>
        </div>

        {/* Avatar actual */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
          {currentUrl
            ? <img src={currentUrl} alt="" style={{ width:96, height:96, borderRadius:"50%", objectFit:"cover", border:"3px solid var(--accent)" }} />
            : <div style={{ width:96, height:96, borderRadius:"50%", background:"var(--surface-2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, border:"3px solid var(--accent)" }}>👤</div>
          }
        </div>

        {/* Historial */}
        {history.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)", marginBottom:10, fontWeight:500 }}>Fotos anteriores</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {history.map((url, i) => (
                <div key={i} onClick={() => onSelect(url)}
                  style={{ position:"relative", cursor:"pointer", borderRadius:12, overflow:"hidden", border:"2px solid var(--border)", transition:"border-color .15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}
                  title="Usar esta foto">
                  <img src={url} alt="" style={{ width:60, height:60, objectFit:"cover", display:"block" }} />
                  <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.0)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, opacity:0, transition:"opacity .15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,.35)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = "0"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,.0)"; }}>
                    ✓
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones */}
        <button className="btn-p" style={{ width:"100%", justifyContent:"center", display:"flex", alignItems:"center", gap:8, opacity:uploading?0.7:1 }} onClick={onUpload} disabled={uploading}>
          {uploading ? "⏳ Subiendo..." : "📷 Subir nueva foto"}
        </button>
        <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", textAlign:"center", marginTop:8 }}>
          Se comprimirá automáticamente · Máx. 400×400px
        </div>
      </div>
    </div>
  );
}

export function ConfiguracionView() {
  const [section, setSection]       = useState<ConfigSection>("perfil");
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [twoFactor, setTwoFactor]   = useState(true);
  const [autoLogout, setAutoLogout] = useState(true);
  const [sessionLog, setSessionLog] = useState(true);
  const [savingProfile, setSavingProfile]       = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [uploadingAvatar, setUploadingAvatar]   = useState(false);
  const [showAvatarModal, setShowAvatarModal]   = useState(false);
  const [avatarHistory, setAvatarHistory]       = useState<string[]>([]);
  const [notif, setNotif] = useState({
    emailReminder:true, smsReminder:false, whatsapp:true,
    sessionCancel:true, newPatient:true, testComplete:true,
    weeklyReport:false, loginAlert:true,
    reminder24h:true, reminder1h:true, reminderCustom:false,
  });

  const [currentPass, setCurrentPass] = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  type IntegKey = "calendar" | "meet" | "drive";
  const [integrations, setIntegrations] = useState<Record<IntegKey, boolean>>({
    calendar: false, meet: false, drive: false,
  });
  const [integLoading, setIntegLoading] = useState<Record<IntegKey, boolean>>({
    calendar: false, meet: false, drive: false,
  });

  const {
    theme, accentColor, density,
    lang, dateFormat, timeFormat,
    setTheme, setAccentColor, setDensity,
    setLang, setDateFormat, setTimeFormat,
    saveToSupabase,
  } = usePreferences();

  const { profile, refreshProfile } = useAuth();
  const supabase     = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [form, setForm] = useState({
    full_name:      profile?.full_name      ?? "",
    sexo:           (profile?.sexo          ?? "") as "masculino" | "femenino" | "",
    specialty:      profile?.specialty      ?? "",
    phone:          profile?.phone          ?? "",
    license_number: profile?.license_number ?? "",
    clinic_name:    profile?.clinic_name    ?? "",
  });

  // ── Cargar historial de avatares ─────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("profiles")
      .select("avatar_history")
      .eq("id", profile.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_history) setAvatarHistory(data.avatar_history);
      });
  }, [profile?.id]);

  // ── Leer resultado del callback de Google al volver ───────────────────────
  useEffect(() => {
    const connected = searchParams.get("connected") as IntegKey | null;
    const sec       = searchParams.get("section") as ConfigSection | null;
    const error     = searchParams.get("error");

    if (sec) setSection(sec);

    if (connected && INTEGRATION_NAMES[connected]) {
      setIntegrations(p => ({ ...p, [connected]: true }));
      showToast(`✓ ${INTEGRATION_NAMES[connected]} conectado correctamente`);
      router.replace("/configuracion?section=integraciones");
    }

    if (error) {
      const msg = error === "cancelled"
        ? "Conexión cancelada."
        : "Error al conectar con Google. Intenta de nuevo.";
      showToast(msg, false);
      router.replace("/configuracion?section=integraciones");
    }
  }, []);

  // ── Cargar integraciones desde Supabase ───────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("integrations")
      .select("provider, connected")
      .eq("profile_id", profile.id)
      .then(({ data }) => {
        if (!data) return;
        const updated = { calendar: false, meet: false, drive: false };
        data.forEach((row: { provider: string; connected: boolean }) => {
          if (row.provider in updated) updated[row.provider as IntegKey] = row.connected;
        });
        setIntegrations(updated);
      });
  }, [profile?.id]);

  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"9px 12px", borderRadius:10, border:"1px solid var(--border)",
    background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)",
    fontSize:13, outline:"none", transition:"border-color .15s",
  };

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSavePerfil = async () => {
    if (!profile?.id) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name:      form.full_name,
        sexo:           form.sexo || null,
        specialty:      form.specialty,
        phone:          form.phone,
        license_number: form.license_number,
        clinic_name:    form.clinic_name,
      })
      .eq("id", profile.id);
    await refreshProfile();
    setSavingProfile(false);
    error ? showToast("Error al guardar. Intenta de nuevo.", false) : showToast("✓ Perfil actualizado");
  };

  const handleSaveAppearance = async () => {
    setSavingAppearance(true);
    await saveToSupabase({ theme, accentColor, density, lang, dateFormat, timeFormat });
    setSavingAppearance(false);
    showToast("✓ Preferencias de apariencia guardadas");
  };

  // ── Subir nueva foto (con compresión) ─────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    e.target.value = ""; // reset para permitir subir el mismo archivo de nuevo
    setUploadingAvatar(true);

    try {
      // 1. Comprimir imagen
      const compressed = await compressImage(file);
      const path       = `avatars/${profile.id}.jpg`;

      // 2. Si ya hay avatar actual, guardarlo en historial antes de reemplazar
      const currentHistory = [...avatarHistory];
      if (profile.avatar_url) {
        const newHistory = [profile.avatar_url, ...currentHistory.filter(u => u !== profile.avatar_url)]
          .slice(0, MAX_AVATAR_HISTORY);
        setAvatarHistory(newHistory);
        await supabase.from("profiles").update({ avatar_history: newHistory }).eq("id", profile.id);
      }

      // 3. Subir imagen comprimida
      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) { showToast("Error al subir la foto.", false); setUploadingAvatar(false); return; }

      // 4. Actualizar avatar_url con cache-bust para forzar recarga
      const { data } = supabase.storage.from("profiles").getPublicUrl(path);
      const urlWithBust = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: urlWithBust }).eq("id", profile.id);
      await refreshProfile();
      setShowAvatarModal(false);
      showToast("✓ Foto actualizada");
    } catch {
      showToast("Error al procesar la imagen.", false);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Restaurar avatar desde historial ─────────────────────────────────────
  const handleSelectHistoryAvatar = async (url: string) => {
    if (!profile?.id) return;
    setUploadingAvatar(true);

    // Mover el actual al historial, quitar el seleccionado del historial
    const newHistory = [
      ...(profile.avatar_url ? [profile.avatar_url] : []),
      ...avatarHistory.filter(u => u !== url),
    ].slice(0, MAX_AVATAR_HISTORY);

    await supabase.from("profiles").update({
      avatar_url:     url,
      avatar_history: newHistory,
    }).eq("id", profile.id);

    setAvatarHistory(newHistory);
    await refreshProfile();
    setShowAvatarModal(false);
    setUploadingAvatar(false);
    showToast("✓ Foto restaurada");
  };

  const handleChangePassword = async () => {
    if (!newPass || !confirmPass)   { showToast("Completa todos los campos.", false); return; }
    if (newPass.length < 8)         { showToast("Mínimo 8 caracteres.", false); return; }
    if (newPass !== confirmPass)    { showToast("Las contraseñas no coinciden.", false); return; }
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setPassLoading(false);
    if (error) showToast("Error al cambiar contraseña.", false);
    else { showToast("✓ Contraseña actualizada"); setCurrentPass(""); setNewPass(""); setConfirmPass(""); }
  };

  const handleConnectGoogle = async (key: IntegKey) => {
    if (!profile?.id) return;
    setIntegLoading(p => ({ ...p, [key]: true }));
    const scopes      = encodeURIComponent(GOOGLE_SCOPES[key]);
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback/google`);
    const clientId    = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
    const state       = encodeURIComponent(JSON.stringify({ integration: key }));
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent&state=${state}`;
    await supabase.from("integrations").upsert({
      profile_id: profile.id, provider: key, connected: false, status: "pending",
    }, { onConflict: "profile_id,provider" });
    setIntegLoading(p => ({ ...p, [key]: false }));
    window.location.href = url;
  };

  const handleDisconnect = async (key: IntegKey) => {
    if (!profile?.id) return;
    setIntegLoading(p => ({ ...p, [key]: true }));
    await supabase.from("integrations").upsert({
      profile_id: profile.id, provider: key, connected: false, status: "disconnected",
      access_token: null, refresh_token: null,
    }, { onConflict: "profile_id,provider" });
    setIntegrations(p => ({ ...p, [key]: false }));
    setIntegLoading(p => ({ ...p, [key]: false }));
    showToast(`✓ ${INTEGRATION_NAMES[key]} desconectado`);
  };

  const handleSave = () => {
    if (section === "perfil")          handleSavePerfil();
    else if (section === "apariencia") handleSaveAppearance();
    else showToast("✓ Preferencias guardadas");
  };

  const isSaving = savingProfile || savingAppearance;
  const initials  = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const titulo  = profile?.sexo === "femenino" ? "Dra." : profile?.sexo === "masculino" ? "Dr." : "";
  const current = CONFIG_SECTIONS.find(s => s.id === section)!;

  const INTEGRATIONS: { key: IntegKey; icon: string; name: string; desc: string; color: string; badge?: string }[] = [
    { key:"calendar", icon:"📅", name:"Google Calendar", desc:"Sincroniza citas automáticamente con tu Google Calendar.",       color:"#4A7BA7" },
    { key:"meet",     icon:"🎥", name:"Google Meet",      desc:"Genera links de videollamada automáticos para sesiones online.", color:"#5C8A6E", badge:"Requiere Calendar conectado" },
    { key:"drive",    icon:"☁️", name:"Google Drive",     desc:"Guarda y accede a archivos de pacientes directamente en Drive.",color:"#C47B2B" },
  ];

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      <style>{`
        .cfg-sidebar        { display: flex; }
        .cfg-mobile-select  { display: none; }
        .cfg-grid-2         { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cfg-grid-3         { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
        .cfg-grid-3f        { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
        .cfg-integ-actions  { display: flex; gap: 8px; align-items: center; }
        @media (max-width: 768px) {
          .cfg-sidebar       { display: none !important; }
          .cfg-mobile-select { display: flex !important; }
          .cfg-grid-2        { grid-template-columns: 1fr !important; gap: 0; }
          .cfg-grid-3        { grid-template-columns: 1fr 1fr !important; }
          .cfg-grid-3f       { grid-template-columns: 1fr !important; }
          .cfg-integ-actions { flex-wrap: wrap; }
        }
        .theme-card { padding:14px 10px; border-radius:12px; cursor:pointer; text-align:center; transition:all .2s; border:2px solid var(--border-light); background:var(--surface); }
        .theme-card:hover { border-color: var(--accent-light); }
        .theme-card.selected { border-color:var(--accent); background:var(--accent-bg); }
        .theme-card .tc-label { font-family:var(--font-dm-sans); font-size:13px; color:var(--text-secondary); font-weight:400; transition:color .2s; }
        .theme-card.selected .tc-label { color:var(--accent); font-weight:600; }
        .acc-swatch { width:28px; height:28px; border-radius:8px; cursor:pointer; transition:transform .15s, box-shadow .15s; border:2px solid transparent; position:relative; }
        .acc-swatch:hover { transform:scale(1.1); }
        .acc-swatch.selected { border-color:var(--text-primary); transform:scale(1.18); box-shadow:0 2px 8px rgba(0,0,0,.25); }
        .acc-swatch.selected::after { content:'✓'; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:12px; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.5); }
        .sexo-btn { flex:1; padding:10px 14px; border-radius:10px; cursor:pointer; font-family:var(--font-dm-sans); font-size:13px; font-weight:500; transition:all .15s; border:1.5px solid var(--border); background:var(--surface); color:var(--text-secondary); }
        .sexo-btn.active { border-color:var(--accent); background:var(--accent-bg); color:var(--accent); }
        .avatar-wrap { position:relative; width:72px; height:72px; cursor:pointer; }
        .avatar-wrap:hover .avatar-overlay { opacity:1; }
        .avatar-overlay { position:absolute; inset:0; border-radius:50%; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .2s; font-size:18px; }
        .integ-card { display:flex; align-items:center; gap:14px; padding:16px 18px; border-radius:14px; flex-wrap:wrap; transition:box-shadow .15s; }
        .integ-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
      `}</style>

      {/* Modal de avatar */}
      {showAvatarModal && (
        <AvatarModal
          currentUrl={profile?.avatar_url ?? null}
          history={avatarHistory}
          onSelect={handleSelectHistoryAvatar}
          onUpload={() => fileInputRef.current?.click()}
          uploading={uploadingAvatar}
          onClose={() => setShowAvatarModal(false)}
        />
      )}

      {/* Input oculto para subir archivo */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleAvatarChange} />

      {/* Menú lateral */}
      <div className="cfg-sidebar" style={{ width:230, flexShrink:0, borderRight:"1px solid var(--border-light)", background:"var(--bg-card)", padding:"16px 10px", overflowY:"auto", borderRadius:16, marginRight:20, flexDirection:"column" }}>
        <div style={{ fontFamily:"var(--font-lora)", fontSize:15, fontWeight:600, color:"var(--text-primary)", padding:"4px 10px", marginBottom:14 }}>Configuración</div>
        {CONFIG_SECTIONS.map(s => (
          <div key={s.id} onClick={() => setSection(s.id)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, cursor:"pointer", transition:"all .15s", marginBottom:2, background:section===s.id?"var(--accent-bg)":"transparent", borderLeft:`3px solid ${section===s.id?"var(--accent)":"transparent"}` }}
            onMouseEnter={e => { if (section!==s.id) (e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
            onMouseLeave={e => { if (section!==s.id) (e.currentTarget as HTMLDivElement).style.background="transparent"; }}
          >
            <span style={{ fontSize:17, flexShrink:0 }}>{s.icon}</span>
            <div>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:section===s.id?"var(--accent)":"var(--text-primary)" }}>{s.label}</div>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex:1, overflowY:"auto" }}>
        <div style={{ maxWidth:640 }}>

          <div className="cfg-mobile-select" style={{ alignItems:"center", gap:10, marginBottom:20 }}>
            <select value={section} onChange={e => setSection(e.target.value as ConfigSection)}
              style={{ flex:1, border:"1px solid var(--border)", borderRadius:10, padding:"9px 12px", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none" }}>
              {CONFIG_SECTIONS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
            </select>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:20, fontWeight:600, color:"var(--text-primary)" }}>{current.icon} {current.label}</div>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginTop:3 }}>{current.desc}</div>
            </div>
            {section !== "integraciones" && (
              <button onClick={handleSave} disabled={isSaving}
                style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 16px", borderRadius:10, height:36, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:isSaving?"not-allowed":"pointer", opacity:isSaving?0.7:1, boxShadow:"0 2px 8px rgba(139,115,85,0.35)", whiteSpace:"nowrap" }}>
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            )}
          </div>

          {/* ── PERFIL ── */}
          {section === "perfil" && (
            <>
              <CardSection>
                <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:20, flexWrap:"wrap" }}>
                  <div className="avatar-wrap" onClick={() => setShowAvatarModal(true)}>
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="" style={{ width:72, height:72, borderRadius:"50%", objectFit:"cover" }} />
                      : <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,var(--accent-light),var(--accent))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, color:"#FAF7F2", fontFamily:"var(--font-dm-sans)", fontWeight:600 }}>{initials}</div>
                    }
                    <div className="avatar-overlay">{uploadingAvatar ? "⏳" : "📷"}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>
                      {titulo && <span style={{ color:"var(--text-muted)", marginRight:4 }}>{titulo}</span>}
                      {profile?.full_name ?? "—"}
                    </div>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)", marginBottom:8 }}>{profile?.email ?? ""}</div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <button className="btn-g" style={{ fontSize:12, padding:"6px 12px" }} onClick={() => setShowAvatarModal(true)}>
                        {uploadingAvatar ? "Subiendo..." : "Cambiar foto"}
                      </button>
                      {avatarHistory.length > 0 && (
                        <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>
                          {avatarHistory.length} foto{avatarHistory.length > 1 ? "s" : ""} anterior{avatarHistory.length > 1 ? "es" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="cfg-grid-2">
                  <Field label="Nombre completo">
                    <input style={inputStyle} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Laura Martínez Reyes" />
                  </Field>
                  <Field label="Cédula profesional">
                    <input style={inputStyle} value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} placeholder="12345678" />
                  </Field>
                  <Field label="Especialidad">
                    <select style={inputStyle} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}>
                      <option value="">Selecciona tu especialidad</option>
                      <option>Cognitivo-Conductual (TCC)</option>
                      <option>Psicoanálisis / Psicodinámica</option>
                      <option>Humanista / Gestalt</option>
                      <option>EMDR</option>
                      <option>Sistémica / Familiar</option>
                      <option>Neuropsicología</option>
                      <option>Infantil y Adolescentes</option>
                      <option>Otra</option>
                    </select>
                  </Field>
                  <Field label="Teléfono">
                    <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+52 55 9999 0000" />
                  </Field>
                </div>
                <Field label="Sexo" hint="Define si se muestra Dr. o Dra. en la interfaz">
                  <div style={{ display:"flex", gap:8 }}>
                    <button className={`sexo-btn${form.sexo === "masculino" ? " active" : ""}`} onClick={() => setForm(f => ({ ...f, sexo: "masculino" }))}>👨‍⚕️ Dr. (Masculino)</button>
                    <button className={`sexo-btn${form.sexo === "femenino" ? " active" : ""}`}  onClick={() => setForm(f => ({ ...f, sexo: "femenino" }))}>👩‍⚕️ Dra. (Femenino)</button>
                  </div>
                </Field>
                <Field label="Nombre del consultorio">
                  <input style={inputStyle} value={form.clinic_name} onChange={e => setForm(f => ({ ...f, clinic_name: e.target.value }))} placeholder="Consultorio Dra. Laura Martínez" />
                </Field>
              </CardSection>
              <CardSection>
                <SecTitle>Formación y certificaciones</SecTitle>
                {[
                  { title:"Maestría en Psicología Clínica", inst:"UNAM",          year:"2018" },
                  { title:"Certificación TCC",              inst:"Beck Institute", year:"2020" },
                ].map((c,i) => (
                  <Row key={i}>
                    <div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{c.title}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{c.inst} · {c.year}</div>
                    </div>
                    <button className="btn-g" style={{ fontSize:11, padding:"5px 10px" }}>Editar</button>
                  </Row>
                ))}
                <button className="btn-g" style={{ marginTop:12, fontSize:12 }}>+ Agregar certificación</button>
              </CardSection>
            </>
          )}

          {/* ── CONSULTORIO ── */}
          {section === "consultorio" && (
            <>
              <CardSection>
                <SecTitle>Datos del consultorio</SecTitle>
                <Field label="Nombre del consultorio"><input style={inputStyle} defaultValue="Consultorio Dra. Laura Martínez" /></Field>
                <Field label="Dirección"><input style={inputStyle} defaultValue="Av. Insurgentes Sur 1234, Col. Del Valle, CDMX" /></Field>
                <div className="cfg-grid-2">
                  <Field label="Duración por defecto">
                    <select style={inputStyle}><option>50 minutos</option><option>45 minutos</option><option>60 minutos</option><option>80 minutos</option></select>
                  </Field>
                  <Field label="Tiempo entre citas">
                    <select style={inputStyle}><option>10 minutos</option><option>15 minutos</option><option>20 minutos</option></select>
                  </Field>
                </div>
              </CardSection>
              <CardSection>
                <SecTitle>Horario de atención</SecTitle>
                {["Lunes","Martes","Miércoles","Jueves","Viernes"].map((d,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid var(--border-light)", flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)", width:80, flexShrink:0 }}>{d}</span>
                    <input style={{ ...inputStyle, width:86 }} defaultValue="09:00" type="time" />
                    <span style={{ color:"var(--text-muted)", fontSize:12 }}>—</span>
                    <input style={{ ...inputStyle, width:86 }} defaultValue="18:00" type="time" />
                    <Toggle checked={true} onChange={() => {}} />
                  </div>
                ))}
                {["Sábado","Domingo"].map((d,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i===0?"1px solid var(--border-light)":"none" }}>
                    <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", width:80 }}>{d}</span>
                    <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)", flex:1 }}>No disponible</span>
                    <Toggle checked={false} onChange={() => {}} />
                  </div>
                ))}
              </CardSection>
              <CardSection>
                <SecTitle>Políticas de cancelación</SecTitle>
                <Field label="Aviso mínimo para cancelar sin penalización">
                  <select style={inputStyle}><option>24 horas</option><option>48 horas</option><option>72 horas</option><option>Sin política</option></select>
                </Field>
                <Field label="Mensaje para pacientes al confirmar cita">
                  <textarea style={{ ...inputStyle, minHeight:80, resize:"vertical" } as React.CSSProperties} defaultValue="Recuerda que debes confirmar o cancelar tu cita con al menos 24 horas de anticipación." />
                </Field>
              </CardSection>
            </>
          )}

          {/* ── NOTIFICACIONES ── */}
          {section === "notificaciones" && (
            <>
              <CardSection>
                <SecTitle>Recordatorios a pacientes</SecTitle>
                {([
                  { key:"reminder24h",    label:"Recordatorio 24h antes",     desc:"Se envía automáticamente el día anterior" },
                  { key:"reminder1h",     label:"Recordatorio 1h antes",      desc:"Recordatorio de último momento"           },
                  { key:"reminderCustom", label:"Recordatorio personalizado", desc:"Define tu propio tiempo de envío"         },
                ] as { key: keyof typeof notif; label: string; desc: string }[]).map(n => (
                  <Row key={n.key}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{n.label}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{n.desc}</div>
                    </div>
                    <Toggle checked={notif[n.key]} onChange={() => setNotif(p => ({ ...p, [n.key]: !p[n.key] }))} />
                  </Row>
                ))}
              </CardSection>
              <CardSection>
                <SecTitle>Canales de envío</SecTitle>
                {([
                  { key:"emailReminder", label:"Correo electrónico", desc:"Requiere email del paciente"  },
                  { key:"smsReminder",   label:"SMS",                desc:"Costo adicional por mensaje"  },
                  { key:"whatsapp",      label:"WhatsApp",           desc:"Requiere integración activa"  },
                ] as { key: keyof typeof notif; label: string; desc: string }[]).map(n => (
                  <Row key={n.key}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{n.label}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{n.desc}</div>
                    </div>
                    <Toggle checked={notif[n.key]} onChange={() => setNotif(p => ({ ...p, [n.key]: !p[n.key] }))} />
                  </Row>
                ))}
              </CardSection>
              <CardSection>
                <SecTitle>Alertas del sistema</SecTitle>
                {([
                  { key:"sessionCancel", label:"Cancelación de cita",   desc:"Cuando un paciente cancele"           },
                  { key:"newPatient",    label:"Nuevo paciente",         desc:"Cuando se registre un nuevo paciente" },
                  { key:"testComplete",  label:"Test completado",        desc:"Cuando un paciente complete un test"  },
                  { key:"weeklyReport",  label:"Reporte semanal",        desc:"Resumen de actividad cada lunes"      },
                  { key:"loginAlert",    label:"Alerta de nuevo acceso", desc:"Si hay login desde dispositivo nuevo" },
                ] as { key: keyof typeof notif; label: string; desc: string }[]).map(n => (
                  <Row key={n.key}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{n.label}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{n.desc}</div>
                    </div>
                    <Toggle checked={notif[n.key]} onChange={() => setNotif(p => ({ ...p, [n.key]: !p[n.key] }))} />
                  </Row>
                ))}
              </CardSection>
            </>
          )}

          {/* ── SEGURIDAD ── */}
          {section === "seguridad" && (
            <>
              <CardSection>
                <SecTitle>Cambiar contraseña</SecTitle>
                <Field label="Contraseña actual" hint="Solo requerida si iniciaste sesión con email">
                  <input type="password" style={inputStyle} placeholder="••••••••" value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
                </Field>
                <Field label="Nueva contraseña">
                  <input type="password" style={inputStyle} placeholder="Mínimo 8 caracteres" value={newPass} onChange={e => setNewPass(e.target.value)} />
                </Field>
                <Field label="Confirmar nueva contraseña">
                  <input type="password" style={inputStyle} placeholder="••••••••" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                </Field>
                <button className="btn-p" style={{ marginTop:4, opacity:passLoading?0.7:1 }} onClick={handleChangePassword} disabled={passLoading}>
                  {passLoading ? "Actualizando..." : "Actualizar contraseña"}
                </button>
              </CardSection>
              <CardSection>
                <SecTitle>Opciones de seguridad</SecTitle>
                {[
                  { label:"Autenticación de dos factores (2FA)", desc:"Agrega una capa extra de seguridad al iniciar sesión", state:twoFactor, set:setTwoFactor },
                  { label:"Cierre de sesión automático",         desc:"Cerrar sesión tras 30 minutos de inactividad",         state:autoLogout, set:setAutoLogout },
                  { label:"Registro de accesos",                 desc:"Guardar log de todos los inicios de sesión",           state:sessionLog, set:setSessionLog },
                ].map((o,i) => (
                  <Row key={i}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{o.label}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{o.desc}</div>
                    </div>
                    <Toggle checked={o.state} onChange={() => o.set(!o.state)} color="var(--green)" />
                  </Row>
                ))}
              </CardSection>
              <CardSection>
                <SecTitle>Sesiones activas</SecTitle>
                {[
                  { device:"MacBook Pro · Chrome", loc:"Ciudad de México", time:"Ahora mismo",  current:true  },
                  { device:"iPhone 14 · Safari",   loc:"Ciudad de México", time:"Hace 2 horas", current:false },
                ].map((s,i) => (
                  <Row key={i}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                        <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{s.device}</span>
                        {s.current && <span style={{ background:"var(--green-bg)", color:"var(--green)", padding:"1px 7px", borderRadius:10, fontSize:10, fontFamily:"var(--font-dm-sans)", fontWeight:600 }}>Actual</span>}
                      </div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{s.loc} · {s.time}</div>
                    </div>
                    {!s.current && <button className="btn-g" style={{ fontSize:11, padding:"5px 10px", color:"var(--red)", borderColor:"var(--red)" }}>Cerrar</button>}
                  </Row>
                ))}
              </CardSection>
            </>
          )}

          {/* ── FACTURACIÓN ── */}
          {section === "facturacion" && (
            <>
              <CardSection>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                  <div>
                    <div style={{ fontFamily:"var(--font-lora)", fontSize:15, fontWeight:600, color:"var(--text-primary)", marginBottom:4 }}>Plan Pro</div>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-secondary)" }}>Facturación mensual · Próximo cobro: 7 Feb 2026</div>
                  </div>
                  <span style={{ background:"var(--accent-bg)", color:"var(--accent)", padding:"4px 12px", borderRadius:20, fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:600 }}>Activo</span>
                </div>
                <div className="cfg-grid-3f" style={{ marginTop:16 }}>
                  {[{ label:"Pacientes", val:"34 / ∞" }, { label:"Almacenamiento", val:"2.1 / 10 GB" }, { label:"Tests enviados", val:"12 / ∞" }].map((s,i) => (
                    <div key={i} style={{ background:"var(--surface)", borderRadius:10, padding:"10px 12px" }}>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:10, color:"var(--text-muted)", marginBottom:2 }}>{s.label}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:14, fontWeight:600, color:"var(--text-primary)" }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </CardSection>
              <CardSection>
                <SecTitle>Método de pago</SecTitle>
                <Row>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <div style={{ width:40, height:26, borderRadius:5, background:"var(--blue)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:10, fontFamily:"var(--font-dm-sans)", fontWeight:700, flexShrink:0 }}>VISA</div>
                    <div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)" }}>•••• •••• •••• 4242</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>Vence 09/27</div>
                    </div>
                  </div>
                  <button className="btn-g" style={{ fontSize:11, padding:"5px 10px" }}>Cambiar</button>
                </Row>
              </CardSection>
            </>
          )}

          {/* ── APARIENCIA ── */}
          {section === "apariencia" && (
            <>
              <CardSection>
                <SecTitle>Tema de la interfaz</SecTitle>
                <div className="cfg-grid-3">
                  {([
                    ["light", "☀️", "Claro",      "Fondos claros y cálidos"],
                    ["dark",  "🌙", "Oscuro",     "Ideal para sesiones nocturnas"],
                    ["auto",  "💻", "Automático", "Sigue al sistema operativo"],
                  ] as [Theme, string, string, string][]).map(([v, ic, l, hint]) => (
                    <div key={v} className={`theme-card${theme===v?" selected":""}`} onClick={() => setTheme(v)} title={hint}>
                      <div style={{ fontSize:26, marginBottom:6 }}>{ic}</div>
                      <div className="tc-label">{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:14, padding:"12px 14px", borderRadius:12, background:"var(--surface)", border:"1px solid var(--border-light)", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:14 }}>{theme==="light"?"☀️":theme==="dark"?"🌙":"💻"}</span>
                  <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-secondary)" }}>
                    {theme==="light" ? "Modo claro activo" : theme==="dark" ? "Modo oscuro activo" : "Siguiendo preferencia del sistema"}
                  </span>
                  <span style={{ marginLeft:"auto", fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--accent)", fontWeight:500, background:"var(--accent-bg)", padding:"2px 8px", borderRadius:20 }}>Activo</span>
                </div>
              </CardSection>
              <CardSection>
                <SecTitle>Color de acento</SecTitle>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
                  {ACCENT_PALETTE.map(({ color, name }) => (
                    <div key={color} className={`acc-swatch${accentColor===color?" selected":""}`} style={{ background:color }} onClick={() => setAccentColor(color)} title={name} />
                  ))}
                </div>
                <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:20, height:20, borderRadius:6, background:accentColor, flexShrink:0 }} />
                  <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-secondary)" }}>
                    {ACCENT_PALETTE.find(p => p.color===accentColor)?.name ?? "Personalizado"} · {accentColor}
                  </span>
                </div>
                <div style={{ marginTop:14, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  <button style={{ background:"var(--accent)", color:"#fff", border:"none", padding:"6px 14px", borderRadius:8, fontFamily:"var(--font-dm-sans)", fontSize:12, cursor:"default" }}>Botón primario</button>
                  <span style={{ background:"var(--accent-bg)", color:"var(--accent)", padding:"4px 10px", borderRadius:20, fontFamily:"var(--font-dm-sans)", fontSize:12 }}>Badge activo</span>
                  <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--accent)", fontWeight:600 }}>Enlace</span>
                </div>
              </CardSection>
              <CardSection>
                <SecTitle>Idioma y formato</SecTitle>
                <Field label="Idioma">
                  <select style={inputStyle} value={lang} onChange={e => setLang(e.target.value)}>
                    <option value="es-MX">Español (México)</option>
                    <option value="es-ES">Español (España)</option>
                    <option value="es-AR">Español (Argentina)</option>
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </Field>
                <div className="cfg-grid-2">
                  <Field label="Formato de fecha">
                    <select style={inputStyle} value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
                      <option>DD/MM/AAAA</option>
                      <option>MM/DD/AAAA</option>
                      <option>AAAA-MM-DD</option>
                    </select>
                  </Field>
                  <Field label="Formato de hora">
                    <select style={inputStyle} value={timeFormat} onChange={e => setTimeFormat(e.target.value)}>
                      <option>12 horas (AM/PM)</option>
                      <option>24 horas</option>
                    </select>
                  </Field>
                </div>
                <div style={{ padding:"10px 14px", borderRadius:10, background:"var(--accent-bg)", border:"1px solid var(--accent-light)", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14 }}>💡</span>
                  <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--accent)" }}>
                    Los cambios se aplican en tiempo real. Presiona "Guardar cambios" para sincronizarlos en todos tus dispositivos.
                  </span>
                </div>
              </CardSection>
            </>
          )}

          {/* ── INTEGRACIONES ── */}
          {section === "integraciones" && (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {INTEGRATIONS.map(t => (
                  <div key={t.key} className="card integ-card">
                    <div style={{ width:48, height:48, borderRadius:14, background:`${t.color}16`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{t.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:2 }}>
                        <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:14, fontWeight:600, color:"var(--text-primary)" }}>{t.name}</div>
                        {t.badge && !integrations[t.key] && (
                          <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:10, color:"var(--text-muted)", background:"var(--surface)", padding:"2px 8px", borderRadius:20, border:"1px solid var(--border)" }}>{t.badge}</span>
                        )}
                      </div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)" }}>{t.desc}</div>
                    </div>
                    <div className="cfg-integ-actions">
                      {integrations[t.key] ? (
                        <>
                          <span style={{ background:"var(--green-bg)", color:"var(--green)", padding:"4px 12px", borderRadius:20, fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, display:"flex", alignItems:"center", gap:4 }}>✓ Conectado</span>
                          <button className="btn-g"
                            style={{ fontSize:12, padding:"6px 12px", color:"var(--red)", borderColor:"var(--red)", opacity:integLoading[t.key]?0.6:1 }}
                            onClick={() => handleDisconnect(t.key)} disabled={integLoading[t.key]}>
                            {integLoading[t.key] ? "..." : "Desconectar"}
                          </button>
                        </>
                      ) : (
                        <button className="btn-p"
                          style={{ fontSize:13, padding:"8px 16px", opacity:integLoading[t.key]?0.6:1, display:"flex", alignItems:"center", gap:6 }}
                          onClick={() => handleConnectGoogle(t.key)} disabled={integLoading[t.key]}>
                          {integLoading[t.key] ? "Redirigiendo..." : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
                                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                              Conectar con Google
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:24 }}>
                <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600 }}>Próximamente</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    { icon:"💳", name:"Stripe / Conekta",  desc:"Acepta pagos en línea de tus pacientes.",              color:"#7B6EA8" },
                    { icon:"💬", name:"WhatsApp Business", desc:"Envía recordatorios de citas y tests por WhatsApp.",    color:"#5C8A6E" },
                  ].map((t,i) => (
                    <div key={i} className="card" style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderRadius:14, opacity:0.55 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:`${t.color}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{t.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>{t.name}</div>
                        <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)" }}>{t.desc}</div>
                      </div>
                      <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", background:"var(--surface)", padding:"3px 10px", borderRadius:20, border:"1px solid var(--border)", whiteSpace:"nowrap" }}>Próximamente</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background:toast.ok?"var(--green)":"var(--red)", color:"#fff", padding:"12px 20px", borderRadius:12, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, boxShadow:"0 4px 16px rgba(0,0,0,.15)", zIndex:99, animation:"toastIn .3s ease" }}>
          <style>{`@keyframes toastIn{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          {toast.msg}
        </div>
      )}
    </div>
  );
}