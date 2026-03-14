// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { SessionList } from "@/components/dashboard/SessionList";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";

const TZ = "America/Caracas";
const AVATAR_COLORS = ["#8B7355","#4A7BA7","#5C8A6E","#C47B2B","#B5594A","#7B6EA8","#A85E6A","#6A9E8A"];
const DAY_SHORT = ["L","M","M","J","V","S","D"];
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const TEST_MAX_SCORES: Record<string, number> = {
  phq9: 27, gad7: 21, pcl5: 80, audit: 40, cage: 4, pss10: 40, epds: 30, isi: 28, scared5: 10,
};
const TEST_NAMES: Record<string, string> = {
  phq9: "PHQ-9", gad7: "GAD-7", pcl5: "PCL-5", audit: "AUDIT", cage: "CAGE", pss10: "PSS-10", epds: "EPDS", isi: "ISI", scared5: "SCARED-5",
};

function toISO(d: Date) { return d.toLocaleDateString("en-CA", { timeZone: TZ }); }
function toHHMM(iso: string) { return new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: TZ }); }
function colorForName(name: string) { return AVATAR_COLORS[name.length % AVATAR_COLORS.length]; }
function getInitials(first: string, last: string) { return `${first[0]??""}${last[0]??""}`.toUpperCase(); }

function getWeekRange(today: Date): { start: Date; end: Date } {
  const d = new Date(today);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(d); start.setDate(d.getDate() - diff);
  const end   = new Date(start); end.setDate(start.getDate() + 6);
  return { start, end };
}

export default function DashboardPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ sessionsToday: 0, confirmedToday: 0, pendingToday: 0, activePatients: 0, newPatientsMonth: 0, pendingTests: 0, hoursWeek: 0, estHoursWeek: 0 });
  const [todayAppts, setTodayAppts]       = useState<any[]>([]);
  const [tomorrowAppts, setTomorrowAppts] = useState<any[]>([]);
  const [weekDays, setWeekDays]           = useState<any[]>([]);
  const [todayEvents, setTodayEvents]     = useState<any[]>([]);
  const [allWeekEvents, setAllWeekEvents] = useState<Record<string, any[]>>({});
  const [weekLabel, setWeekLabel]         = useState("");
  const [alerts, setAlerts]               = useState<any[]>([]);
  const [progress, setProgress]           = useState<any[]>([]);

  const now      = new Date();
  const todayISO = toISO(now);
  const tomorrowISO = toISO(new Date(now.getTime() + 86400000));

  const todayLabel = now.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });
  const capitalTodayLabel = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ── Fetch paralelo ────────────────────────────────────────────────────────
    const { start: weekStart, end: weekEnd } = getWeekRange(now);

    const [
      { data: allAppts },
      { data: patients },
      { data: pendingTestsData },
      { data: testSubmissions },
      { data: sessionNotes },
    ] = await Promise.all([
      // Citas de la semana + hoy + mañana
      supabase.from("appointments")
        .select(`*, patient:patients(id, first_name, last_name, email, diagnosis)`)
        .eq("psychologist_id", user.id)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", new Date(weekEnd.getTime() + 86400000).toISOString())
        .order("start_time"),

      // Pacientes activos
      supabase.from("patients")
        .select("id, first_name, last_name, status, created_at")
        .eq("psychologist_id", user.id),

      // Tests pendientes de revisar
      supabase.from("test_submissions")
        .select("id, test_id, test_short_name, status, patient:patients(first_name, last_name), completed_at")
        .eq("psychologist_id", user.id)
        .in("status", ["sent", "completed"]),

      // Test submissions con scores para evolución
      supabase.from("test_submissions")
        .select("id, test_id, test_short_name, score, max_score, level, completed_at, patient_id, patient:patients(first_name, last_name)")
        .eq("psychologist_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false }),

      // Notas de sesión de ayer sin completar (sesiones que pasaron sin nota)
      supabase.from("session_notes")
        .select("id, patient_id, created_at, patient:patients(first_name, last_name)")
        .eq("psychologist_id", user.id)
        .gte("created_at", new Date(now.getTime() - 48 * 3600000).toISOString()),
    ]);

    // ── Procesar citas ────────────────────────────────────────────────────────
    const appts = (allAppts ?? []).map((a: any) => ({
      ...a,
      patient: Array.isArray(a.patient) ? a.patient[0] : a.patient,
    }));

    const todayA = appts.filter(a => toISO(new Date(a.start_time)) === todayISO);
    const tmrwA  = appts.filter(a => toISO(new Date(a.start_time)) === tomorrowISO);

    function mapAppt(a: any) {
      const p = a.patient;
      const name = p ? `${p.first_name} ${p.last_name}` : a.title;
      const color = p ? colorForName(name) : "#8B7355";
      // contar sesiones previas completadas
      const prevSessions = appts.filter(x => x.patient_id === a.patient_id && x.status === "completada" && x.start_time < a.start_time).length;
      return {
        id: a.id, patientName: name, initials: p ? getInitials(p.first_name, p.last_name) : "??",
        color, tag: p?.diagnosis ?? "", sessionNum: prevSessions + 1,
        time: toHHMM(a.start_time), status: a.status, modality: a.modality,
        patientId: a.patient_id ?? "", isNew: prevSessions === 0,
      };
    }

    setTodayAppts(todayA.map(mapAppt));
    setTomorrowAppts(tmrwA.map(mapAppt));

    // ── Stats ─────────────────────────────────────────────────────────────────
    const confirmedToday = todayA.filter(a => a.status === "programada").length;
    const pendingToday   = todayA.filter(a => a.status === "programada").length;
    const activePatients = (patients ?? []).filter(p => p.status === "activo").length;
    const thisMonth      = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const newPatientsMonth = (patients ?? []).filter(p => p.created_at >= thisMonth).length;
    const pendingTests   = (pendingTestsData ?? []).length;

    // Horas semana: sumar duración de citas completadas/programadas esta semana
    const weekAppts = appts.filter(a => ["programada","completada"].includes(a.status));
    const hoursWeek = Math.round(weekAppts.reduce((acc, a) => {
      const dur = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 3600000;
      return acc + dur;
    }, 0) * 10) / 10;

    setStats({
      sessionsToday: todayA.filter(a => a.status === "programada").length,
      confirmedToday,
      pendingToday: todayA.filter(a => a.status === "programada").length,
      activePatients,
      newPatientsMonth,
      pendingTests,
      hoursWeek,
      estHoursWeek: 20,
    });

    // ── Strip semanal ─────────────────────────────────────────────────────────
    const days: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); d.setHours(12);
      const iso = toISO(d);
      const dayAppts = appts.filter(a => toISO(new Date(a.start_time)) === iso && a.status !== "cancelada");
      days.push({
        label: DAY_SHORT[i], num: d.getDate(), iso, isToday: iso === todayISO,
        events: dayAppts.map(a => ({ color: a.patient ? colorForName(`${a.patient.first_name}${a.patient.last_name}`) : "#8B7355" })),
      });
    }
    setWeekDays(days);

    // Label de semana
    const wStart = weekStart;
    const wEnd   = weekEnd;
    setWeekLabel(`${wStart.getDate()} – ${wEnd.getDate()} ${MONTH_NAMES[wEnd.getMonth()]}`);

    // Eventos de hoy para el strip
    const weekEventsMap: Record<string, any[]> = {};
    appts.filter(a => a.status !== "cancelada").forEach(a => {
      const iso = toISO(new Date(a.start_time));
      if (!weekEventsMap[iso]) weekEventsMap[iso] = [];
      const p = a.patient;
      const name = p ? `${p.first_name} ${p.last_name}` : a.title;
      weekEventsMap[iso].push({ name, time: toHHMM(a.start_time), color: p ? colorForName(name) : "#8B7355" });
    });
    setAllWeekEvents(weekEventsMap);
    setTodayEvents(weekEventsMap[todayISO] ?? []);

    // ── Avisos ────────────────────────────────────────────────────────────────
    const alertsList: any[] = [];

    // Tests completados sin revisar
    const completedTests = (pendingTestsData ?? []).filter(t => t.status === "completed");
    completedTests.slice(0, 3).forEach(t => {
      const p = Array.isArray(t.patient) ? t.patient[0] : t.patient;
      alertsList.push({
        icon: "📋",
        text: `${t.test_short_name ?? t.test_id} pendiente de revisar — ${p ? `${p.first_name} ${p.last_name}` : "Paciente"}`,
        type: "amber",
        href: "/tests",
      });
    });

    // Tests enviados sin respuesta de más de 48h
    const sentOld = (pendingTestsData ?? []).filter(t => {
      if (t.status !== "sent") return false;
      const sent = new Date(t.completed_at ?? 0);
      return (now.getTime() - sent.getTime()) > 48 * 3600000;
    });
    sentOld.slice(0, 2).forEach(t => {
      const p = Array.isArray(t.patient) ? t.patient[0] : t.patient;
      alertsList.push({
        icon: "⏰",
        text: `Test sin responder (48h+) — ${p ? `${p.first_name} ${p.last_name}` : "Paciente"}`,
        type: "red",
        href: "/tests",
      });
    });

    // Citas de ayer completadas (recordatorio de nota)
    const yesterdayISO = toISO(new Date(now.getTime() - 86400000));
    const yesterdayDone = appts.filter(a => toISO(new Date(a.start_time)) === yesterdayISO && a.status === "completada");
    const notedPatients = new Set((sessionNotes ?? []).map((n: any) => n.patient_id));
    yesterdayDone.filter(a => a.patient_id && !notedPatients.has(a.patient_id)).slice(0, 2).forEach(a => {
      const p = a.patient;
      alertsList.push({
        icon: "📝",
        text: `Nota de sesión pendiente — ${p ? `${p.first_name} ${p.last_name}` : a.title} (ayer)`,
        type: "red",
        href: `/expedientes?patientId=${a.patient_id}`,
      });
    });

    setAlerts(alertsList);

    // ── Evolución reciente (último vs penúltimo test por paciente) ────────────
    const subs = testSubmissions ?? [];
    const byPatient: Record<string, any[]> = {};
    subs.forEach((s: any) => {
      if (!s.patient_id) return;
      if (!byPatient[s.patient_id]) byPatient[s.patient_id] = [];
      byPatient[s.patient_id].push(s);
    });

    const progressList: any[] = [];
    Object.values(byPatient).forEach((entries) => {
      // Agrupar por test_id dentro del paciente
      const byTest: Record<string, any[]> = {};
      entries.forEach(e => {
        if (!byTest[e.test_id]) byTest[e.test_id] = [];
        byTest[e.test_id].push(e);
      });
      Object.values(byTest).forEach(testEntries => {
        if (testEntries.length < 2) return;
        const sorted = testEntries.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
        const latest = sorted[0];
        const prev   = sorted[1];
        if (latest.score == null || prev.score == null) return;
        const p = Array.isArray(latest.patient) ? latest.patient[0] : latest.patient;
        const maxScore = latest.max_score ?? TEST_MAX_SCORES[latest.test_id] ?? 100;
        const diff = latest.score - prev.score;
        const color = AVATAR_COLORS[progressList.length % AVATAR_COLORS.length];
        progressList.push({
          name: p ? `${p.first_name} ${p.last_name.charAt(0)}.` : "Paciente",
          tag: TEST_NAMES[latest.test_id] ?? latest.test_short_name ?? latest.test_id,
          from: prev.score, to: latest.score, max: maxScore,
          trend: diff === 0 ? "Sin cambio" : diff > 0 ? `↑ +${diff}` : `↓ ${diff}`,
          trendUp: diff > 0,
          color,
        });
      });
    });

    setProgress(progressList.slice(0, 4));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Acciones rápidas ──────────────────────────────────────────────────────
  function handleNewPatient()     { router.push("/dashboard/pacientes"); }
  function handleSendTest()       { router.push("/dashboard/tests"); }
  function handleNewNote()        { router.push("/dashboard/expedientes"); }
  function handleNewAppointment() { router.push("/dashboard/agenda"); }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`
        .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .main-grid  { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }
        @media (max-width: 1024px) { .main-grid { grid-template-columns: 1fr 300px; } }
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
          .main-grid  { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-lora)", fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
          Resumen del día
        </h1>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          {capitalTodayLabel}
        </p>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard loading={loading} label="Sesiones hoy"      icon="🗓" color="accent" value={`${stats.sessionsToday}`}   sub={`${stats.confirmedToday} programadas`} />
        <StatCard loading={loading} label="Pacientes activos" icon="👤" color="green"  value={`${stats.activePatients}`}  sub={stats.newPatientsMonth > 0 ? `+${stats.newPatientsMonth} este mes` : "Sin cambios este mes"} />
        <StatCard loading={loading} label="Tests pendientes"  icon="📋" color="amber"  value={`${stats.pendingTests}`}    sub="Por revisar o responder" />
        <StatCard loading={loading} label="Horas esta semana" icon="⏱" color="blue"   value={`${stats.hoursWeek}h`}      sub={`De ${stats.estHoursWeek}h estimadas`} />
      </div>

      {/* Cuerpo */}
      <div className="main-grid">
        <SessionList
          todayAppts={todayAppts}
          tomorrowAppts={tomorrowAppts}
          weekDays={weekDays}
          todayEvents={todayEvents}
          weekLabel={weekLabel}
          onNewAppointment={handleNewAppointment}
          allWeekEvents={allWeekEvents}
        />
        <AlertsPanel
          alerts={alerts}
          progress={progress}
          onNewPatient={handleNewPatient}
          onSendTest={handleSendTest}
          onNewNote={handleNewNote}
          onNewAppointment={handleNewAppointment}
        />
      </div>
    </div>
  );
}