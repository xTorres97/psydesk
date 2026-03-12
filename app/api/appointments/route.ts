// src/app/api/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);
const TZ = "America/Caracas";

// ─── Helpers Google Calendar ──────────────────────────────────────────────────
async function getGoogleToken(psychologistId: string): Promise<string | null> {
  const { data } = await supabase
    .from("integrations")
    .select("access_token, refresh_token, token_expiry")
    .eq("profile_id", psychologistId)
    .eq("provider", "calendar")
    .eq("connected", true)
    .single();

  if (!data) return null;

  const expiry = new Date(data.token_expiry);
  if (expiry <= new Date()) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: data.refresh_token,
        grant_type:    "refresh_token",
      }),
    });
    const json = await res.json();
    if (!json.access_token) return null;
    const newExpiry = new Date(Date.now() + json.expires_in * 1000).toISOString();
    await supabase.from("integrations")
      .update({ access_token: json.access_token, token_expiry: newExpiry })
      .eq("profile_id", psychologistId)
      .eq("provider", "calendar");
    return json.access_token;
  }
  return data.access_token;
}

async function createGoogleEvent(token: string, appt: any): Promise<string | null> {
  const modalityLabel = appt.modality === "videollamada" ? "Videollamada" : appt.modality === "telefono" ? "Teléfono" : "Presencial";
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary:     `Sesión — ${appt.patientName}`,
      description: `${modalityLabel}${appt.notes ? `\n\nNota: ${appt.notes}` : ""}`,
      start: { dateTime: appt.start_time, timeZone: TZ },
      end:   { dateTime: appt.end_time,   timeZone: TZ },
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
    }),
  });
  const json = await res.json();
  return json.id ?? null;
}

// Al cancelar: actualiza el título del evento con "❌ Cancelada —" en lugar de borrarlo
async function markGoogleEventCancelled(token: string, eventId: string, patientName: string): Promise<void> {
  // Primero obtenemos el evento actual para no perder datos
  const getRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const existing = await getRes.json();
  if (!existing.id) return;

  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary:     `❌ Cancelada — ${patientName}`,
      colorId:     "11", // rojo en Google Calendar
      description: (existing.description ?? "") + "\n\n[CITA CANCELADA]",
    }),
  });
}

async function markGoogleEventDone(token: string, eventId: string, patientName: string): Promise<void> {
  const getRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const existing = await getRes.json();
  if (!existing.id) return;
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: `✅ Completada — ${patientName}`,
      colorId: "10", // verde en Google Calendar
      description: (existing.description ?? "") + "\n\n[SESIÓN COMPLETADA]",
    }),
  });
}

async function markGoogleEventNoShow(token: string, eventId: string, patientName: string): Promise<void> {
  const getRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const existing = await getRes.json();
  if (!existing.id) return;
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: `😶 No asistió — ${patientName}`,
      colorId: "6", // gris en Google Calendar
      description: (existing.description ?? "") + "\n\n[PACIENTE NO ASISTIÓ]",
    }),
  });
}

async function updateGoogleEvent(token: string, eventId: string, appt: any): Promise<void> {
  const modalityLabel = appt.modality === "videollamada" ? "Videollamada" : appt.modality === "telefono" ? "Teléfono" : "Presencial";
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary:     `Sesión — ${appt.patientName}`,
      description: `${modalityLabel}${appt.notes ? `\n\nNota: ${appt.notes}` : ""}`,
      start: { dateTime: appt.start_time, timeZone: TZ },
      end:   { dateTime: appt.end_time,   timeZone: TZ },
    }),
  });
}

// ─── Email al paciente ────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });
}

async function sendAppointmentEmail(to: string, patientName: string, action: "created" | "updated" | "cancelled", appt: any) {
  const modalityLabel = appt.modality === "videollamada" ? "📹 Videollamada" : appt.modality === "telefono" ? "📞 Teléfono" : "🏢 Presencial";
  const subjects = {
    created:   "Confirmación de tu cita",
    updated:   "Tu cita ha sido actualizada",
    cancelled: "Tu cita ha sido cancelada",
  };
  const headerColor = action === "cancelled" ? "#B5594A" : "#8B7355";
  const bodyHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#F5F0EA;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EA;padding:40px 20px;">
        <tr><td align="center">
          <table width="100%" style="max-width:520px;background:#FFFDF9;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <tr><td style="background:${headerColor};padding:28px 36px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#FAF7F2;font-family:Georgia,serif;">PsyDesk</p>
              <p style="margin:4px 0 0;font-size:13px;color:#D4C5B0;">Plataforma de salud mental</p>
            </td></tr>
            <tr><td style="padding:36px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1C1917;font-family:Georgia,serif;">
                ${action === "created" ? `Hola, ${patientName} 👋` : action === "updated" ? `Actualización de cita` : `Cita cancelada`}
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.6;">
                ${action === "created"
                  ? "Tu profesional de salud ha agendado una cita contigo. Aquí están los detalles:"
                  : action === "updated"
                  ? "Los detalles de tu cita han sido actualizados:"
                  : `Tu cita ha sido cancelada${appt.cancel_reason ? `. Motivo: ${appt.cancel_reason}` : "."}`}
              </p>
              ${action !== "cancelled" ? `
              <div style="background:#FAF7F2;border:1px solid #E8DFD0;border-radius:12px;padding:20px;margin-bottom:28px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:12px;color:#A8A29E;width:100px;">📅 Fecha</td>
                    <td style="padding:6px 0;font-size:14px;color:#1C1917;font-weight:500;">${fmtDate(appt.start_time)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:12px;color:#A8A29E;">⏰ Horario</td>
                    <td style="padding:6px 0;font-size:14px;color:#1C1917;font-weight:500;">${fmtTime(appt.start_time)} – ${fmtTime(appt.end_time)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:12px;color:#A8A29E;">📍 Modalidad</td>
                    <td style="padding:6px 0;font-size:14px;color:#1C1917;font-weight:500;">${modalityLabel}</td>
                  </tr>
                </table>
              </div>` : ""}
              <p style="margin:0;font-size:12px;color:#A8A29E;line-height:1.6;">
                Si tienes dudas, contacta directamente a tu profesional de salud.
              </p>
            </td></tr>
            <tr><td style="background:#FAF7F2;padding:20px 36px;border-top:1px solid #E8DFD0;">
              <p style="margin:0;font-size:12px;color:#A8A29E;">Este mensaje fue enviado porque tu profesional usa PsyDesk.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  await resend.emails.send({
    from:    "PsyDesk <onboarding@resend.dev>",
    to,
    subject: subjects[action],
    html:    bodyHtml,
  });
}

// ─── POST — Crear cita ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { psychologistId, patientId, patientName, patientEmail, start_time, end_time, modality, notes, type, title } = body;

    // 1. Guardar en Supabase
    const { data: appt, error } = await supabase.from("appointments").insert({
      psychologist_id: psychologistId,
      patient_id:      patientId,
      title:           title || `Sesión — ${patientName}`,
      start_time,
      end_time,
      modality:        modality || "presencial",
      type:            type || "sesion",
      status:          "programada",
      notes,
    }).select().single();

    if (error) throw error;

    // 2. Sync Google Calendar
    const token = await getGoogleToken(psychologistId);
    if (token) {
      const eventId = await createGoogleEvent(token, { ...appt, patientName, start_time, end_time });
      if (eventId) await supabase.from("appointments").update({ google_event_id: eventId }).eq("id", appt.id);
    }

    // 3. Email al paciente
    if (patientEmail) {
      await sendAppointmentEmail(patientEmail, patientName, "created", { ...appt, start_time, end_time });
    }

    return NextResponse.json({ success: true, appointment: appt });
  } catch (e: any) {
    console.error("Error creando cita:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── PUT — Editar / Reagendar / Cancelar cita ─────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, psychologistId, patientName, patientEmail, start_time, end_time, modality, notes, type, title, status, cancel_reason } = body;

    // 1. Obtener google_event_id actual
    const { data: existing } = await supabase
      .from("appointments")
      .select("google_event_id")
      .eq("id", id)
      .single();

    const googleEventId = existing?.google_event_id ?? null;

    // 2. Actualizar en Supabase
    const updateData: any = { updated_at: new Date().toISOString() };
    if (modality !== undefined)      updateData.modality      = modality;
    if (notes !== undefined)         updateData.notes         = notes;
    if (type !== undefined)          updateData.type          = type;
    if (title !== undefined)         updateData.title         = title;
    if (start_time !== undefined)    updateData.start_time    = start_time;
    if (end_time !== undefined)      updateData.end_time      = end_time;
    if (status !== undefined)        updateData.status        = status;
    if (cancel_reason !== undefined) updateData.cancel_reason = cancel_reason;

    const { error } = await supabase.from("appointments").update(updateData).eq("id", id);
    if (error) throw error;

    // 3. Sync Google Calendar
    const token = await getGoogleToken(psychologistId);
    if (token && googleEventId) {
      if (status === "cancelada") {
        await markGoogleEventCancelled(token, googleEventId, patientName);
      } else if (status === "completada") {
        await markGoogleEventDone(token, googleEventId, patientName);
      } else if (status === "no_asistio") {
        await markGoogleEventNoShow(token, googleEventId, patientName);
      } else if (start_time || end_time || modality || notes !== undefined) {
        await updateGoogleEvent(token, googleEventId, { patientName, start_time, end_time, modality, notes });
      }
    }

    // 4. Email al paciente solo en cancelación o reagendamiento
    if (patientEmail && (status === "cancelada" || (start_time && status !== "completada" && status !== "no_asistio"))) {
      const action = status === "cancelada" ? "cancelled" : "updated";
      await sendAppointmentEmail(patientEmail, patientName, action, { start_time, end_time, modality, cancel_reason });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Error editando cita:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}