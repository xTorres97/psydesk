// src/app/api/send-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId, patientEmail, patientName,
      psychologistId,
      // Test predefinido
      testId, testShortName,
      // Test personalizado
      customTestId, customTestShortName,
    } = body;

    const isCustom = !!customTestId;
    const token    = crypto.randomUUID();
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://psydesk.vercel.app";
    const link     = `${appUrl}/cuestionario/${token}`;

    if (isCustom) {
      // ── Test personalizado ────────────────────────────────────────────────
      const { error } = await supabase.from("custom_test_submissions").insert({
        psychologist_id: psychologistId,
        patient_id:      patientId,
        custom_test_id:  customTestId,
        test_short_name: customTestShortName,
        token,
        status:          "sent",
      });
      if (error) throw error;
    } else {
      // ── Test predefinido ──────────────────────────────────────────────────
      const { error } = await supabase.from("test_submissions").insert({
        psychologist_id: psychologistId,
        patient_id:      patientId,
        test_id:         testId,
        test_short_name: testShortName,
        token,
        status:          "sent",
      });
      if (error) throw error;
    }

    // ── Email al paciente ─────────────────────────────────────────────────
    const shortName = isCustom ? customTestShortName : testShortName;
    await resend.emails.send({
      from:    "PsyDesk <onboarding@resend.dev>",
      to:      patientEmail,
      subject: "Tu profesional te ha enviado un cuestionario",
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#F5F0EA;font-family:'Helvetica Neue',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EA;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" style="max-width:520px;background:#FFFDF9;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                <tr><td style="background:#8B7355;padding:28px 36px;">
                  <p style="margin:0;font-size:22px;font-weight:700;color:#FAF7F2;font-family:Georgia,serif;">PsyDesk</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#D4C5B0;">Plataforma de salud mental</p>
                </td></tr>
                <tr><td style="padding:36px;">
                  <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1C1917;font-family:Georgia,serif;">Hola, ${patientName} 👋</p>
                  <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.6;">Tu profesional de salud te ha enviado un cuestionario para completar. Solo toma unos minutos.</p>
                  <div style="text-align:center;margin-bottom:28px;">
                    <a href="${link}" style="display:inline-block;padding:14px 32px;background:#8B7355;color:#FAF7F2;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;">Completar cuestionario →</a>
                  </div>
                  <div style="background:#FAF7F2;border:1px solid #E8DFD0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                    <p style="margin:0;font-size:12px;color:#A8A29E;word-break:break-all;">Si el botón no funciona, copia este link: <br><a href="${link}" style="color:#8B7355;">${link}</a></p>
                  </div>
                  <p style="margin:0;font-size:12px;color:#A8A29E;line-height:1.6;">🔒 Tus respuestas son confidenciales y solo tu profesional puede verlas.</p>
                </td></tr>
                <tr><td style="background:#FAF7F2;padding:20px 36px;border-top:1px solid #E8DFD0;">
                  <p style="margin:0;font-size:12px;color:#A8A29E;">Este mensaje fue enviado porque tu profesional usa PsyDesk.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    return NextResponse.json({ success: true, token });
  } catch (e: any) {
    console.error("send-test error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}