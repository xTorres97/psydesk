"use client";

import { useThemeStore } from "@/stores/useThemeStore";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Bell, Moon, Sun, Menu, LogOut, Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function getTitulo(sexo: string | null | undefined): string {
  switch (sexo) {
    case "masculino": return "Dr.";
    case "femenino":  return "Dra.";
    case "psic":      return "Psic.";
    default:          return "";
  }
}

export function Topbar() {
  const { dark, toggle: toggleTheme } = useThemeStore();
  const { toggle: toggleSidebar }     = useSidebarStore();
  const { profile, signOut }          = useAuth();
  const [mounted,  setMounted]        = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", dark);
  }, [dark, mounted]);

  const titulo    = getTitulo((profile as any)?.sexo);
  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const displayName = firstName
    ? titulo ? `${titulo} ${firstName}` : firstName
    : "Doctor/a";

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const handleSignOut = async () => {
    setShowMenu(false);
    await signOut();
    router.push("/login");
  };

  const iconBtnStyle: React.CSSProperties = {
    width: 38, height: 38,
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 10, background: "var(--surface)",
    border: "1px solid var(--border)", color: "var(--text-secondary)",
    cursor: "pointer", transition: "all .15s",
  };

  return (
    <>
      <style>{`
        .topbar-hamburger { display: none; }
        @media (max-width: 768px) {
          .topbar-hamburger { display: flex; }
          .topbar-header { padding: 0 16px !important; }
        }
        .topbar-icon-btn:hover { background: var(--surface-2) !important; color: var(--text-primary) !important; }
        .topbar-avatar-menu {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: var(--bg-card); border: 1px solid var(--border-light);
          border-radius: 14px; padding: 6px;
          box-shadow: 0 8px 24px rgba(28,25,23,.12);
          min-width: 200px; z-index: 50;
          animation: menuIn .15s ease;
        }
        @keyframes menuIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .topbar-menu-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 9px; cursor: pointer;
          font-family: var(--font-dm-sans); font-size: 13px;
          color: var(--text-secondary); transition: all .12s;
          border: none; background: transparent; width: 100%; text-align: left;
        }
        .topbar-menu-item:hover { background: var(--surface); color: var(--text-primary); }
        .topbar-menu-item.danger:hover { background: var(--red-bg); color: var(--red); }
      `}</style>

      <header
        className="topbar-header flex items-center justify-between shrink-0 sticky top-0 z-10"
        style={{ height:70, background:"var(--bg-primary)", borderBottom:"1px solid var(--border-light)", zIndex:5, padding:"0 40px" }}
      >
        {/* Izquierda: hamburger + saludo */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div>
            <div style={{ fontFamily:"var(--font-lora)", fontSize:20, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.3px" }}>
              {getGreeting()}, {displayName} ✨
            </div>
            <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
              {getFormattedDate()}
            </div>
          </div>
        </div>

        {/* Derecha: acciones */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>

          {/* Notificaciones */}
          <button className="topbar-icon-btn" style={{ ...iconBtnStyle, position:"relative" }}>
            <Bell size={16} />
            <span style={{ position:"absolute", top:8, right:8, width:7, height:7, borderRadius:"50%", background:"var(--amber)", border:"2px solid var(--bg-primary)" }} />
          </button>

          {/* Feedback beta — megáfono */}
          <button
            className="topbar-icon-btn"
            onClick={() => router.push("/feedback")}
            title="Enviar feedback"
            style={iconBtnStyle}
          >
            <Megaphone size={16} />
          </button>

          {/* Tema */}
          {mounted && (
            <button
              className="topbar-icon-btn"
              onClick={toggleTheme}
              style={iconBtnStyle}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}

          {/* Avatar + menú desplegable */}
          <div style={{ position:"relative" }}>
            <button
              onClick={() => setShowMenu(o => !o)}
              style={{ width:38, height:38, borderRadius:10, background:"var(--accent-bg)", border:"1px solid var(--accent-light)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:600, color:"var(--accent)", overflow:"hidden" }}
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width:38, height:38, objectFit:"cover" }} />
                : initials
              }
            </button>

            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position:"fixed", inset:0, zIndex:49 }} />
                <div className="topbar-avatar-menu">
                  <div style={{ padding:"8px 12px 10px", borderBottom:"1px solid var(--border-light)", marginBottom:4 }}>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>
                      {titulo && <span style={{ color:"var(--text-muted)", marginRight:4 }}>{titulo}</span>}
                      {profile?.full_name ?? "—"}
                    </div>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginTop:2 }}>
                      {profile?.email ?? ""}
                    </div>
                  </div>
                  <button className="topbar-menu-item" onClick={() => { setShowMenu(false); router.push("/configuracion"); }}>
                    ⚙️ Configuración
                  </button>
                  {(profile as any)?.email === "jsetorres1997@gmail.com" && (
                    <button className="topbar-menu-item" onClick={() => { setShowMenu(false); router.push("/admin/feedback"); }}>
                      🛠 Panel de feedback
                    </button>
                  )}
                  <button className="topbar-menu-item danger" onClick={handleSignOut}>
                    <LogOut size={14} /> Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}