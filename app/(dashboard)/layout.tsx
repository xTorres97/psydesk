"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { ChevronLeft, ChevronRight } from "lucide-react";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { collapsed, toggle } = useSidebarStore();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Overlay móvil */}
      {!collapsed && (
        <div
          onClick={toggle}
          style={{
            display: "none",
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 40,
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar — en móvil es drawer */}
      <div className="sidebar-wrapper">
        <Sidebar />
      </div>

      {/* Botón colapsar — solo en PC/tablet */}
      <button
        onClick={toggle}
        className="collapse-btn absolute flex items-center justify-center rounded-full transition-all duration-300 z-50"
        style={{
          top: 20,
          left: collapsed ? 52 : 208,
          width: 22,
          height: 22,
          background: "var(--bg-sidebar-active)",
          color: "#A8A29E",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          transition: "left 0.3s ease",
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: "var(--bg-primary)" }}
        >
          <div className="main-content">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        /* PC y tablet — comportamiento normal */
        .sidebar-wrapper {
          position: relative;
          z-index: 30;
          flex-shrink: 0;
        }
        .collapse-btn { display: flex; }
        .mobile-overlay { display: none !important; }
        .main-content { padding: 28px 40px; }

        /* Móvil */
        @media (max-width: 768px) {
          .sidebar-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 45;
            transform: ${!collapsed ? "translateX(0)" : "translateX(-100%)"};
            transition: transform 0.25s ease;
          }
          .mobile-overlay {
            display: ${!collapsed ? "block" : "none"} !important;
          }
          .collapse-btn { display: none !important; }
          .main-content { padding: 16px; }
        }
      `}</style>
    </div>
  );
}