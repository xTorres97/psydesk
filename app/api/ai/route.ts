// src/app/api/ai/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI   = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TZ = "America/Caracas";
function toISO(d: Date) { return d.toLocaleDateString("en-CA", { timeZone: TZ }); }
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-VE", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit", timeZone: TZ });
}

// Idéntico al de Topbar, ConfiguracionView y AiPanel
function getTitulo(sexo: string | null | undefined): string {
  if (sexo === "masculino") return "Dr.";
  if (sexo === "femenino")  return "Dra.";
  if (sexo === "psic")      return "Psic.";
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const { messages, psychologistId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages requerido" }, { status: 400 });
    }

    // ── Fetch datos reales en paralelo ────────────────────────────────────────
    const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString();

    const [
      { data: profile },
      { data: patients },
      { data: upcomingAppts },
      { data: recentNotes },
      { data: pendingTests },
    ] = await Promise.all([
      supabase.from("profiles")
        .select("full_name, specialty, sexo, email, clinic_name")
        .eq("id", psychologistId)
        .single(),

      supabase.from("patients")
        .select("id, first_name, last_name, birth_date, diagnosis, status, notes, created_at")
        .eq("psychologist_id", psychologistId)
        .order("first_name"),

      supabase.from("appointments")
        .select("start_time, end_time, status, modality, type, notes, patient:patients(first_name, last_name)")
        .eq("psychologist_id", psychologistId)
        .gte("start_time", new Date().toISOString())
        .lte("start_time", weekFromNow)
        .in("status", ["programada"])
        .order("start_time")
        .limit(20),

      supabase.from("session_notes")
        .select("content, created_at, patient:patients(first_name, last_name)")
        .eq("psychologist_id", psychologistId)
        .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
        .order("created_at", { ascending: false })
        .limit(10),

      supabase.from("test_submissions")
        .select("test_short_name, status, completed_at, score, max_score, level, patient:patients(first_name, last_name)")
        .eq("psychologist_id", psychologistId)
        .in("status", ["sent", "completed"])
        .order("completed_at", { ascending: false })
        .limit(10),
    ]);

    // ── Contar sesiones por paciente ──────────────────────────────────────────
    const { data: sessionCounts } = await supabase.from("appointments")
      .select("patient_id, status")
      .eq("psychologist_id", psychologistId)
      .eq("status", "completada");

    const countByPatient: Record<string, number> = {};
    (sessionCounts ?? []).forEach((a: any) => {
      if (a.patient_id) countByPatient[a.patient_id] = (countByPatient[a.patient_id] ?? 0) + 1;
    });

    // ── Contextos ─────────────────────────────────────────────────────────────
    const patientsContext = (patients ?? []).map((p: any) => ({
      nombre: `${p.first_name} ${p.last_name}`,
      diagnostico: p.diagnosis ?? "Sin diagnóstico registrado",
      estado: p.status ?? "activo",
      sesionesCompletadas: countByPatient[p.id] ?? 0,
      notas: p.notes ?? "",
      desde: p.created_at ? new Date(p.created_at).toLocaleDateString("es-VE", { timeZone: TZ }) : "—",
    }));

    const apptsContext = (upcomingAppts ?? []).map((a: any) => {
      const p = Array.isArray(a.patient) ? a.patient[0] : a.patient;
      return {
        paciente: p ? `${p.first_name} ${p.last_name}` : "Desconocido",
        fecha: fmtDateTime(a.start_time),
        modalidad: a.modality,
        tipo: a.type,
        notas: a.notes ?? "",
      };
    });

    const notesContext = (recentNotes ?? []).map((n: any) => {
      const p = Array.isArray(n.patient) ? n.patient[0] : n.patient;
      return {
        paciente: p ? `${p.first_name} ${p.last_name}` : "Desconocido",
        fecha: new Date(n.created_at).toLocaleDateString("es-VE", { timeZone: TZ }),
        resumen: (n.content ?? "").slice(0, 300),
      };
    });

    const testsContext = (pendingTests ?? []).map((t: any) => {
      const p = Array.isArray(t.patient) ? t.patient[0] : t.patient;
      return {
        paciente: p ? `${p.first_name} ${p.last_name}` : "Desconocido",
        test: t.test_short_name,
        estado: t.status === "sent" ? "Enviado, sin responder" : "Completado, pendiente de revisión",
        puntuacion: t.score != null ? `${t.score}/${t.max_score} (${t.level ?? "—"})` : "—",
      };
    });

    // ── Título del profesional ────────────────────────────────────────────────
    const titulo    = getTitulo(profile?.sexo);
    const nombre    = profile?.full_name ?? "Profesional";
    const specialty = profile?.specialty ?? "Psicología clínica";
    const clinica   = profile?.clinic_name ?? "";

    const nombreCorto = nombre.split(" ")[0];

    // ── System prompt ─────────────────────────────────────────────────────────
    const SYSTEM_PROMPT = `Eres PsyDesk AI, el asistente inteligente integrado en PsyDesk, una plataforma de gestión clínica para psicólogos independientes.

Estás asistiendo a ${titulo ? `${titulo} ${nombre}` : nombre}${clinica ? `, del consultorio "${clinica}"` : ""}, especialista en ${specialty}.

## Tus capacidades principales:
1. **Chat clínico**: Responder preguntas sobre pacientes, orientación en técnicas terapéuticas, psicología clínica y gestión del consultorio.
2. **Redacción de documentos**: Redactar notas de sesión, informes psicológicos, cartas de derivación, planes de tratamiento y cualquier documento clínico.
3. **Búsqueda y resumen de pacientes**: Tienes acceso a la base de datos real de pacientes para buscar, comparar o resumir información.

## Pacientes registrados (${patientsContext.length} en total):
${JSON.stringify(patientsContext, null, 2)}

## Citas próximas (próximos 7 días):
${apptsContext.length > 0 ? JSON.stringify(apptsContext, null, 2) : "Sin citas programadas próximas."}

## Notas de sesión recientes (últimas 2 semanas):
${notesContext.length > 0 ? JSON.stringify(notesContext, null, 2) : "Sin notas recientes."}

## Tests pendientes:
${testsContext.length > 0 ? JSON.stringify(testsContext, null, 2) : "Sin tests pendientes."}

## Fecha y hora actual:
${new Date().toLocaleString("es-VE", { weekday:"long", day:"numeric", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit", timeZone: TZ })}

## Instrucciones de comportamiento:
- Responde siempre en español, con tono profesional pero cálido.
- Dirígete al profesional como "${titulo ? `${titulo} ${nombreCorto}` : nombreCorto}" cuando sea natural.
- Para documentos clínicos, usa formato estructurado con secciones claras en markdown.
- Cuando redactes notas o informes, indica claramente que son borradores para revisión.
- Si te piden buscar un paciente, busca por nombre, diagnóstico, estado o cualquier dato relevante en la base de datos provista.
- Para orientación clínica, basa tus respuestas en evidencia científica actualizada.
- Sé conciso en el chat, pero detallado cuando redactes documentos formales.
- Nunca inventes datos de pacientes que no estén en la base de datos.
- Si una pregunta está fuera de tu alcance clínico o de la app, indícalo claramente.

## Formato de respuesta:
- Chat normal: respuestas conversacionales, máximo 3-4 párrafos.
- Documentos: usa markdown con headers (##), listas y estructura formal.
- Búsquedas: presenta la información de forma clara y organizada.`;

    // ── Llamar a Gemini ───────────────────────────────────────────────────────
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    const chat        = model.startChat({ history });
    const result      = await chat.sendMessage(lastMessage.content);
    const text        = result.response.text();

    return NextResponse.json({ text });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("AI route error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}