// Restablece la cuenta demo con datos ficticios.
// - Vercel Cron la llama cada noche (ver vercel.json) con "Authorization: Bearer $CRON_SECRET".
// - También se puede llamar a mano: curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/demo/reset
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { seedDemo } from "@/lib/demo-seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  try {
    const result = await seedDemo(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("demo reset error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
