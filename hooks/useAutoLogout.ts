"use client";

/**
 * useAutoLogout
 * ─────────────────────────────────────────────────────────────────────────────
 * Lee las preferencias de seguridad del usuario desde Supabase (campo
 * `preferences.security.auto_logout` y `preferences.security.auto_logout_min`)
 * y, si están activas, detecta inactividad y cierra la sesión automáticamente.
 *
 * Montar en: src/app/dashboard/layout.tsx (o el layout raíz autenticado)
 *
 *   import { useAutoLogout } from "@/hooks/useAutoLogout";
 *   export default function DashboardLayout({ children }) {
 *     useAutoLogout();
 *     return <>{children}</>;
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

// Eventos que se consideran "actividad del usuario"
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
  "click",
];

export function useAutoLogout() {
  const router   = useRouter();
  const supabase = createClient();
  const { profile } = useAuth();

  // Referencia al timer para poder cancelarlo/reiniciarlo
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Referencia a la config para leerla dentro de los listeners sin recrearlos
  const configRef     = useRef<{ enabled: boolean; minutes: number }>({ enabled: false, minutes: 30 });
  // Para limpiar listeners al desmontar
  const cleanupRef    = useRef<(() => void) | null>(null);

  // ── Cerrar sesión ─────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [supabase, router]);

  // ── Reiniciar el timer cada vez que hay actividad ─────────────────────────
  const resetTimer = useCallback(() => {
    if (!configRef.current.enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const ms = configRef.current.minutes * 60 * 1000;
    timerRef.current = setTimeout(() => {
      logout();
    }, ms);
  }, [logout]);

  // ── Registrar / des-registrar listeners de actividad ─────────────────────
  const startListening = useCallback(() => {
    // Limpiar listeners anteriores si los había
    if (cleanupRef.current) cleanupRef.current();

    ACTIVITY_EVENTS.forEach(ev =>
      window.addEventListener(ev, resetTimer, { passive: true })
    );

    cleanupRef.current = () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, resetTimer));
    };

    // Arrancar el primer timer
    resetTimer();
  }, [resetTimer]);

  const stopListening = useCallback(() => {
    if (timerRef.current)   clearTimeout(timerRef.current);
    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = null;
  }, []);

  // ── Cargar preferencias desde Supabase y arrancar/detener según config ────
  useEffect(() => {
    if (!profile?.id) return;

    let cancelled = false;

    supabase
      .from("profiles")
      .select("preferences")
      .eq("id", profile.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;

        const sec = (data?.preferences as Record<string, any> | null)?.security;
        const enabled = sec?.auto_logout === true;
        const minutes = typeof sec?.auto_logout_min === "number" && sec.auto_logout_min > 0
          ? sec.auto_logout_min
          : 30;

        configRef.current = { enabled, minutes };

        if (enabled) {
          startListening();
        } else {
          stopListening();
        }
      });

    return () => {
      cancelled = true;
      stopListening();
    };
  }, [profile?.id]); // Re-carga si cambia el usuario

  // ── También reacciona a cambios en tiempo real de preferencias ────────────
  // Útil si el usuario activa/desactiva la opción sin recargar la página.
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`auto_logout_prefs_${profile.id}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "profiles",
          filter: `id=eq.${profile.id}`,
        },
        (payload) => {
          const sec = (payload.new as Record<string, any>)?.preferences?.security;
          if (!sec) return;

          const enabled = sec.auto_logout === true;
          const minutes = typeof sec.auto_logout_min === "number" && sec.auto_logout_min > 0
            ? sec.auto_logout_min
            : 30;

          configRef.current = { enabled, minutes };

          if (enabled) {
            startListening();
          } else {
            stopListening();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, startListening, stopListening, supabase]);
}