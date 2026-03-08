"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme   = "light" | "dark" | "auto";
export type Density = "compact" | "normal" | "spacious";

export interface Preferences {
  theme:       Theme;
  accentColor: string;
  density:     Density;
  setTheme:       (t: Theme)   => void;
  setAccentColor: (c: string)  => void;
  setDensity:     (d: Density) => void;
}

const DEFAULTS = {
  theme:       "light" as Theme,
  accentColor: "#8B7355",
  density:     "normal" as Density,
};

// ─── Helpers de color ─────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return { r, g, b };
}

function applyAccentVars(hex: string, isDark: boolean) {
  const { r, g, b } = hexToRgb(hex);
  const html = document.documentElement;

  if (isDark) {
    // Dark: accent-light = mezcla con blanco 35%
    const lr = Math.round(r + (255 - r) * 0.35);
    const lg = Math.round(g + (255 - g) * 0.35);
    const lb = Math.round(b + (255 - b) * 0.35);
    // Dark: accent-bg = muy oscuro, apenas perceptible sobre bg-card (#1f1c18)
    const br = Math.max(Math.round(r * 0.18), 20);
    const bg = Math.max(Math.round(g * 0.18), 18);
    const bb = Math.max(Math.round(b * 0.18), 14);

    html.style.setProperty("--accent",       hex);
    html.style.setProperty("--accent-light", `rgb(${lr},${lg},${lb})`);
    html.style.setProperty("--accent-bg",    `rgb(${br},${bg},${bb})`);
  } else {
    // Light: accent-light = mezcla con blanco 45%
    const lr = Math.round(r + (255 - r) * 0.45);
    const lg = Math.round(g + (255 - g) * 0.45);
    const lb = Math.round(b + (255 - b) * 0.45);
    // Light: accent-bg = muy suave, casi blanco con tinte
    const br = Math.round(r + (255 - r) * 0.82);
    const bg = Math.round(g + (255 - g) * 0.82);
    const bb = Math.round(b + (255 - b) * 0.82);

    html.style.setProperty("--accent",       hex);
    html.style.setProperty("--accent-light", `rgb(${lr},${lg},${lb})`);
    html.style.setProperty("--accent-bg",    `rgb(${br},${bg},${bb})`);
  }
}

// ─── Densidad ─────────────────────────────────────────────────────────────────
const DENSITY_VARS: Record<Density, Record<string,string>> = {
  compact: {
    "--density-padding":   "12px 14px",
    "--density-gap":       "10px",
    "--density-radius":    "10px",
    "--density-font-base": "12px",
    "--density-row-pad":   "8px 0",
  },
  normal: {
    "--density-padding":   "20px 22px",
    "--density-gap":       "16px",
    "--density-radius":    "16px",
    "--density-font-base": "13px",
    "--density-row-pad":   "12px 0",
  },
  spacious: {
    "--density-padding":   "28px 30px",
    "--density-gap":       "22px",
    "--density-radius":    "20px",
    "--density-font-base": "14px",
    "--density-row-pad":   "16px 0",
  },
};

// ─── Contexto ─────────────────────────────────────────────────────────────────
const PreferencesContext = createContext<Preferences>({
  ...DEFAULTS,
  setTheme:       () => {},
  setAccentColor: () => {},
  setDensity:     () => {},
});

export function usePreferences() {
  return useContext(PreferencesContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme,       setThemeState]   = useState<Theme>(DEFAULTS.theme);
  const [accentColor, setAccentState]  = useState(DEFAULTS.accentColor);
  const [density,     setDensityState] = useState<Density>(DEFAULTS.density);
  const [mounted,     setMounted]      = useState(false);

  // Cargar localStorage al montar
  useEffect(() => {
    try {
      const t = localStorage.getItem("psy-theme")   as Theme   | null;
      const a = localStorage.getItem("psy-accent")  as string  | null;
      const d = localStorage.getItem("psy-density") as Density | null;
      if (t) setThemeState(t);
      if (a) setAccentState(a);
      if (d) setDensityState(d);
    } catch {}
    setMounted(true);
  }, []);

  const resolveTheme = useCallback((t: Theme): "light" | "dark" => {
    if (t === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return t;
  }, []);

  // ─── UN SOLO efecto: tema + acento juntos ─────────────────────────────────
  // Crítico: se deben aplicar en el mismo efecto para que isDark sea correcto
  // cuando calculamos accent-bg. Si fueran dos efectos separados, el segundo
  // podría ejecutarse antes de que el DOM refleje la clase .dark.
  useEffect(() => {
    if (!mounted) return;

    const html      = document.documentElement;
    const effective = resolveTheme(theme);
    const isDark    = effective === "dark";

    // 1. Aplicar/quitar clase .dark primero
    if (isDark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }

    // 2. Calcular accent vars sabiendo exactamente si es dark o no
    applyAccentVars(accentColor, isDark);

  }, [theme, accentColor, mounted, resolveTheme]);

  // ─── Densidad ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    Object.entries(DENSITY_VARS[density]).forEach(([k, v]) => html.style.setProperty(k, v));
    html.classList.remove("density-compact","density-normal","density-spacious");
    html.classList.add(`density-${density}`);
  }, [density, mounted]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("psy-theme", t); } catch {}
  };
  const setAccentColor = (c: string) => {
    setAccentState(c);
    try { localStorage.setItem("psy-accent", c); } catch {}
  };
  const setDensity = (d: Density) => {
    setDensityState(d);
    try { localStorage.setItem("psy-density", d); } catch {}
  };

  if (!mounted) return <>{children}</>;

  return (
    <PreferencesContext.Provider value={{ theme, accentColor, density, setTheme, setAccentColor, setDensity }}>
      {children}
    </PreferencesContext.Provider>
  );
}