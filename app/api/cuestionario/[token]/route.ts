// API pública del cuestionario que responde el paciente.
// Todo pasa por el servidor con la service role: el navegador del paciente
// nunca consulta las tablas directamente, solo puede ver y responder el test
// que corresponde a SU token, una sola vez, y el puntaje se calcula aquí.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TESTS_DATA, calcScore, getMaxScore } from "@/components/tests/tests-data";
import type { CustomQuestion } from "@/components/tests/CustomTestBuilder";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const TOKEN_RE = /^[A-Za-z0-9-]{20,100}$/;
const MAX_TEXT = 2000;

type Found =
  | { source: "predefined"; id: string; status: string; testId: string; name: string; questions: CustomQuestion[] }
  | { source: "custom"; id: string; status: string; name: string; questions: CustomQuestion[] };

async function findByToken(token: string): Promise<Found | null> {
  const { data: pre } = await admin
    .from("test_submissions")
    .select("id, test_id, status")
    .eq("token", token)
    .maybeSingle();

  if (pre) {
    const def = TESTS_DATA.find(t => t.id === pre.test_id);
    if (!def) return null;
    return {
      source: "predefined", id: pre.id, status: pre.status, testId: pre.test_id, name: def.name,
      questions: def.questions.map(q => ({
        id: q.id, text: q.text, type: "radio" as const,
        options: q.options.map(o => ({ label: o.label, value: o.value })),
      })),
    };
  }

  const { data: cus } = await admin
    .from("custom_test_submissions")
    .select("id, status, custom_test:custom_tests(name, questions)")
    .eq("token", token)
    .maybeSingle();
  if (!cus) return null;
  const def = Array.isArray(cus.custom_test) ? cus.custom_test[0] : cus.custom_test;
  if (!def) return null;
  return { source: "custom", id: cus.id, status: cus.status, name: def.name, questions: def.questions as CustomQuestion[] };
}

/** Valida y normaliza las respuestas contra las preguntas del test. */
function cleanAnswers(questions: CustomQuestion[], raw: unknown): Record<number, number | string> | string {
  if (!raw || typeof raw !== "object") return "Respuestas inválidas";
  const input = raw as Record<string, unknown>;
  const out: Record<number, number | string> = {};
  for (const q of questions) {
    const v = input[String(q.id)];
    if (q.type === "text") {
      if (v === undefined || v === null || v === "") continue;
      if (typeof v !== "string") return `Respuesta inválida en la pregunta ${q.id}`;
      out[q.id] = v.slice(0, MAX_TEXT);
      continue;
    }
    if (typeof v !== "number" || !Number.isFinite(v)) return "Faltan respuestas por completar";
    if (q.type === "scale") {
      const min = q.scaleMin ?? 0, max = q.scaleMax ?? 4;
      if (v < min || v > max || !Number.isInteger(v)) return `Respuesta inválida en la pregunta ${q.id}`;
    } else if (!(q.options ?? []).some(o => o.value === v)) {
      return `Respuesta inválida en la pregunta ${q.id}`;
    }
    out[q.id] = v;
  }
  return out;
}

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const found = await findByToken(token);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (found.status !== "sent") return NextResponse.json({ error: "already_answered" }, { status: 410 });

  // Solo lo necesario para mostrar el formulario
  return NextResponse.json({ source: found.source, name: found.name, questions: found.questions });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const found = await findByToken(token);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (found.status !== "sent") return NextResponse.json({ error: "already_answered" }, { status: 410 });

  const body = await req.json().catch(() => null);
  const answers = cleanAnswers(found.questions, body?.answers);
  if (typeof answers === "string") return NextResponse.json({ error: answers }, { status: 400 });

  const completed_at = new Date().toISOString();
  // .eq("status", "sent") evita que dos envíos simultáneos sobrescriban la respuesta
  if (found.source === "predefined") {
    const { score, level } = calcScore(found.testId, answers as Record<number, number>);
    const { data, error } = await admin.from("test_submissions")
      .update({ status: "completed", answers, score, level, max_score: getMaxScore(found.testId), completed_at })
      .eq("id", found.id).eq("status", "sent").select("id");
    if (error) return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: "already_answered" }, { status: 410 });
  } else {
    const { data, error } = await admin.from("custom_test_submissions")
      .update({ status: "completed", answers, completed_at })
      .eq("id", found.id).eq("status", "sent").select("id");
    if (error) return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: "already_answered" }, { status: 410 });
  }

  return NextResponse.json({ ok: true });
}
