"use client";

import { useThemeStore } from "@/stores/useThemeStore";
import { useEffect, useState } from "react";
import { Search, Bell, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { dark, toggle } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", dark);
  }, [dark, mounted]);

  return (
    <header
      className="flex items-center justify-between shrink-0 sticky top-0 z-10"
    style={{
    height: 70,
    background: "var(--bg-primary)",
    borderBottom: "1px solid var(--border-light)",
    zIndex: 5,
    padding: "0 40px 0 40px",
    }}
    >
      {/* Saludo */}
      <div>
        <div
          className="text-xl font-semibold tracking-tight"
          style={{
            fontFamily: "var(--font-lora)",
            color: "var(--text-primary)",
          }}
        >
          Buenos días, Laura ✨
        </div>
        <div
          className="text-xs mt-0.5"
          style={{
            fontFamily: "var(--font-dm-sans)",
            color: "var(--text-muted)",
          }}
        >
          Miércoles, 7 de enero · 6 sesiones hoy
        </div>
      </div>
      {/* Acciones */}
      <div className="flex items-center gap-2">
        {/* Notificaciones */}
        <button
          className="relative flex items-center justify-center rounded-xl transition-all"
          style={{
            width: 38,
            height: 38,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <Bell size={16} />
          <span
            className="absolute rounded-full"
            style={{
              top: 8,
              right: 8,
              width: 7,
              height: 7,
              background: "var(--amber)",
              border: "2px solid var(--bg-primary)",
            }}
          />
        </button>

        {/* Dark mode */}
        {mounted && (
          <button
            onClick={toggle}
            className="flex items-center justify-center rounded-xl transition-all"
            style={{
              width: 38,
              height: 38,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}
      </div>
    </header>
  );
}