// Genera (o regenera) la cuenta demo con datos 100 % ficticios.
// Se ejecuta desde /api/demo/reset con la service role key. Es idempotente:
// borra todo lo que pertenece a la cuenta demo y lo vuelve a crear con fechas
// relativas a "hoy", así la agenda siempre se ve viva.

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { TESTS_DATA, calcScore, getMaxScore } from "@/components/tests/tests-data";

// Venezuela usa UTC-4 todo el año (sin horario de verano)
const TZ_OFFSET_HOURS = 4;
const DAY = 86_400_000;

/** Fecha en hora de Caracas: `dayOffset` días desde hoy, a las hh:mm locales. */
function at(base: Date, dayOffset: number, hour: number, minute = 0): Date {
  const local = new Date(base.getTime() - TZ_OFFSET_HOURS * 3_600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dayOffset, hour + TZ_OFFSET_HOURS, minute));
}
const isoDate = (d: Date) => new Date(d.getTime() - TZ_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);

type Modality = "presencial" | "videollamada" | "telefono";

interface DemoPatient {
  key: string;
  first_name: string; last_name: string; gender: "masculino" | "femenino";
  birth_date: string; occupation: string; education: string; diagnosis: string;
  referral_source: string; status: "activo" | "lista_espera" | "alta";
  notes: string;
  /** Día de la semana de la sesión (0 = domingo) y hora local */
  weekday?: number; hour?: number; modality?: Modality;
  /** Semanas desde que empezó (sesiones pasadas) */
  weeksIn?: number;
  /** Frases para notas SOAP, se van rotando */
  soap?: { s: string[]; o: string[]; a: string[]; p: string[] };
}

const PATIENTS: DemoPatient[] = [
  {
    key: "maria", first_name: "María Fernanda", last_name: "Rojas", gender: "femenino", birth_date: "1994-03-12",
    occupation: "Contadora", education: "Universitaria", diagnosis: "Ansiedad generalizada",
    referral_source: "Médico de familia", status: "activo", weekday: 1, hour: 9, modality: "presencial", weeksIn: 5,
    notes: "Prefiere sesiones en la mañana. Responde bien a tareas entre sesiones.",
    soap: {
      s: ["Refiere preocupación constante por el trabajo y dificultad para desconectarse en la noche.", "Comenta que practicó la respiración diafragmática 4 de 7 días.", "Reporta una semana más tranquila; un episodio de ansiedad antes de una reunión.", "Dice sentirse con más control; identificó pensamientos catastróficos por sí misma.", "Cuenta que presentó en la reunión de equipo con ansiedad manejable (4/10).", "Refiere que retomó yoga los sábados y que duerme mejor."],
      o: ["Inquietud motora leve, habla acelerada al inicio.", "Contacto visual adecuado, afecto congruente.", "Más relajada que en sesiones previas, postura abierta."],
      a: ["Síntomas compatibles con ansiedad generalizada de intensidad moderada.", "Buena adherencia a las técnicas. Disminución de la rumiación nocturna.", "Progreso sostenido; GAD-7 en descenso."],
      p: ["Psicoeducación sobre ansiedad y registro de preocupaciones.", "Continuar respiración y empezar reestructuración cognitiva.", "Exposición gradual a reuniones; revisar registro la próxima sesión."],
    },
  },
  {
    key: "carlos", first_name: "Carlos Eduardo", last_name: "Pérez", gender: "masculino", birth_date: "1988-07-21",
    occupation: "Ingeniero de software", education: "Universitaria", diagnosis: "Estrés laboral",
    referral_source: "Búsqueda en internet", status: "activo", weekday: 2, hour: 18, modality: "videollamada", weeksIn: 4,
    notes: "Sesiones online por horario laboral.",
    soap: {
      s: ["Refiere jornadas de 11 horas y cansancio al despertar.", "Logró cerrar la laptop a las 7 p. m. tres días de la semana.", "Discusión con su jefe; se sintió sobrepasado pero no se aisló.", "Delegó dos tareas a su equipo por primera vez; reporta alivio.", "Tomó un día libre sin revisar el correo."],
      o: ["Se conecta puntual, se le ve cansado.", "Discurso organizado, afecto algo aplanado.", "Más animado; sonríe al contar sus logros."],
      a: ["Estrés laboral sostenido con impacto en el sueño.", "Mejora en límites horarios; persiste dificultad para delegar."],
      p: ["Registro de actividades y pausas activas.", "Trabajar asertividad: ensayar conversación con su jefe.", "Aplicar PSS-10 para medir avance."],
    },
  },
  {
    key: "valentina", first_name: "Valentina", last_name: "Gómez", gender: "femenino", birth_date: "2001-11-05",
    occupation: "Estudiante de Diseño", education: "Universitaria (en curso)", diagnosis: "Episodio depresivo leve",
    referral_source: "Servicio de orientación universitaria", status: "activo", weekday: 3, hour: 10, modality: "presencial", weeksIn: 6,
    notes: "Acordado contacto con orientación de la universidad si falta a dos sesiones seguidas.",
    soap: {
      s: ["Refiere desgano y poca motivación para ir a clases.", "Retomó una actividad que disfruta (dibujo) dos veces esta semana.", "Comenta que salió con amigas el fin de semana y la pasó bien.", "Refiere mejor ánimo, aunque le preocupan las entregas finales.", "Entregó un proyecto a tiempo y lo vivió como un logro.", "Se inscribió en un taller de ilustración los sábados."],
      o: ["Afecto triste, latencia de respuesta aumentada.", "Mejor arreglo personal, más reactiva en la conversación.", "Afecto eutímico la mayor parte de la sesión."],
      a: ["Sintomatología depresiva leve; PHQ-9 = 9.", "Respuesta favorable a la activación conductual.", "Mejoría clínica; PHQ-9 en descenso."],
      p: ["Activación conductual: agenda semanal de actividades placenteras.", "Mantener actividades y trabajar autocrítica.", "Plan de estudio por bloques para las entregas."],
    },
  },
  {
    key: "andres", first_name: "Andrés", last_name: "Silva", gender: "masculino", birth_date: "1979-02-28",
    occupation: "Profesor de bachillerato", education: "Universitaria", diagnosis: "Proceso de duelo",
    referral_source: "Recomendación de un familiar", status: "activo", weekday: 4, hour: 15, modality: "presencial", weeksIn: 3,
    notes: "Duelo por fallecimiento de su padre hace 4 meses.",
    soap: {
      s: ["Habla de su padre con mucha emoción; dice que no ha podido ordenar sus cosas.", "Visitó la casa familiar y guardó algunas pertenencias.", "Refiere días buenos y días difíciles, pero menos culpa.", "Compartió fotos de su padre con su hermana y pudieron recordarlo juntos."],
      o: ["Llanto durante la sesión, se calma con contención.", "Afecto triste pero modulado."],
      a: ["Duelo dentro de lo esperado, sin criterios de duelo complicado.", "Avanza en la aceptación de la pérdida."],
      p: ["Validación emocional y escritura de una carta a su padre.", "Continuar trabajo con recuerdos significativos."],
    },
  },
  {
    key: "gabriela", first_name: "Gabriela", last_name: "Morales", gender: "femenino", birth_date: "1996-06-17",
    occupation: "Enfermera (turnos rotativos)", education: "Técnica superior", diagnosis: "Insomnio",
    referral_source: "Colega del hospital", status: "activo", weekday: 5, hour: 11, modality: "videollamada", weeksIn: 4,
    notes: "Ajustar horario según su turno.",
    soap: {
      s: ["Refiere tardar más de una hora en dormirse después de los turnos nocturnos.", "Empezó a usar el diario de sueño.", "Dice que dejó el teléfono fuera de la habitación y nota diferencia.", "Logró dormir 6 horas seguidas después de un turno nocturno.", "Refiere menos ansiedad al acostarse; ya no mira el reloj."],
      o: ["Ojeras marcadas, bostezos frecuentes.", "Más despierta y participativa."],
      a: ["Insomnio de conciliación asociado a turnos rotativos; ISI moderado.", "Buena adherencia a higiene del sueño."],
      p: ["Higiene del sueño y diario de sueño.", "Control de estímulos y restricción de tiempo en cama."],
    },
  },
  {
    key: "daniela", first_name: "Daniela", last_name: "Castillo", gender: "femenino", birth_date: "2010-09-02",
    occupation: "Estudiante de 3.er año", education: "Secundaria (en curso)", diagnosis: "Ansiedad escolar",
    referral_source: "Orientadora del colegio", status: "activo", weekday: 3, hour: 16, modality: "presencial", weeksIn: 3,
    notes: "Asiste acompañada por su madre. Consentimiento informado firmado por representante.",
    soap: {
      s: ["Refiere dolor de estómago antes de las exposiciones en clase.", "Hizo una exposición corta frente a su grupo de amigas.", "Dice que se sintió nerviosa pero pudo terminar la evaluación oral.", "Levantó la mano dos veces en clase de Historia."],
      o: ["Tímida al inicio, se va soltando con actividades lúdicas.", "Más conversadora, buen vínculo terapéutico."],
      a: ["Ansiedad de desempeño en contexto escolar.", "Avances en exposición gradual."],
      p: ["Psicoeducación con la madre; técnica de respiración con globo.", "Jerarquía de exposición: leer en voz alta en clase."],
    },
  },
  {
    key: "luis", first_name: "Luis Alberto", last_name: "Hernández", gender: "masculino", birth_date: "1992-12-09",
    occupation: "Comerciante", education: "Bachiller", diagnosis: "Dificultades de pareja",
    referral_source: "Instagram", status: "activo", weekday: 1, hour: 17, modality: "telefono", weeksIn: 2,
    notes: "Evalúa proponer terapia de pareja.",
    soap: {
      s: ["Refiere discusiones frecuentes con su pareja por la distribución de gastos.", "Probó la técnica de tiempo fuera en una discusión.", "Hablaron del presupuesto del mes sin discutir."],
      o: ["Discurso fluido, algo defensivo al inicio."],
      a: ["Patrón de comunicación reactiva en la relación."],
      p: ["Trabajar comunicación no violenta y escucha activa."],
    },
  },
  {
    key: "jose", first_name: "José Gregorio", last_name: "Ramírez", gender: "masculino", birth_date: "1985-04-30",
    occupation: "Chofer", education: "Bachiller", diagnosis: "Por evaluar",
    referral_source: "Formulario web", status: "lista_espera",
    notes: "Solicita horario sabatino. Contactar cuando haya cupo.",
  },
  {
    key: "isabel", first_name: "Isabel", last_name: "Rivas", gender: "femenino", birth_date: "1990-01-14",
    occupation: "Abogada", education: "Postgrado", diagnosis: "Ansiedad social",
    referral_source: "Recomendación de paciente", status: "alta",
    notes: "Alta terapéutica tras 14 sesiones. Seguimiento opcional en 3 meses.",
  },
];

/** Respuestas sintéticas que producen (aprox.) el puntaje buscado. */
function answersFor(testId: string, target: number): Record<number, number> {
  const test = TESTS_DATA.find(t => t.id === testId);
  if (!test) return {};
  const answers: Record<number, number> = {};
  const qs = test.questions;
  let remaining = target;
  qs.forEach((q, i) => {
    const max = Math.max(...q.options.map(o => o.value));
    const min = Math.min(...q.options.map(o => o.value));
    // Nunca marcamos la pregunta 9 del PHQ-9 (ideación) en datos de demo
    if (testId === "phq9" && q.id === 9) { answers[q.id] = 0; return; }
    const slotsLeft = qs.length - i;
    const v = Math.max(min, Math.min(max, Math.round(remaining / slotsLeft)));
    answers[q.id] = v;
    remaining -= v;
  });
  return answers;
}

const SHORT: Record<string, string> = Object.fromEntries(TESTS_DATA.map(t => [t.id, t.shortName]));

export interface SeedResult {
  userId: string;
  counts: Record<string, number>;
}

export async function seedDemo(admin: SupabaseClient, now = new Date()): Promise<SeedResult> {
  if (!DEMO_PASSWORD) throw new Error("NEXT_PUBLIC_DEMO_PASSWORD no está configurada");

  // ── 1. Usuario demo (se crea o se restaura su contraseña) ────────────────
  let userId: string | null = null;
  for (let page = 1; page <= 10 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find(u => u.email?.toLowerCase() === DEMO_EMAIL.toLowerCase())?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true,
      user_metadata: { full_name: "Laura Méndez" },
    });
    if (error) throw error;
    userId = data.user.id;
  }
  const uid = userId;

  // ── 2. Borrar todo lo de la cuenta demo (los FK en cascada limpian el resto)
  for (const table of ["appointments", "patients", "custom_tests", "session_logs", "integrations", "feedback"]) {
    const col = table === "session_logs" || table === "integrations" ? "profile_id" : "psychologist_id";
    const { error } = await admin.from(table).delete().eq(col, uid);
    if (error) throw new Error(`${table}: ${error.message}`);
  }

  // ── 3. Perfil ─────────────────────────────────────────────────────────────
  {
    const { error } = await admin.from("profiles").upsert({
      id: uid, email: DEMO_EMAIL, full_name: "Laura Méndez", sexo: "femenino",
      specialty: "Psicología clínica · Terapia cognitivo-conductual", license_number: "FPV-12345",
      phone: "+58 412-555-0100", clinic_name: "Consultorio Bienestar (demo)",
      avatar_url: null, avatar_history: [], preferences: {},
    }, { onConflict: "id" });
    if (error) throw new Error(`profiles: ${error.message}`);
  }

  // ── 4. Pacientes ──────────────────────────────────────────────────────────
  const { data: patientRows, error: pErr } = await admin.from("patients").insert(
    PATIENTS.map((p, i) => ({
      psychologist_id: uid, first_name: p.first_name, last_name: p.last_name, gender: p.gender,
      birth_date: p.birth_date, occupation: p.occupation, education: p.education, diagnosis: p.diagnosis,
      referral_source: p.referral_source, status: p.status, notes: p.notes,
      email: `${p.first_name.split(" ")[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()}.${p.last_name.toLowerCase()}@example.com`,
      phone: `+58 414-555-01${String(i + 10)}`,
      emergency_contact: "Contacto de emergencia (demo)", emergency_phone: "+58 424-555-0199",
      session_count: p.key === "isabel" ? 14 : 0,
      created_at: new Date(now.getTime() - ((p.weeksIn ?? 2) * 7 + 3) * DAY).toISOString(),
    }))
  ).select("id, first_name");
  if (pErr) throw new Error(`patients: ${pErr.message}`);
  const idOf = (key: string) => {
    const p = PATIENTS.find(x => x.key === key)!;
    return patientRows!.find(r => r.first_name === p.first_name)!.id as string;
  };

  // ── 5. Citas: pasadas (completadas) y próximas 3 semanas ─────────────────
  type ApptSeed = { patientKey: string; start: Date; status: string; type: string; cancel_reason?: string; modality: Modality; idx: number };
  const appts: ApptSeed[] = [];
  const todayLocalDow = new Date(now.getTime() - TZ_OFFSET_HOURS * 3_600_000).getUTCDay();

  for (const p of PATIENTS) {
    if (p.weekday === undefined || p.hour === undefined) continue;
    const delta = (p.weekday - todayLocalDow + 7) % 7; // próximo día de sesión (puede ser hoy)
    const biweekly = p.key === "luis";
    const weeksBack = p.weeksIn ?? 3;
    let idx = 0;
    for (let w = -weeksBack; w <= 3; w++) {
      if (biweekly && w % 2 !== 0) continue;
      const start = at(now, delta + w * 7, p.hour);
      const past = start.getTime() + 50 * 60_000 < now.getTime();
      let status = past ? "completada" : "programada";
      let cancel_reason: string | undefined;
      if (past && p.key === "carlos" && w === -2) { status = "cancelada"; cancel_reason = "Viaje de trabajo"; }
      if (past && p.key === "valentina" && w === -3) status = "no_asistio";
      appts.push({
        patientKey: p.key, start, status, cancel_reason, modality: p.modality ?? "presencial", idx,
        type: idx === 0 ? "primera_vez" : w === 3 ? "seguimiento" : "sesion",
      });
      idx++;
    }
  }
  // Una cita de evaluación para el paciente en lista de espera
  appts.push({ patientKey: "jose", start: at(now, 9, 10), status: "programada", type: "evaluacion", modality: "presencial", idx: 0 });

  const fullName = (key: string) => { const p = PATIENTS.find(x => x.key === key)!; return `${p.first_name} ${p.last_name}`; };
  const { data: apptRows, error: aErr } = await admin.from("appointments").insert(
    appts.map(a => ({
      psychologist_id: uid, patient_id: idOf(a.patientKey),
      title: `${a.type === "evaluacion" ? "Evaluación" : a.type === "primera_vez" ? "Primera consulta" : "Sesión"} — ${fullName(a.patientKey)}`,
      start_time: a.start.toISOString(), end_time: new Date(a.start.getTime() + 50 * 60_000).toISOString(),
      type: a.type, status: a.status, modality: a.modality, cancel_reason: a.cancel_reason ?? null,
      location: a.modality === "presencial" ? "Consultorio 2" : null,
      notes: a.type === "evaluacion" ? "Entrevista inicial y aplicación de PHQ-9 / GAD-7." : null,
    }))
  ).select("id, patient_id, start_time, status");
  if (aErr) throw new Error(`appointments: ${aErr.message}`);

  // session_count real según citas completadas
  const completedBy: Record<string, { id: string; start: string }[]> = {};
  for (const r of apptRows!) {
    if (r.status !== "completada") continue;
    (completedBy[r.patient_id] ??= []).push({ id: r.id, start: r.start_time });
  }
  for (const [pid, list] of Object.entries(completedBy)) {
    await admin.from("patients").update({ session_count: list.length }).eq("id", pid);
  }

  // ── 6. Notas de sesión SOAP para cada cita completada ────────────────────
  const notes: Record<string, unknown>[] = [];
  for (const p of PATIENTS) {
    if (!p.soap) continue;
    const list = (completedBy[idOf(p.key)] ?? []).sort((a, b) => a.start.localeCompare(b.start));
    list.forEach((appt, i) => {
      // Subjetivo: una frase por sesión. O/A/P avanzan por etapas (inicio → medio → cierre)
      const pick = (arr: string[]) => arr[Math.min(i, arr.length - 1)];
      const stage = (arr: string[]) => arr[Math.min(arr.length - 1, Math.floor((i / Math.max(1, list.length - 1)) * (arr.length - 1) + 0.5))];
      const isLast = i === list.length - 1;
      notes.push({
        psychologist_id: uid, patient_id: idOf(p.key), appointment_id: appt.id,
        session_date: isoDate(new Date(appt.start)), session_number: i + 1,
        subjective: pick(p.soap!.s), objective: stage(p.soap!.o), assessment: stage(p.soap!.a), plan: stage(p.soap!.p),
        mood_rating: Math.min(9, 4 + i), next_session: isoDate(new Date(new Date(appt.start).getTime() + 7 * DAY)),
        // La última nota de Carlos queda como borrador → aparece como "nota pendiente"
        is_draft: isLast && p.key === "carlos",
      });
    });
  }
  if (notes.length) {
    const { error } = await admin.from("session_notes").insert(notes);
    if (error) throw new Error(`session_notes: ${error.message}`);
  }

  // ── 7. Historias clínicas ─────────────────────────────────────────────────
  {
    const { error } = await admin.from("clinical_histories").insert([
      {
        psychologist_id: uid, patient_id: idOf("maria"),
        motivo_consulta: "Preocupación excesiva y difícil de controlar desde hace 8 meses, con tensión muscular e insomnio de conciliación.",
        cuadro_clinico: "Preocupaciones sobre el trabajo, la salud de sus padres y las finanzas. Irritabilidad y fatiga. Sin crisis de pánico.",
        examen_mental: "Orientada en tiempo, espacio y persona. Pensamiento coherente, contenido centrado en preocupaciones. Sin alteraciones sensoperceptivas.",
        ant_personal_medico: "Gastritis tratada hace 2 años.", ant_personal_psicologico: "Sin tratamientos previos.",
        ant_familiar_psicologico: "Madre con rasgos ansiosos (referido).",
        dinamica_familiar: "Vive con su pareja. Relación cercana con su hermana.",
        habitos_sueno: "Tarda 45–60 min en dormirse; despierta cansada.", habitos_sustancias: "Café: 4 tazas al día. No consume alcohol de forma regular.",
        relaciones_interpersonales: "Red de apoyo adecuada; tiende a evitar conflictos.",
        recreacion_actividades: "Yoga los sábados (lo dejó hace 3 meses).",
        observaciones_generales: "Paciente motivada, con buena capacidad de introspección.",
      },
      {
        psychologist_id: uid, patient_id: idOf("valentina"),
        motivo_consulta: "Desánimo, pérdida de interés en sus estudios y aislamiento desde el inicio del semestre.",
        cuadro_clinico: "Ánimo bajo la mayor parte del día, hipersomnia los fines de semana, autocrítica marcada.",
        examen_mental: "Afecto triste, pensamiento lento pero coherente. Niega ideación de daño. Juicio conservado.",
        ant_personal_psicologico: "Asistió a orientación en bachillerato por ansiedad ante exámenes.",
        dinamica_familiar: "Vive en residencia estudiantil; visita a su familia cada 15 días.",
        escolar_rendimiento: "Promedio alto hasta el semestre anterior; bajó en las dos últimas evaluaciones.",
        recreacion_intereses: "Dibujo, ilustración digital, música indie.",
        observaciones_generales: "Se acuerda plan de seguridad y contacto con orientación universitaria.",
      },
      {
        psychologist_id: uid, patient_id: idOf("daniela"),
        motivo_consulta: "Malestar físico (dolor abdominal) y llanto antes de exposiciones y exámenes orales.",
        cuadro_clinico: "Ansiedad anticipatoria en contexto escolar; evita levantar la mano en clase.",
        examen_mental: "Alerta, colaboradora, lenguaje acorde a su edad. Afecto ansioso al hablar del colegio.",
        prenatal_controlado: "Sí", perinatal_tipo_parto: "Natural, a término", neonatal_lactancia: "Materna hasta los 12 meses",
        psicomotor_marcha: "12 meses", psicomotor_palabras: "11 meses",
        dinamica_familiar: "Vive con su madre y su hermano menor. Padre presente los fines de semana.",
        escolar_adaptacion: "Buena adaptación social; grupo de 3 amigas cercanas.",
        escolar_rendimiento: "Rendimiento bueno en escritos, bajo en evaluaciones orales.",
        escolar_fortalezas: "Matemáticas y arte.", escolar_dificultades: "Exposiciones orales.",
        recreacion_electronicos: "2–3 horas diarias de teléfono.",
        observaciones_generales: "Se trabaja en conjunto con la madre y la orientadora.",
      },
    ]);
    if (error) throw new Error(`clinical_histories: ${error.message}`);
  }

  // ── 8. Tests aplicados ────────────────────────────────────────────────────
  const tests: { key: string; testId: string; daysAgo: number; target?: number; status: "sent" | "completed" | "reviewed" }[] = [
    { key: "maria", testId: "gad7", daysAgo: 34, target: 15, status: "reviewed" },
    { key: "maria", testId: "gad7", daysAgo: 6, target: 9, status: "completed" },
    { key: "valentina", testId: "phq9", daysAgo: 41, target: 12, status: "reviewed" },
    { key: "valentina", testId: "phq9", daysAgo: 13, target: 7, status: "reviewed" },
    { key: "gabriela", testId: "isi", daysAgo: 27, target: 17, status: "reviewed" },
    { key: "andres", testId: "phq9", daysAgo: 20, target: 8, status: "completed" },
    { key: "daniela", testId: "scared5", daysAgo: 18, target: 6, status: "reviewed" },
    { key: "carlos", testId: "pss10", daysAgo: 2, status: "sent" },
  ];
  const subs = tests.map((t, i) => {
    const sentAt = new Date(now.getTime() - t.daysAgo * DAY);
    const base = {
      psychologist_id: uid, patient_id: idOf(t.key), test_id: t.testId, test_short_name: SHORT[t.testId] ?? t.testId,
      token: `demo-${t.testId}-${i}-${crypto.randomUUID()}`, status: t.status, sent_at: sentAt.toISOString(),
    };
    if (t.status === "sent" || t.target === undefined) return base;
    const answers = answersFor(t.testId, t.target);
    const { score, level } = calcScore(t.testId, answers);
    return {
      ...base, answers, score, level, max_score: getMaxScore(t.testId),
      completed_at: new Date(sentAt.getTime() + 0.5 * DAY).toISOString(),
      notes: t.status === "reviewed" ? "Revisado en sesión con el/la paciente." : null,
    };
  });
  {
    const { error } = await admin.from("test_submissions").insert(subs);
    if (error) throw new Error(`test_submissions: ${error.message}`);
  }

  // ── 9. Test personalizado de ejemplo ─────────────────────────────────────
  const { data: custom, error: ctErr } = await admin.from("custom_tests").insert({
    psychologist_id: uid, name: "Registro semanal de bienestar", short_name: "RSB",
    description: "Cuestionario breve que envío antes de cada sesión para ver cómo fue la semana.",
    questions: [
      { id: 1, text: "¿Cómo calificarías tu ánimo general esta semana?", type: "scale", scaleMin: 0, scaleMax: 4, scaleMinLabel: "Muy bajo", scaleMaxLabel: "Muy bueno" },
      { id: 2, text: "¿Pudiste realizar las tareas acordadas en la última sesión?", type: "boolean", options: [{ label: "Sí", value: 1 }, { label: "No", value: 0 }] },
      { id: 3, text: "¿Cuántas noches dormiste bien?", type: "radio", options: [{ label: "0–1", value: 0 }, { label: "2–3", value: 1 }, { label: "4–5", value: 2 }, { label: "6–7", value: 3 }] },
      { id: 4, text: "¿Hay algo que quieras trabajar en la próxima sesión?", type: "text" },
    ],
  }).select("id").single();
  if (ctErr) throw new Error(`custom_tests: ${ctErr.message}`);
  {
    const { error } = await admin.from("custom_test_submissions").insert([
      {
        psychologist_id: uid, patient_id: idOf("maria"), custom_test_id: custom.id, test_short_name: "RSB",
        token: `demo-rsb-1-${crypto.randomUUID()}`, status: "completed",
        sent_at: new Date(now.getTime() - 3 * DAY).toISOString(), completed_at: new Date(now.getTime() - 2.5 * DAY).toISOString(),
        answers: { 1: 3, 2: 1, 3: 2, 4: "Quiero preparar la reunión de evaluación de desempeño." },
      },
      {
        psychologist_id: uid, patient_id: idOf("gabriela"), custom_test_id: custom.id, test_short_name: "RSB",
        token: `demo-rsb-2-${crypto.randomUUID()}`, status: "sent", sent_at: new Date(now.getTime() - 1 * DAY).toISOString(),
      },
    ]);
    if (error) throw new Error(`custom_test_submissions: ${error.message}`);
  }

  return {
    userId: uid,
    counts: {
      patients: patientRows!.length, appointments: apptRows!.length, session_notes: notes.length,
      clinical_histories: 3, test_submissions: subs.length, custom_tests: 1,
    },
  };
}
