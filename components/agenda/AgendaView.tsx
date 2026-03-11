"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type ViewMode  = "week" | "month" | "day";
type AppStatus = "programada" | "completada" | "cancelada" | "no_asistio";
type Modality  = "presencial" | "videollamada" | "telefono";
type AppType   = "sesion" | "evaluacion" | "seguimiento" | "primera_vez" | "otro";

interface Appointment {
  id: string; patient_id: string | null; psychologist_id: string;
  title: string; start_time: string; end_time: string;
  modality: Modality; type: AppType; status: AppStatus;
  notes: string | null; cancel_reason: string | null;
  google_event_id: string | null; created_at: string;
  // join
  patient?: { id: string; first_name: string; last_name: string; email: string | null; diagnosis: string | null; };
}
interface PatientOption { id: string; first_name: string; last_name: string; email: string | null; diagnosis: string | null; }

const HOURS     = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];
const HOUR_H    = 80;
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_SHORT   = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const AVATAR_COLORS = ["#8B7355","#4A7BA7","#5C8A6E","#C47B2B","#B5594A","#7B6EA8","#A85E6A","#6A9E8A"];

const STATUS_CFG: Record<AppStatus, { bg: string; border: string; label: string; dot: string; blockBg: string }> = {
  programada:  { bg:"var(--amber-bg)", border:"var(--amber)", label:"Programada",  dot:"var(--amber)",      blockBg:"#C47B2B" },
  completada:  { bg:"var(--green-bg)", border:"var(--green)", label:"Completada",  dot:"var(--green)",      blockBg:"#5C8A6E" },
  cancelada:   { bg:"var(--red-bg)",   border:"var(--red)",   label:"Cancelada",   dot:"var(--red)",        blockBg:"#B5594A" },
  no_asistio:  { bg:"var(--surface)",  border:"var(--border)",label:"No asistió",  dot:"var(--text-muted)", blockBg:"#A8A29E" },
};
const MODALITY_CFG: Record<Modality, { label: string; icon: string }> = {
  presencial:   { label:"Presencial",   icon:"🏢" },
  videollamada: { label:"Videollamada", icon:"📹" },
  telefono:     { label:"Teléfono",     icon:"📞" },
};
const TYPE_CFG: Record<AppType, string> = {
  sesion:"Sesión", evaluacion:"Evaluación", seguimiento:"Seguimiento", primera_vez:"Primera vez", otro:"Otro",
};

const dm  = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });
function toISO(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
}
function toMin(t: string) { const [h,m] = t.split(":").map(Number); return h*60+(m||0); }
function getInitials(first: string, last: string) { return `${first[0]??''}${last[0]??''}`.toUpperCase(); }
function colorForName(name: string) { return AVATAR_COLORS[name.length % AVATAR_COLORS.length]; }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString("es-VE", { hour:"2-digit", minute:"2-digit" }); }
function fmtDateLabel(iso: string) { return new Date(iso).toLocaleDateString("es-VE", { weekday:"long", day:"numeric", month:"long" }); }

function getWeekDates(base: Date): Date[] {
  const d = new Date(base); const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => { const nd = new Date(d); nd.setDate(d.getDate() + i); return nd; });
}
function getMonthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1); const last = new Date(year, month + 1, 0);
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const cells: (Date | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function isoDateToLocal(dateStr: string, timeStr: string): string {
  // Convierte "2026-03-15" + "09:00" a ISO timestamp local
  return `${dateStr}T${timeStr}:00`;
}

// ─── Bloque de cita en calendario ────────────────────────────────────────────
function ApptBlock({ appt, onClick }: { appt: Appointment; onClick: () => void }) {
  const startMin = toMin(fmtTime(appt.start_time).replace(" a. m.","").replace(" p. m.",""));
  const top = ((toMin(fmtTime(appt.start_time)) - toMin("08:00")) / 60) * HOUR_H;
  const dur = (new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000;
  const h   = Math.max((dur / 60) * HOUR_H - 4, 28);
  const color = appt.patient ? colorForName(`${appt.patient.first_name}${appt.patient.last_name}`) : "#8B7355";
  const patientName = appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : appt.title;

  return (
    <div className="appt" onClick={onClick}
      style={{ top, height: h, background:`${color}18`, borderLeftColor: color, opacity: appt.status === "cancelada" ? 0.45 : 1, cursor:"pointer" }}>
      <div style={{ ...dm("11px"), fontWeight:600, color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {fmtTime(appt.start_time)} {patientName}
      </div>
      {h > 48 && <div style={{ ...dm("10px"), color:"var(--text-muted)", marginTop:2 }}>
        {MODALITY_CFG[appt.modality].icon} {TYPE_CFG[appt.type]}
      </div>}
    </div>
  );
}

// ─── Modal Nueva / Editar cita ────────────────────────────────────────────────
function AppointmentForm({
  initial, patients, onSave, onClose, defaultDate,
}: {
  initial?: Appointment | null;
  patients: PatientOption[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  defaultDate?: string;
}) {
  const [patientId, setPatientId]   = useState(initial?.patient_id ?? "");
  const [date, setDate]             = useState(initial ? toISO(new Date(initial.start_time)) : (defaultDate ?? toISO(new Date())));
  const [startTime, setStartTime]   = useState(initial ? fmtTime(initial.start_time) : "09:00");
  const [endTime, setEndTime]       = useState(initial ? fmtTime(initial.end_time) : "09:50");
  const [modality, setModality]     = useState<Modality>(initial?.modality ?? "presencial");
  const [type, setType]             = useState<AppType>(initial?.type ?? "sesion");
  const [notes, setNotes]           = useState(initial?.notes ?? "");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  async function handleSave() {
    if (!patientId) { setError("Selecciona un paciente"); return; }
    if (!date || !startTime || !endTime) { setError("Completa fecha y horario"); return; }
    setSaving(true); setError("");
    try {
      const patient = patients.find(p => p.id === patientId);
      await onSave({
        patientId, patientName: patient ? `${patient.first_name} ${patient.last_name}` : "",
        patientEmail: patient?.email ?? null,
        start_time: isoDateToLocal(date, startTime),
        end_time:   isoDateToLocal(date, endTime),
        modality, type, notes: notes || null,
      });
    } catch (e: any) { setError(e.message ?? "Error al guardar"); }
    finally { setSaving(false); }
  }

  const inputStyle: React.CSSProperties = { width:"100%", padding:"9px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none", boxSizing:"border-box" };
  const labelStyle: React.CSSProperties = { ...dm("11px"), color:"var(--text-muted)", marginBottom:6, display:"block", textTransform:"uppercase", letterSpacing:"0.4px", fontWeight:600 };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:70, backdropFilter:"blur(4px)" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"var(--bg-card)", borderRadius:20, padding:28, width:"min(480px,94vw)", maxHeight:"90vh", overflowY:"auto", zIndex:71, boxShadow:"0 8px 32px rgba(28,25,23,0.18)", animation:"popIn .2s ease" }}>
        <style>{`@keyframes popIn{from{transform:translate(-50%,-48%) scale(.95);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}`}</style>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
          <div>
            <div style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)" }}>{initial ? "Editar cita" : "Nueva cita"}</div>
            <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:3 }}>{initial ? "Modifica los datos de la cita" : "Completa los datos para agendar"}</div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
        </div>

        {/* Paciente */}
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Paciente</label>
          <select value={patientId} onChange={e => setPatientId(e.target.value)} style={inputStyle}>
            <option value="">— Seleccionar paciente —</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
          </select>
        </div>

        {/* Fecha */}
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Fecha</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </div>

        {/* Horario */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <label style={labelStyle}>Hora inicio</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Hora fin</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Modalidad */}
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Modalidad</label>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {(["presencial","videollamada","telefono"] as Modality[]).map(m => (
              <button key={m} onClick={() => setModality(m)}
                style={{ padding:"10px 8px", borderRadius:10, border:`1px solid ${modality===m?"var(--accent)":"var(--border)"}`, background:modality===m?"var(--accent-bg)":"var(--surface)", cursor:"pointer", textAlign:"center", transition:"all .15s" }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{MODALITY_CFG[m].icon}</div>
                <div style={{ ...dm("11px"), color:modality===m?"var(--accent)":"var(--text-secondary)", fontWeight:modality===m?600:400 }}>{MODALITY_CFG[m].label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tipo */}
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Tipo de sesión</label>
          <select value={type} onChange={e => setType(e.target.value as AppType)} style={inputStyle}>
            {Object.entries(TYPE_CFG).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Nota interna */}
        <div style={{ marginBottom:20 }}>
          <label style={labelStyle}>Nota interna (solo visible para ti)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Ej: Recordar revisar tarea, traer resultados de examen..."
            style={{ ...inputStyle, resize:"vertical", lineHeight:1.5 }} />
        </div>

        {error && <div style={{ padding:"9px 14px", borderRadius:10, background:"var(--red-bg)", ...dm("12px"), color:"var(--red)", marginBottom:14 }}>⚠ {error}</div>}

        <div style={{ display:"flex", gap:10 }}>
          <button className="btn-g" style={{ flex:1 }} onClick={onClose}>Cancelar</button>
          <button className="btn-p" style={{ flex:1, opacity:saving?0.6:1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : initial ? "Guardar cambios" : "✓ Agendar cita"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Modal Cancelar cita ──────────────────────────────────────────────────────
function CancelModal({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:80, backdropFilter:"blur(4px)" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"var(--bg-card)", borderRadius:20, padding:28, width:"min(400px,92vw)", zIndex:81, boxShadow:"0 8px 28px rgba(28,25,23,0.18)", animation:"popIn .2s ease" }}>
        <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)", marginBottom:8 }}>Cancelar cita</div>
        <div style={{ ...dm("13px"), color:"var(--text-muted)", marginBottom:16 }}>El paciente recibirá un email de notificación.</div>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Motivo de cancelación (opcional)..."
          style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box", marginBottom:16 }} />
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn-g" style={{ flex:1 }} onClick={onClose}>Volver</button>
          <button onClick={() => onConfirm(reason)} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:"var(--red)", color:"#fff", fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Cancelar cita
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Modal detalle de cita ────────────────────────────────────────────────────
function DetailModal({
  appt, onClose, onEdit, onCancel, onMarkDone, onMarkNoShow, onReschedule,
}: {
  appt: Appointment;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onMarkDone: () => void;
  onMarkNoShow: () => void;
  onReschedule: () => void;
}) {
  const cfg = STATUS_CFG[appt.status];
  const patientName = appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : appt.title;
  const color = appt.patient ? colorForName(patientName) : "#8B7355";
  const dur = (new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000;

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:70, backdropFilter:"blur(4px)" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"var(--bg-card)", borderRadius:20, padding:28, width:"min(460px,94vw)", maxHeight:"90vh", overflowY:"auto", zIndex:71, boxShadow:"0 8px 32px rgba(28,25,23,0.18)", animation:"popIn .2s ease" }}>

        {/* Encabezado */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:`${color}20`, color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, ...dm("15px"), flexShrink:0 }}>
              {appt.patient ? getInitials(appt.patient.first_name, appt.patient.last_name) : "—"}
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)" }}>{patientName}</div>
              <div style={{ display:"flex", gap:6, marginTop:5, flexWrap:"wrap" }}>
                <span className="tag" style={{ background:cfg.bg, color:cfg.border, border:`1px solid ${cfg.border}33` }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:cfg.dot, display:"inline-block", marginRight:5 }} />{cfg.label}
                </span>
                <span className="tag" style={{ background:"var(--surface)", color:"var(--text-muted)" }}>{MODALITY_CFG[appt.modality].icon} {MODALITY_CFG[appt.modality].label}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"var(--surface)", border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer", color:"var(--text-muted)", fontSize:16 }}>✕</button>
        </div>

        {/* Datos */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          {[
            ["Fecha",     fmtDateLabel(appt.start_time)],
            ["Horario",   `${fmtTime(appt.start_time)} – ${fmtTime(appt.end_time)}`],
            ["Duración",  `${dur} min`],
            ["Tipo",      TYPE_CFG[appt.type]],
          ].map(([l,v],i) => (
            <div key={i} style={{ background:"var(--surface)", borderRadius:10, padding:"11px 14px" }}>
              <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:4 }}>{l}</div>
              <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Nota interna */}
        {appt.notes && (
          <div style={{ background:"var(--amber-bg)", border:"1px solid var(--amber)22", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
            <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:4 }}>📝 Nota interna</div>
            <div style={{ ...dm("13px"), color:"var(--text-primary)", lineHeight:1.5 }}>{appt.notes}</div>
          </div>
        )}

        {/* Motivo cancelación */}
        {appt.cancel_reason && (
          <div style={{ background:"var(--red-bg)", border:"1px solid var(--red)22", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
            <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:4 }}>Motivo de cancelación</div>
            <div style={{ ...dm("13px"), color:"var(--red)", lineHeight:1.5 }}>{appt.cancel_reason}</div>
          </div>
        )}

        {/* Acciones */}
        {appt.status !== "cancelada" && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {appt.status === "programada" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <button className="btn-g" onClick={onEdit}>✏️ Editar</button>
                <button className="btn-g" onClick={onReschedule}>🔄 Reagendar</button>
                <button className="btn-g" onClick={onMarkDone} style={{ color:"var(--green)", borderColor:"var(--green)44" }}>✓ Marcar realizada</button>
                <button className="btn-g" onClick={onMarkNoShow} style={{ color:"var(--text-muted)" }}>😶 No asistió</button>
              </div>
            )}
            {appt.status === "programada" && (
              <button className="btn-g" onClick={onCancel} style={{ color:"var(--red)", borderColor:"var(--red)44", width:"100%" }}>✕ Cancelar cita</button>
            )}
            {(appt.status === "completada" || appt.status === "no_asistio") && (
              <button className="btn-g" onClick={onEdit} style={{ width:"100%" }}>✏️ Editar notas</button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── AgendaView principal ─────────────────────────────────────────────────────
export function AgendaView() {
  const supabase = createClient();
  const [view, setView]       = useState<ViewMode>("week");
  const [date, setDate]       = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients]         = useState<PatientOption[]>([]);
  const [loading, setLoading]           = useState(true);
  const [userId, setUserId]             = useState("");
  const [filter, setFilter]             = useState<AppStatus | "all">("all");

  const [detailAppt, setDetailAppt]     = useState<Appointment | null>(null);
  const [formAppt, setFormAppt]         = useState<Appointment | null | "new">(null);
  const [cancelAppt, setCancelAppt]     = useState<Appointment | null>(null);
  const [defaultFormDate, setDefaultFormDate] = useState<string>("");
  const [saving, setSaving]             = useState(false);

  const todayISO = toISO(new Date());
  const nowMin   = new Date().getHours() * 60 + new Date().getMinutes();
  const todayLineTop = ((nowMin - toMin("08:00")) / 60) * HOUR_H;

  // ── Cargar datos ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: appts }, { data: pats }] = await Promise.all([
      supabase.from("appointments").select(`*, patient:patients(id,first_name,last_name,email,diagnosis)`).eq("psychologist_id", user.id).order("start_time"),
      supabase.from("patients").select("id,first_name,last_name,email,diagnosis").eq("psychologist_id", user.id).order("first_name"),
    ]);

    setAppointments((appts ?? []).map((a: any) => ({ ...a, patient: Array.isArray(a.patient) ? a.patient[0] : a.patient })));
    setPatients((pats ?? []) as PatientOption[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Crear cita ────────────────────────────────────────────────────────────
  async function handleCreate(data: any) {
    setSaving(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, psychologistId: userId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Error al crear");
    await load();
    setFormAppt(null);
    setSaving(false);
  }

  // ── Editar cita ───────────────────────────────────────────────────────────
  async function handleEdit(data: any) {
    if (!detailAppt && formAppt === "new") return;
    const appt = detailAppt ?? (formAppt as Appointment);
    setSaving(true);
    const res = await fetch("/api/appointments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, id: appt.id, psychologistId: userId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Error al editar");
    await load();
    setFormAppt(null);
    setDetailAppt(null);
    setSaving(false);
  }

  // ── Cambiar status ────────────────────────────────────────────────────────
  async function handleStatusChange(appt: Appointment, status: AppStatus, cancelReason?: string) {
    setSaving(true);
    const patient = appt.patient;
    const res = await fetch("/api/appointments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: appt.id, psychologistId: userId, status,
        patientName:  patient ? `${patient.first_name} ${patient.last_name}` : appt.title,
        patientEmail: patient?.email ?? null,
        start_time:   appt.start_time, end_time: appt.end_time,
        modality:     appt.modality, notes: appt.notes, type: appt.type,
        cancel_reason: cancelReason ?? null,
      }),
    });
    await load();
    setDetailAppt(null);
    setCancelAppt(null);
    setSaving(false);
  }

  const weekDates  = getWeekDates(date);
  const monthCells = getMonthCells(date.getFullYear(), date.getMonth());
  const appts      = appointments.filter(a => filter === "all" || a.status === filter);

  const nav = (dir: -1 | 1) => {
    const d = new Date(date);
    if (view === "week")       d.setDate(d.getDate() + dir * 7);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else                       d.setDate(d.getDate() + dir);
    setDate(d);
  };

  const headerLabel = view === "month"
    ? `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
    : view === "week"
      ? `${weekDates[0].getDate()} – ${weekDates[6].getDate()} ${MONTH_NAMES[weekDates[6].getMonth()]}`
      : `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", gap:12 }}>
      <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin .7s linear infinite" }} />
      <span style={{ ...dm("13px"), color:"var(--text-muted)" }}>Cargando agenda...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", maxWidth:1280, margin:"0 auto" }}>
      <style>{`
        .agenda-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .agenda-day-sidebar { display: flex; }
        .agenda-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .vbtn { padding:6px 12px; border:none; border-radius:7px; background:transparent; cursor:pointer; font-family:var(--font-dm-sans); font-size:12px; color:var(--text-muted); transition:all .15s; }
        .vbtn.on { background:var(--bg-card); color:var(--text-primary); font-weight:600; box-shadow:0 1px 3px rgba(28,25,23,0.1); }
        .tbtn { padding:6px 10px; border:1px solid var(--border); border-radius:8px; background:var(--surface); cursor:pointer; font-family:var(--font-dm-sans); font-size:13px; color:var(--text-secondary); transition:all .15s; }
        .tbtn:hover { background:var(--bg-card); color:var(--text-primary); }
        .hrow { border-bottom:1px solid var(--border-light); }
        .dcol { position:relative; border-right:1px solid var(--border-light); }
        .appt { position:absolute; left:3px; right:3px; border-radius:6px; padding:5px 7px; border-left:3px solid; transition:all .15s; z-index:2; }
        .appt:hover { filter:brightness(.95); transform:scale(1.01); }
        .tline { position:absolute; left:0; right:0; height:2px; background:var(--red); z-index:3; }
        .tline::before { content:""; position:absolute; left:-4px; top:-3px; width:8px; height:8px; border-radius:50%; background:var(--red); }
        .mcell { border-right:1px solid var(--border-light); border-bottom:1px solid var(--border-light); cursor:pointer; transition:background .1s; }
        .mcell:hover { background:var(--surface) !important; }
        .mcell.tc { background:rgba(139,115,85,.04) !important; }
        .fi::-webkit-scrollbar { width:5px; height:5px; }
        .fi::-webkit-scrollbar-track { background:transparent; }
        .fi::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }
        @media (max-width: 768px) {
          .agenda-day-sidebar { display: none !important; }
          .agenda-filters span.filter-label { display: none; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, gap:12, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:24, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.3px" }}>Agenda</h1>
          <p style={{ ...dm("13px"), color:"var(--text-muted)", marginTop:4 }}>
            {appointments.filter(a => a.status === "programada" && toISO(new Date(a.start_time)) === todayISO).length} citas hoy
            {appointments.filter(a => a.status === "programada").length > 0 && ` · ${appointments.filter(a => a.status === "programada").length} próximas`}
          </p>
        </div>
        <div className="agenda-header-actions">
          <div style={{ display:"flex", background:"var(--surface)", borderRadius:10, padding:3, border:"1px solid var(--border)", gap:2 }}>
            {(["day","week","month"] as ViewMode[]).map(v => (
              <button key={v} className={`vbtn${view===v?" on":""}`} onClick={() => setView(v)}>
                {v==="day"?"Día":v==="week"?"Semana":"Mes"}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button className="tbtn" onClick={() => nav(-1)}>‹</button>
            <span style={{ ...dm("12px"), fontWeight:500, color:"var(--text-primary)", minWidth:130, textAlign:"center" }}>{headerLabel}</span>
            <button className="tbtn" onClick={() => nav(1)}>›</button>
          </div>
          <button className="tbtn" onClick={() => setDate(new Date())} style={{ ...dm("12px"), padding:"7px 12px" }}>Hoy</button>
          <button
            onClick={() => { setFormAppt("new"); setDefaultFormDate(toISO(date)); }}
            style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 16px", borderRadius:10, height:36, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"0 2px 8px rgba(139,115,85,0.35)", whiteSpace:"nowrap" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}
          >+ Nueva cita</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="agenda-filters" style={{ marginBottom:16 }}>
        <span className="filter-label" style={{ ...dm("12px"), color:"var(--text-muted)", marginRight:4 }}>Filtrar:</span>
        {(["all","programada","completada","cancelada","no_asistio"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding:"4px 12px", borderRadius:20, border:`1px solid ${filter===s?"var(--accent)":"var(--border)"}`, background:filter===s?"var(--accent-bg)":"transparent", color:filter===s?"var(--accent)":"var(--text-muted)", ...dm("12px"), cursor:"pointer", transition:"all .15s", fontWeight:filter===s?500:400 }}>
            {s==="all" ? "Todas" : STATUS_CFG[s].label}
          </button>
        ))}
        <div style={{ flex:1 }} />
        <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>{appts.length} citas</span>
      </div>

      {/* Cuerpo calendario */}
      <div style={{ flex:1, overflow:"auto", borderRadius:16, border:"1px solid var(--border-light)", background:"var(--bg-card)", boxShadow:"0 1px 3px rgba(28,25,23,0.06)" }} className="fi">

        {/* ── SEMANA ── */}
        {view === "week" && (
          <div style={{ display:"flex", flexDirection:"column", minWidth:600 }}>
            <div style={{ display:"flex", borderBottom:"2px solid var(--border-light)", background:"var(--bg-card)", position:"sticky", top:0, zIndex:8 }}>
              <div style={{ width:50, flexShrink:0 }} />
              {weekDates.map((d, i) => {
                const iso = toISO(d);
                const isToday = iso === todayISO;
                const cnt = appts.filter(a => toISO(new Date(a.start_time)) === iso).length;
                return (
                  <div key={i} style={{ flex:1, padding:"8px 4px", textAlign:"center", borderLeft:"1px solid var(--border-light)", cursor:"pointer" }} onClick={() => { setDate(d); setView("day"); }}>
                    <div style={{ ...dm("10px"), color:"var(--text-muted)", marginBottom:3 }}>{DAY_SHORT[i]}</div>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:isToday?"var(--accent)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 3px" }}>
                      <span style={{ fontFamily:"var(--font-lora)", fontSize:13, fontWeight:600, color:isToday?"#FAF7F2":"var(--text-primary)" }}>{d.getDate()}</span>
                    </div>
                    {cnt > 0 && <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", margin:"0 auto", opacity:.7 }} />}
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex" }}>
              <div style={{ width:50, flexShrink:0 }}>
                {HOURS.map((h,i) => (
                  <div key={i} style={{ height:HOUR_H, display:"flex", alignItems:"flex-start", justifyContent:"flex-end", paddingRight:8, paddingTop:4 }}>
                    <span style={{ ...dm("10px"), color:"var(--text-muted)" }}>{h}</span>
                  </div>
                ))}
              </div>
              <div style={{ flex:1, display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderLeft:"1px solid var(--border-light)" }}>
                {weekDates.map((d, di) => {
                  const iso = toISO(d);
                  const isToday = iso === todayISO;
                  const dayAppts = appts.filter(a => toISO(new Date(a.start_time)) === iso);
                  return (
                    <div key={di} className="dcol" style={{ background:isToday?"rgba(139,115,85,.02)":"transparent" }}>
                      {HOURS.map((_,hi) => <div key={hi} className="hrow" style={{ height:HOUR_H }} />)}
                      {isToday && <div className="tline" style={{ top:todayLineTop }} />}
                      {dayAppts.map(a => <ApptBlock key={a.id} appt={a} onClick={() => setDetailAppt(a)} />)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── DÍA ── */}
        {view === "day" && (
          <div style={{ display:"flex", height:"100%", minHeight:600 }}>
            <div style={{ width:50, flexShrink:0 }}>
              {HOURS.map((h,i) => <div key={i} style={{ height:HOUR_H, display:"flex", alignItems:"flex-start", justifyContent:"flex-end", paddingRight:8, paddingTop:4 }}><span style={{ ...dm("10px"), color:"var(--text-muted)" }}>{h}</span></div>)}
            </div>
            <div style={{ flex:1, borderLeft:"1px solid var(--border-light)", position:"relative" }}>
              {HOURS.map((_,i) => <div key={i} className="hrow" style={{ height:HOUR_H }} />)}
              {toISO(date) === todayISO && <div className="tline" style={{ top:todayLineTop }} />}
              {appts.filter(a => toISO(new Date(a.start_time)) === toISO(date)).map(a => <ApptBlock key={a.id} appt={a} onClick={() => setDetailAppt(a)} />)}
              {appts.filter(a => toISO(new Date(a.start_time)) === toISO(date)).length === 0 && (
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ fontSize:32 }}>📅</span>
                  <span style={{ ...dm("14px"), color:"var(--text-muted)" }}>Sin citas este día</span>
                  <button className="btn-p" style={{ marginTop:8 }} onClick={() => { setFormAppt("new"); setDefaultFormDate(toISO(date)); }}>+ Agendar cita</button>
                </div>
              )}
            </div>
            {/* Panel lateral */}
            <div className="agenda-day-sidebar" style={{ width:240, borderLeft:"1px solid var(--border-light)", padding:14, overflowY:"auto", flexShrink:0, flexDirection:"column" }}>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:15, fontWeight:600, color:"var(--text-primary)", marginBottom:14 }}>
                {date.getDate()} de {MONTH_NAMES[date.getMonth()]}
              </div>
              {appts.filter(a => toISO(new Date(a.start_time)) === toISO(date)).sort((a,b) => a.start_time.localeCompare(b.start_time)).map(appt => {
                const patientName = appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : appt.title;
                const color = appt.patient ? colorForName(patientName) : "#8B7355";
                return (
                  <div key={appt.id} onClick={() => setDetailAppt(appt)}
                    style={{ padding:"10px 12px", borderRadius:10, marginBottom:8, cursor:"pointer", border:"1px solid var(--border-light)", background:"var(--bg-card)", transition:"all .15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background="var(--bg-card)"; }}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }} />
                      <span style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{patientName}</span>
                      <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>{fmtTime(appt.start_time)}</span>
                    </div>
                    <div style={{ ...dm("11px"), color:"var(--text-muted)", marginTop:4, marginLeft:16 }}>{MODALITY_CFG[appt.modality].icon} {TYPE_CFG[appt.type]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MES ── */}
        {view === "month" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"2px solid var(--border-light)", position:"sticky", top:0, background:"var(--bg-card)", zIndex:8 }}>
              {DAY_SHORT.map((d,i) => <div key={i} style={{ padding:"8px 4px", ...dm("11px"), fontWeight:500, color:"var(--text-muted)", textAlign:"center", borderRight:i<6?"1px solid var(--border-light)":"none" }}>{d}</div>)}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
              {monthCells.map((d, i) => {
                if (!d) return <div key={i} style={{ minHeight:80, borderRight:"1px solid var(--border-light)", borderBottom:"1px solid var(--border-light)", background:"var(--surface)", opacity:.3 }} />;
                const iso = toISO(d);
                const isToday = iso === todayISO;
                const dayAppts = appts.filter(a => toISO(new Date(a.start_time)) === iso);
                return (
                  <div key={i} className={`mcell${isToday?" tc":""}`} style={{ minHeight:80, padding:6 }} onClick={() => { setDate(d); setView("day"); }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ width:22, height:22, borderRadius:"50%", background:isToday?"var(--accent)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-lora)", fontSize:12, fontWeight:isToday?600:400, color:isToday?"#FAF7F2":"var(--text-primary)" }}>{d.getDate()}</span>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {dayAppts.slice(0,2).map((a,ai) => {
                        const pName = a.patient ? a.patient.first_name : a.title.split("—")[1]?.trim() ?? a.title;
                        const color = a.patient ? colorForName(`${a.patient.first_name}${a.patient.last_name}`) : "#8B7355";
                        return (
                          <div key={ai} onClick={e => { e.stopPropagation(); setDetailAppt(a); }}
                            style={{ padding:"2px 5px", borderRadius:4, background:`${color}18`, borderLeft:`2px solid ${color}`, ...dm("9px"), color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }}>
                            {fmtTime(a.start_time)} {pName}
                          </div>
                        );
                      })}
                      {dayAppts.length > 2 && <div style={{ ...dm("9px"), color:"var(--text-muted)", paddingLeft:4 }}>+{dayAppts.length-2} más</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {formAppt !== null && (
        <AppointmentForm
          initial={formAppt === "new" ? null : formAppt}
          patients={patients}
          defaultDate={defaultFormDate}
          onSave={formAppt === "new" ? handleCreate : handleEdit}
          onClose={() => setFormAppt(null)}
        />
      )}

      {detailAppt && !formAppt && (
        <DetailModal
          appt={detailAppt}
          onClose={() => setDetailAppt(null)}
          onEdit={() => { setFormAppt(detailAppt); setDetailAppt(null); }}
          onReschedule={() => { setFormAppt(detailAppt); setDetailAppt(null); }}
          onCancel={() => { setCancelAppt(detailAppt); setDetailAppt(null); }}
          onMarkDone={() => handleStatusChange(detailAppt, "completada")}
          onMarkNoShow={() => handleStatusChange(detailAppt, "no_asistio")}
        />
      )}

      {cancelAppt && (
        <CancelModal
          onClose={() => { setCancelAppt(null); setDetailAppt(cancelAppt); }}
          onConfirm={(reason) => handleStatusChange(cancelAppt, "cancelada", reason)}
        />
      )}
    </div>
  );
}