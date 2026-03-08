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
      <Sidebar />

      {/* Botón de colapsar — vive entre el sidebar y el contenido */}
      <button
        onClick={toggle}
        className="absolute flex items-center justify-center rounded-full transition-all duration-300 z-50"
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
          style={{
            background: "var(--bg-primary)",
            padding: "28px 40px 28px 40px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}