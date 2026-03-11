// src/app/api/send-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // necesitas agregar esta variable
);

export async function POST(req: NextRequest) {
  try {
    const { patientId, patientEmail, patientName, testId, testShortName, psychologistId } = await req.json();

    if (!patientId || !patientEmail || !testId || !psychologistId) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Generar token único
    const token = randomBytes(32).toString("hex");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const testUrl = `${appUrl}/cuestionario/${token}`;

    // Guardar en Supabase
    const { error: dbError } = await supabase.from("test_submissions").insert({
      psychologist_id: psychologistId,
      patient_id:      patientId,
      test_id:         testId,
      test_short_name: testShortName,
      token,
      status:          "sent",
    });

    if (dbError) throw dbError;

    // Enviar email con Resend — sin mencionar el nombre del test
    const { error: emailError } = await resend.emails.send({
      from: "PsyDesk <onboarding@resend.dev>",
      to:   patientEmail,
      subject: "Tu profesional de salud te ha enviado un cuestionario",
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#F5F0EA;font-family:'Helvetica Neue',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EA;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" style="max-width:520px;background:#FFFDF9;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background:#8B7355;padding:28px 36px;">
                    <p style="margin:0;font-size:22px;font-weight:700;color:#FAF7F2;letter-spacing:-0.3px;">PsyDesk</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#D4C5B0;">Plataforma de salud mental</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:36px;">
                    <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1C1917;font-family:Georgia,serif;">Hola, ${patientName} 👋</p>
                    <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.6;">
                      Tu profesional de salud te ha enviado un cuestionario breve para completar. 
                      Solo toma unos minutos y nos ayudará a darte una mejor atención.
                    </p>
                    <div style="background:#FAF7F2;border:1px solid #E8DFD0;border-radius:12px;padding:20px;margin-bottom:28px;">
                      <p style="margin:0 0 6px;font-size:12px;color:#A8A29E;text-transform:uppercase;letter-spacing:0.5px;">Lo que debes saber</p>
                      <ul style="margin:0;padding:0 0 0 18px;font-size:14px;color:#57534E;line-height:1.8;">
                        <li>El cuestionario es completamente confidencial</li>
                        <li>Solo tu profesional podrá ver tus respuestas</li>
                        <li>El link es de uso único — expira al completarlo</li>
                      </ul>
                    </div>
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${testUrl}" style="display:inline-block;background:#8B7355;color:#FAF7F2;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:-0.2px;box-shadow:0 2px 8px rgba(139,115,85,0.35);">
                            Completar cuestionario →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:24px 0 0;font-size:12px;color:#A8A29E;text-align:center;">
                      O copia este enlace en tu navegador:<br>
                      <span style="color:#8B7355;word-break:break-all;">${testUrl}</span>
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#FAF7F2;padding:20px 36px;border-top:1px solid #E8DFD0;">
                    <p style="margin:0;font-size:12px;color:#A8A29E;line-height:1.6;">
                      Este mensaje fue enviado porque tu profesional de salud usa PsyDesk. 
                      Si tienes dudas, consulta directamente con tu psicólogo/a.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    if (emailError) throw emailError;

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    console.error("Error enviando test:", error);
    return NextResponse.json({ error: error.message ?? "Error interno" }, { status: 500 });
  }
}