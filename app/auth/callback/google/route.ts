import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code     = searchParams.get("code");
  const error    = searchParams.get("error");
  const stateRaw = searchParams.get("state");

  // Leer el tipo de integración desde el state
  let integration: "calendar" | "meet" | "drive" | null = null;
  try {
    const state = stateRaw ? JSON.parse(decodeURIComponent(stateRaw)) : {};
    integration = state.integration ?? null;
  } catch {}

  if (error || !code || !integration) {
    return NextResponse.redirect(`${origin}/configuracion?section=integraciones&error=cancelled`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()     { return cookieStore.getAll(); },
        setAll(list) { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Intercambiar código por tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  `${origin}/auth/callback/google`,
      grant_type:    "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    console.error("Google token error:", tokenData);
    return NextResponse.redirect(`${origin}/configuracion?section=integraciones&error=token`);
  }

  const { access_token, refresh_token, expires_in } = tokenData;
  const token_expiry = new Date(Date.now() + expires_in * 1000).toISOString();

  const { error: dbError } = await supabase
    .from("integrations")
    .upsert({
      profile_id:    user.id,
      provider:      integration,
      connected:     true,
      status:        "connected",
      access_token,
      refresh_token: refresh_token ?? null,
      token_expiry,
      updated_at:    new Date().toISOString(),
    }, { onConflict: "profile_id,provider" });

  if (dbError) {
    console.error("DB error:", dbError);
    return NextResponse.redirect(`${origin}/configuracion?section=integraciones&error=db`);
  }

  return NextResponse.redirect(`${origin}/configuracion?section=integraciones&connected=${integration}`);
}