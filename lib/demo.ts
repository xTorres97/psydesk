// Modo demo: una cuenta pública con datos ficticios para el portafolio.
// La cuenta demo puede navegar y editar, pero no envía emails, no conecta
// integraciones externas y tiene límite de uso de la IA.

export const DEMO_EMAIL =
  process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "demo@psydesk.app";

// La contraseña es pública a propósito (la usa el botón "Probar demo").
export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

export const DEMO_ENABLED = DEMO_PASSWORD.length > 0;

/** Máximo de mensajes por conversación con la IA en modo demo. */
export const DEMO_AI_MAX_MESSAGES = 12;

export function isDemoEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === DEMO_EMAIL.toLowerCase();
}
