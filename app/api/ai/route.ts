import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── Datos demo de pacientes (reemplazar con Supabase cuando esté listo) ───
const PACIENTES_DEMO = [
  { nombre:"María González",  edad:34, diagnostico:"Ansiedad generalizada",     sesiones:12, proximaCita:"Hoy 10:00",    estado:"Activo",       notas:"Progreso notable en técnicas de respiración. Reducción de ataques de pánico." },
  { nombre:"Carlos Mendoza",  edad:28, diagnostico:"Depresión mayor",           sesiones:8,  proximaCita:"Hoy 11:30",    estado:"Activo",       notas:"Inicio de medicación hace 3 semanas. Mejora leve en estado de ánimo." },
  { nombre:"Ana Reyes",       edad:41, diagnostico:"TEPT",                      sesiones:23, proximaCita:"Hoy 14:00",    estado:"Activo",       notas:"Trabajando con EMDR. Fase de procesamiento activa." },
  { nombre:"Joaquín Torres",  edad:19, diagnostico:"TDAH",                      sesiones:5,  proximaCita:"Mañana 9:00",  estado:"Activo",       notas:"Evaluación inicial completada. Derivado de neurología." },
  { nombre:"Sofía Vargas",    edad:52, diagnostico:"Estrés laboral",            sesiones:2,  proximaCita:"Mañana 15:30", estado:"Activo",       notas:"Paciente nueva. Situación de burnout en empresa corporativa." },
  { nombre:"Roberto Lima",    edad:45, diagnostico:"Fobia social",              sesiones:15, proximaCita:"Jue 10:00",    estado:"Activo",       notas:"Exposición gradual en curso. Tolera mejor situaciones sociales pequeñas." },
  { nombre:"Elena Castillo",  edad:31, diagnostico:"TOC",                       sesiones:19, proximaCita:"Vie 16:00",    estado:"Activo",       notas:"Respuesta positiva a ERP. Rituales reducidos ~40%." },
  { nombre:"Miguel Fuentes",  edad:67, diagnostico:"Duelo complicado",          sesiones:7,  proximaCita:"—",            estado:"Lista espera", notas:"Pérdida de cónyuge hace 8 meses. En lista de espera para intensivo." },
  { nombre:"Laura Jiménez",   edad:24, diagnostico:"Trastorno de alimentación", sesiones:31, proximaCita:"—",            estado:"Alta",         notas:"Dada de alta exitosamente. Seguimiento trimestral." },
  { nombre:"Pedro Morales",   edad:38, diagnostico:"Pareja y familia",          sesiones:4,  proximaCita:"—",            estado:"Archivado",    notas:"Proceso de divorcio. Pausó terapia por cambio de ciudad." },
];

const SYSTEM_PROMPT = `Eres PsyDesk  AI, el asistente inteligente integrado en PsyDesk, una plataforma de gestión clínica para psicólogos independientes.

Estás asistiendo a la Dra. Laura Martínez, psicóloga clínica con especialidad en Terapia Cognitivo-Conductual.

## Tus capacidades principales:
1. **Chat clínico**: Responder preguntas sobre pacientes, orientación en técnicas terapéuticas, psicología clínica y gestión del consultorio.
2. **Redacción de documentos**: Redactar notas de sesión, informes psicológicos, cartas de derivación, planes de tratamiento y cualquier documento clínico.
3. **Búsqueda y resumen de pacientes**: Accedes a la base de datos de pacientes de la Dra. Laura para buscar, comparar o resumir información.

## Base de datos de pacientes actual:
${JSON.stringify(PACIENTES_DEMO, null, 2)}

## Instrucciones de comportamiento:
- Responde siempre en español, con tono profesional pero cálido.
- Para documentos clínicos, usa formato estructurado con secciones claras.
- Cuando redactes notas o informes, indica claramente que son borradores para revisión.
- Si te piden buscar un paciente, busca por nombre, diagnóstico o cualquier dato relevante.
- Para orientación clínica, basa tus respuestas en evidencia científica actualizada.
- Sé conciso en el chat, pero detallado cuando redactes documentos formales.
- Nunca inventes datos de pacientes que no estén en la base de datos.
- Si una pregunta está fuera de tu alcance clínico o de la app, indícalo con claridad.

## Formato de respuesta:
- Chat normal: respuestas conversacionales, máximo 3-4 párrafos.
- Documentos: usa markdown con headers (##), listas y estructura formal.
- Búsquedas: presenta la información de forma clara y organizada.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages requerido" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Gemini usa "user" y "model" (no "assistant")
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