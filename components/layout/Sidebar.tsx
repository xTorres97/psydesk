"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, CalendarDays, Users, FolderOpen,
  ClipboardList, BarChart2, Sparkles, Settings, Brain,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: <LayoutDashboard size={17} />, label: "Dashboard",    href: "/dashboard"                },
  { icon: <CalendarDays    size={17} />, label: "Agenda",       href: "/dashboard/agenda"         },
  { icon: <Users           size={17} />, label: "Pacientes",    href: "/dashboard/pacientes"      },
  { icon: <FolderOpen      size={17} />, label: "Expedientes",  href: "/dashboard/expedientes"    },
  { icon: <ClipboardList   size={17} />, label: "Tests",        href: "/dashboard/tests"          },
  { icon: <BarChart2       size={17} />, label: "Reportes",     href: "/dashboard/reportes"       },
  { icon: <Sparkles        size={17} />, label: "Asistente IA", href: "/dashboard/asistente", badge: true },
];

function getTitulo(sexo: string | null | undefined): string {
  switch (sexo) {
    case "masculino": return "Dr.";
    case "femenino":  return "Dra.";
    case "psic":      return "Psic.";
    default:          return "";
  }
}

export function Sidebar() {
  const { collapsed, toggle } = useSidebarStore();
  const { profile } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const showLabel = !collapsed;

  const titulo    = getTitulo((profile as any)?.sexo);
  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const specialty = profile?.specialty ?? "Psicólogo/a clínico/a";
  const initials  = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center",
    gap: 10, padding: "9px 12px", borderRadius: 10,
    cursor: "pointer", transition: "all .18s",
    fontFamily: "var(--font-dm-sans)", fontSize: 13,
    border: "1px solid transparent",
    justifyContent: collapsed ? "center" : "flex-start",
    background: active ? "#3B3330" : "transparent",
    color: active ? "#E7E5E4" : "#A8A29E",
    borderColor: active ? "rgba(196,168,130,.15)" : "transparent",
    whiteSpace: "nowrap",
  });

  return (
    <>
      <style>{`
        .sidebar-aside {
          width: ${collapsed ? 64 : 220}px;
          min-width: ${collapsed ? 64 : 220}px;
        }
        @media (max-width: 768px) {
          .sidebar-aside { width: 220px !important; min-width: 220px !important; }
        }
      `}</style>

      <aside
        className="sidebar-aside"
        style={{
          background: "var(--bg-sidebar)",
          display: "flex", flexDirection: "column",
          padding: "20px 10px",
          transition: "all .25s",
          borderRight: "1px solid rgba(255,255,255,.04)",
          height: "100vh",
          overflow: "hidden",
          zIndex: 20,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "4px 8px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#C4A882,#8B7355)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#FAF7F2" }}>
            <Brain size={17} />
          </div>
          {showLabel && <span style={{ fontFamily: "var(--font-lora)", fontSize: 18, fontWeight: 600, color: "#EDE8E0", letterSpacing: "-0.3px" }}>PsyDesk</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(n => (
            <Link key={n.href} href={n.href} style={{ textDecoration: "none" }}
              onClick={() => { if (window.innerWidth <= 768) toggle(); }}>
              <div
                style={navItemStyle(isActive(n.href))}
                onMouseEnter={e => { if (!isActive(n.href)) { (e.currentTarget as HTMLDivElement).style.background = "#292524"; (e.currentTarget as HTMLDivElement).style.color = "#E7E5E4"; } }}
                onMouseLeave={e => { if (!isActive(n.href)) { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "#A8A29E"; } }}
                title={collapsed ? n.label : ""}
              >
                <span style={{ flexShrink: 0, display: "flex" }}>{n.icon}</span>
                {showLabel && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    {n.label}
                    {n.badge && (
                      <span style={{ fontSize: 9, background: "linear-gradient(135deg,#C4A882,#8B7355)", color: "#FAF7F2", padding: "1px 5px", borderRadius: 4, fontWeight: 600, letterSpacing: "0.3px" }}>IA</span>
                    )}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/dashboard/configuracion" style={{ textDecoration: "none" }}
            onClick={() => { if (window.innerWidth <= 768) toggle(); }}>
            <div
              style={navItemStyle(pathname.startsWith("/dashboard/configuracion"))}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#292524"; (e.currentTarget as HTMLDivElement).style.color = "#E7E5E4"; }}
              onMouseLeave={e => { if (!pathname.startsWith("/dashboard/configuracion")) { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "#A8A29E"; } }}
            >
              <span style={{ flexShrink: 0, display: "flex" }}><Settings size={17} /></span>
              {showLabel && "Configuración"}
            </div>
          </Link>

          {/* Perfil del profesional */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 0" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#C4A882,#8B7355)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FAF7F2", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-dm-sans)", flexShrink: 0, overflow: "hidden" }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: 34, height: 34, objectFit: "cover" }} />
                : initials
              }
            </div>
            {showLabel && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#EDE8E0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {titulo && <span style={{ color: "#7A6A58", marginRight: 3 }}>{titulo}</span>}
                  {firstName || "—"}
                </div>
                <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "#7A6A58", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {specialty}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}