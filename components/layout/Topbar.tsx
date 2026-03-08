"use client";

import { useThemeStore } from "@/stores/useThemeStore";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useEffect, useState } from "react";
import { Bell, Moon, Sun, Menu } from "lucide-react";

export function Topbar() {
  const { dark, toggle: toggleTheme } = useThemeStore();
  const { toggle: toggleSidebar } = useSidebarStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", dark);
  }, [dark, mounted]);

  return (
    <>
      <style>{`
        .topbar-hamburger { display: none; }
        @media (max-width: 768px) {
          .topbar-hamburger { display: flex; }
          .topbar-header { padding: 0 16px !important; }
        }
      `}</style>

      <header
        className="topbar-header flex items-center justify-between shrink-0 sticky top-0 z-10"
        style={{
          height: 70,
          background: "var(--bg-primary)",
          borderBottom: "1px solid var(--border-light)",
          zIndex: 5,
          padding: "0 40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Hamburguesa — solo móvil */}
          <button
            className="topbar-hamburger items-center justify-center rounded-xl transition-all"
            onClick={toggleSidebar}
            style={{
              width: 38, height: 38,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <Menu size={16} />
          </button>

          {/* Saludo */}
          <div>
            <div
              style={{ fontFamily: "var(--font-lora)", fontSize: 20, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.3px" }}
            >
              Buenos días, Laura ✨
            </div>
            <div
              style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}
            >
              Miércoles, 7 de enero · 6 sesiones hoy
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            style={{ position: "relative", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}
          >
            <Bell size={16} />
            <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: "var(--amber)", border: "2px solid var(--bg-primary)" }} />
          </button>

          {mounted && (
            <button
              onClick={toggleTheme}
              style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
        </div>
      </header>
    </>
  );
}