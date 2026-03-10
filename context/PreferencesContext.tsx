"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type Theme   = "light" | "dark" | "auto";
export type Density = "compact" | "normal" | "spacious";

export interface UserPreferences {
  theme:        Theme;
  accentColor:  string;
  density:      Density;
  lang:         string;
  dateFormat:   string;
  timeFormat:   string;
}

export interface Preferences extends UserPreferences {
  setTheme:       (t: Theme)   => void;
  setAccentColor: (c: string)  => void;
  setDensity:     (d: Density) => void;
  setLang:        (l: string)  => void;
  setDateFormat:  (f: string)  => void;
  setTimeFormat:  (f: string)  => void;
  saveToSupabase: (partial?: Partial<UserPreferences>) => Promise<void>;
}

const DEFAULTS: UserPreferences = {
  theme:       "light",
  accentColor: "#8B7355",
  density:     "normal",
  lang:        "es-MX",
  dateFormat:  "DD/MM/AAAA",
  timeFormat:  "12 horas (AM/PM)",
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
    const lr = Math.round(r + (255 - r) * 0.35);
    const lg = Math.round(g + (255 - g) * 0.35);
    const lb = Math.round(b + (255 - b) * 0.35);
    const br = Math.max(Math.round(r * 0.18), 20);
    const bg = Math.max(Math.round(g * 0.18), 18);
    const bb = Math.max(Math.round(b * 0.18), 14);
    html.style.setProperty("--accent",       hex);
    html.style.setProperty("--accent-light", `rgb(${lr},${lg},${lb})`);
    html.style.setProperty("--accent-bg",    `rgb(${br},${bg},${bb})`);
  } else {
    const lr = Math.round(r + (255 - r) * 0.45);
    const lg = Math.round(g + (255 - g) * 0.45);
    const lb = Math.round(b + (255 - b) * 0.45);
    const br = Math.round(r + (255 - r) * 0.82);
    const bg = Math.round(g + (255 - g) * 0.82);
    const bb = Math.round(b + (255 - b) * 0.82);
    html.style.setProperty("--accent",       hex);
    html.style.setProperty("--accent-light", `rgb(${lr},${lg},${lb})`);
    html.style.setProperty("--accent-bg",    `rgb(${br},${bg},${bb})`);
  }
}

const DENSITY_VARS: Record<Density, Record<string,string>> = {
  compact:  { "--density-padding":"12px 14px", "--density-gap":"10px", "--density-radius":"10px", "--density-font-base":"12px", "--density-row-pad":"8px 0"  },
  normal:   { "--density-padding":"20px 22px", "--density-gap":"16px", "--density-radius":"16px", "--density-font-base":"13px", "--density-row-pad":"12px 0" },
  spacious: { "--density-padding":"28px 30px", "--density-gap":"22px", "--density-radius":"20px", "--density-font-base":"14px", "--density-row-pad":"16px 0" },
};

// ─── Contexto ─────────────────────────────────────────────────────────────────
const PreferencesContext = createContext<Preferences>({
  ...DEFAULTS,
  setTheme:       () => {},
  setAccentColor: () => {},
  setDensity:     () => {},
  setLang:        () => {},
  setDateFormat:  () => {},
  setTimeFormat:  () => {},
  saveToSupabase: async () => {},
});

export function usePreferences() {
  return useContext(PreferencesContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme,       setThemeState]      = useState<Theme>(DEFAULTS.theme);
  const [accentColor, setAccentState]     = useState(DEFAULTS.accentColor);
  const [density,     setDensityState]    = useState<Density>(DEFAULTS.density);
  const [lang,        setLangState]       = useState(DEFAULTS.lang);
  const [dateFormat,  setDateFormatState] = useState(DEFAULTS.dateFormat);
  const [timeFormat,  setTimeFormatState] = useState(DEFAULTS.timeFormat);
  const [mounted,     setMounted]         = useState(false);

  const { profile } = useAuth();
  const supabase = createClient();

  // Cargar preferencias: primero localStorage (instantáneo), luego Supabase (fuente de verdad)
  useEffect(() => {
    // 1. localStorage como carga inmediata para evitar flash
    try {
      const t = localStorage.getItem("psy-theme")       as Theme   | null;
      const a = localStorage.getItem("psy-accent")      as string  | null;
      const d = localStorage.getItem("psy-density")     as Density | null;
      const l = localStorage.getItem("psy-lang")        as string  | null;
      const df= localStorage.getItem("psy-dateFormat")  as string  | null;
      const tf= localStorage.getItem("psy-timeFormat")  as string  | null;
      if (t)  setThemeState(t);
      if (a)  setAccentState(a);
      if (d)  setDensityState(d);
      if (l)  setLangState(l);
      if (df) setDateFormatState(df);
      if (tf) setTimeFormatState(tf);
    } catch {}
    setMounted(true);
  }, []);

  // 2. Una vez que tengamos el perfil, cargar desde Supabase (fuente de verdad)
  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("profiles")
      .select("preferences")
      .eq("id", profile.id)
      .single()
      .then(({ data }) => {
        const p = data?.preferences as Partial<UserPreferences> | null;
        if (!p) return;
        if (p.theme)       { setThemeState(p.theme);           localStorage.setItem("psy-theme", p.theme); }
        if (p.accentColor) { setAccentState(p.accentColor);    localStorage.setItem("psy-accent", p.accentColor); }
        if (p.density)     { setDensityState(p.density);       localStorage.setItem("psy-density", p.density); }
        if (p.lang)        { setLangState(p.lang);             localStorage.setItem("psy-lang", p.lang); }
        if (p.dateFormat)  { setDateFormatState(p.dateFormat); localStorage.setItem("psy-dateFormat", p.dateFormat); }
        if (p.timeFormat)  { setTimeFormatState(p.timeFormat); localStorage.setItem("psy-timeFormat", p.timeFormat); }
      });
  }, [profile?.id]);

  const resolveTheme = useCallback((t: Theme): "light" | "dark" => {
    if (t === "auto") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return t;
  }, []);

  // Aplicar tema + acento juntos
  useEffect(() => {
    if (!mounted) return;
    const html      = document.documentElement;
    const effective = resolveTheme(theme);
    const isDark    = effective === "dark";
    isDark ? html.classList.add("dark") : html.classList.remove("dark");
    applyAccentVars(accentColor, isDark);
  }, [theme, accentColor, mounted, resolveTheme]);

  // Aplicar densidad
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    Object.entries(DENSITY_VARS[density]).forEach(([k, v]) => html.style.setProperty(k, v));
    html.classList.remove("density-compact","density-normal","density-spacious");
    html.classList.add(`density-${density}`);
  }, [density, mounted]);

  // Guardar en Supabase — se llama explícitamente desde Configuración al presionar "Guardar"
  const saveToSupabase = async (partial?: Partial<UserPreferences>) => {
    if (!profile?.id) return;
    const current: UserPreferences = { theme, accentColor, density, lang, dateFormat, timeFormat };
    const merged = { ...current, ...partial };
    await supabase
      .from("profiles")
      .update({ preferences: merged })
      .eq("id", profile.id);
  };

  // Setters: actualizan estado + localStorage inmediatamente (sin esperar red)
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
  const setLang = (l: string) => {
    setLangState(l);
    try { localStorage.setItem("psy-lang", l); } catch {}
  };
  const setDateFormat = (f: string) => {
    setDateFormatState(f);
    try { localStorage.setItem("psy-dateFormat", f); } catch {}
  };
  const setTimeFormat = (f: string) => {
    setTimeFormatState(f);
    try { localStorage.setItem("psy-timeFormat", f); } catch {}
  };

  if (!mounted) return <>{children}</>;

  return (
    <PreferencesContext.Provider value={{
      theme, accentColor, density, lang, dateFormat, timeFormat,
      setTheme, setAccentColor, setDensity, setLang, setDateFormat, setTimeFormat,
      saveToSupabase,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}