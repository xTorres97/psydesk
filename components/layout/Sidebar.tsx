"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarStore } from "@/stores/useSidebarStore";

const NAV_ITEMS = [
  { icon: "⊞", label: "Dashboard",   href: "/"            },
  { icon: "📅", label: "Agenda",      href: "/agenda"      },
  { icon: "👥", label: "Pacientes",   href: "/pacientes"   },
  { icon: "📂", label: "Expedientes", href: "/expedientes" },
  { icon: "🧪", label: "Tests",       href: "/tests"       },
  { icon: "📊", label: "Reportes",    href: "/reportes"    },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebarStore();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // En móvil el sidebar siempre muestra texto completo
  const showLabel = !collapsed;

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center",
    gap: 12, padding: "10px 14px", borderRadius: 10,
    cursor: "pointer", transition: "all .18s",
    fontFamily: "var(--font-dm-sans)", fontSize: 14,
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
          .sidebar-aside {
            width: 220px !important;
            min-width: 220px !important;
          }
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
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#C4A882,#8B7355)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🧠</div>
          {showLabel && <span style={{ fontFamily: "var(--font-lora)", fontSize: 18, fontWeight: 600, color: "#EDE8E0", letterSpacing: "-0.3px" }}>PsyDesk</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(n => (
            <Link
              key={n.href}
              href={n.href}
              style={{ textDecoration: "none" }}
              onClick={() => {
                // En móvil, cierra el drawer al navegar
                if (window.innerWidth <= 768) toggle();
              }}
            >
              <div
                style={navItemStyle(isActive(n.href))}
                onMouseEnter={e => { if (!isActive(n.href)) { (e.currentTarget as HTMLDivElement).style.background = "#292524"; (e.currentTarget as HTMLDivElement).style.color = "#E7E5E4"; } }}
                onMouseLeave={e => { if (!isActive(n.href)) { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "#A8A29E"; } }}
                title={collapsed ? n.label : ""}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
                {showLabel && n.label}
              </div>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <Link
            href="/configuracion"
            style={{ textDecoration: "none" }}
            onClick={() => { if (window.innerWidth <= 768) toggle(); }}
          >
            <div
              style={navItemStyle(pathname.startsWith("/configuracion"))}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#292524"; (e.currentTarget as HTMLDivElement).style.color = "#E7E5E4"; }}
              onMouseLeave={e => { if (!pathname.startsWith("/configuracion")) { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "#A8A29E"; } }}
            >
              <span style={{ fontSize: 16 }}>⚙️</span>
              {showLabel && "Configuración"}
            </div>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 0" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#C4A882,#8B7355)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FAF7F2", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-dm-sans)", flexShrink: 0 }}>DL</div>
            {showLabel && (
              <div>
                <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#EDE8E0", fontWeight: 500 }}>Dra. Laura</div>
                <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "#7A6A58" }}>Psicóloga clínica</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}