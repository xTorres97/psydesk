import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()        { return cookieStore.getAll(); },
          setAll(list)    { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;

      // Sincronizar perfil (cubre Google y cualquier proveedor OAuth)
      await supabase.from("profiles").upsert({
        id:         user.id,
        full_name:  user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        email:      user.email ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      }, { onConflict: "id" });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Error → redirigir a login con mensaje
  return NextResponse.redirect(`${origin}/login?error=auth`);
}