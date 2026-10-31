"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const REPO_URL = "https://github.com/xTorres97/psydesk";

const COPY = {
  es: { label: "Modo demo", text: "Datos ficticios · se restablece cada día · no se envían emails", code: "Ver código" },
  en: { label: "Demo mode", text: "Sample data · resets daily · no emails are sent", code: "View code" },
};

/** Barra fina que avisa que se está usando la cuenta pública de demo. */
export function DemoBanner() {
  const { isDemo } = useAuth();
  // Solo se muestra en el cliente (isDemo es false en el servidor), así que leer navigator aquí es seguro
  const [lang] = useState<"es" | "en">(() =>
    typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("es") ? "en" : "es"
  );

  if (!isDemo) return null;
  const t = COPY[lang];

  return (
    <div
      role="status"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap",
        padding: "6px 16px", background: "var(--accent)", color: "#faf7f2",
        fontFamily: "var(--font-dm-sans)", fontSize: 12, lineHeight: 1.4, textAlign: "center",
      }}
    >
      <strong style={{ fontWeight: 600, letterSpacing: ".3px", textTransform: "uppercase", fontSize: 11 }}>{t.label}</strong>
      <span style={{ opacity: 0.9 }}>{t.text}</span>
      <a href={REPO_URL} target="_blank" rel="noreferrer" style={{ color: "#faf7f2", textDecoration: "underline", textUnderlineOffset: 2 }}>
        {t.code} ↗
      </a>
    </div>
  );
}
