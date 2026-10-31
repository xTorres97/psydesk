import { createClient } from "@/lib/supabase/server";
import { isDemoEmail } from "@/lib/demo";

export interface SessionUser {
  id: string;
  email: string | null;
  isDemo: boolean;
}

/**
 * Devuelve el usuario autenticado a partir de la cookie de sesión.
 * Las rutas de API deben usar SIEMPRE este id, nunca uno enviado en el body.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null, isDemo: isDemoEmail(user.email) };
}
