"use client";

import { useState } from "react";

type ViewMode = "week" | "month" | "day";
type AppStatus = "confirmed" | "pending" | "cancelled" | "done";

interface Appointment {
  id: number; patientName: string; initials: string; color: string;
  tag: string; date: string; startTime: string; endTime: string;
  status: AppStatus; sessionNum: number; notes?: string;
}

const APPOINTMENTS: Appointment[] = [
  { id:1,  patientName:"María González", initials:"MG", color:"#8B7355", tag:"Ansiedad",  date:"2026-01-07", startTime:"09:00", endTime:"09:50", status:"confirmed", sessionNum:12 },
  { id:2,  patientName:"Carlos Mendoza", initials:"CM", color:"#4A7BA7", tag:"Depresión", date:"2026-01-07", startTime:"11:00", endTime:"11:50", status:"pending",   sessionNum:7  },
  { id:3,  patientName:"Ana Reyes",      initials:"AR", color:"#5C8A6E", tag:"Trauma",    date:"2026-01-07", startTime:"14:00", endTime:"14:50", status:"confirmed", sessionNum:23 },
  { id:4,  patientName:"Sofía Vargas",   initials:"SV", color:"#B5594A", tag:"Estrés",    date:"2026-01-07", startTime:"16:00", endTime:"16:50", status:"confirmed", sessionNum:1,  notes:"Primera sesión - evaluación inicial" },
  { id:5,  patientName:"Lucía Paredes",  initials:"LP", color:"#5C8A6E", tag:"Duelo",     date:"2026-01-06", startTime:"10:00", endTime:"10:50", status:"done",      sessionNum:5  },
  { id:6,  patientName:"Pedro Salas",    initials:"PS", color:"#C47B2B", tag:"TDAH",      date:"2026-01-08", startTime:"09:00", endTime:"09:50", status:"confirmed", sessionNum:9  },
  { id:7,  patientName:"Laura Díaz",     initials:"LD", color:"#B5594A", tag:"Fobia",     date:"2026-01-08", startTime:"16:00", endTime:"16:50", status:"pending",   sessionNum:3  },
  { id:8,  patientName:"Emilio Ruiz",    initials:"ER", color:"#4A7BA7", tag:"TOC",       date:"2026-01-09", startTime:"10:30", endTime:"11:20", status:"confirmed", sessionNum:14 },
  { id:9,  patientName:"Claudia Mora",   initials:"CM", color:"#8B7355", tag:"Ansiedad",  date:"2026-01-09", startTime:"13:00", endTime:"13:50", status:"confirmed", sessionNum:6  },
  { id:10, patientName:"Joaquín Torres", initials:"JT", color:"#C47B2B", tag:"TDAH",      date:"2026-01-05", startTime:"11:00", endTime:"11:50", status:"done",      sessionNum:4  },
  { id:11, patientName:"María González", initials:"MG", color:"#8B7355", tag:"Ansiedad",  date:"2026-01-10", startTime:"09:00", endTime:"09:50", status:"confirmed", sessionNum:13 },
  { id:12, patientName:"Ana Reyes",      initials:"AR", color:"#5C8A6E", tag:"Trauma",    date:"2026-01-11", startTime:"14:00", endTime:"14:50", status:"cancelled", sessionNum:24, notes:"Canceló por enfermedad" },
];

const HOURS     = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];
const HOUR_H    = 80;
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_SHORT = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const TODAY     = "2026-01-07";
const todayLineTop = ((9*60+30 - 8*60) / 60) * HOUR_H;

const STATUS_CFG: Record<AppStatus, { bg: string; border: string; label: string; dot: string }> = {
  confirmed: { bg:"var(--green-bg)", border:"var(--green)", label:"Confirmada", dot:"var(--green)"      },
  pending:   { bg:"var(--amber-bg)", border:"var(--amber)", label:"Pendiente",  dot:"var(--amber)"      },
  cancelled: { bg:"var(--red-bg)",   border:"var(--red)",   label:"Cancelada",  dot:"var(--red)"        },
  done:      { bg:"var(--surface)",  border:"var(--border)", label:"Realizada", dot:"var(--text-muted)" },
};

function toISO(d: Date) { return d.toISOString().split("T")[0]; }
function toMin(t: string) { const [h,m] = t.split(":").map(Number); return h*60+(m||0); }
const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });

function getWeekDates(base: Date): Date[] {
  const d = new Date(base);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => { const nd = new Date(d); nd.setDate(d.getDate() + i); return nd; });
}

function getMonthCells(year: number, month: number): (Date | null)[] {
  const first   = new Date(year, month, 1);
  const last    = new Date(year, month + 1, 0);
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const cells: (Date | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function ApptBlock({ appt, onClick }: { appt: Appointment; onClick: () => void }) {
  const top = ((toMin(appt.startTime) - toMin("08:00")) / 60) * HOUR_H;
  const dur = toMin(appt.endTime) - toMin(appt.startTime);
  const h   = Math.max((dur / 60) * HOUR_H - 4, 28);
  return (
    <div className="appt" onClick={onClick} style={{ top, height: h, background:`${appt.color}18`, borderLeftColor: appt.color, opacity: appt.status === "cancelled" ? 0.45 : 1 }}>
      <div style={{ ...dm("11px"), fontWeight:600, color: appt.color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{appt.startTime} {appt.patientName}</div>
      {h > 48 && <div style={{ ...dm("10px"), color:"var(--text-muted)", marginTop:2 }}>{appt.tag} · #{appt.sessionNum}</div>}
    </div>
  );
}

function Modal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const cfg = STATUS_CFG[appt.status];
  const dur = toMin(appt.endTime) - toMin(appt.startTime);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "min(440px, 94vw)" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:`${appt.color}20`, color:appt.color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, ...dm("16px") }}>{appt.initials}</div>
            <div>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)" }}>{appt.patientName}</div>
              <div style={{ display:"flex", gap:6, marginTop:5, flexWrap:"wrap" }}>
                <span className="tag" style={{ background:`${appt.color}14`, color:appt.color }}>{appt.tag}</span>
                <span className="tag" style={{ background:cfg.bg, color:cfg.border, border:`1px solid ${cfg.border}33` }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:cfg.dot, display:"inline-block", marginRight:5 }} />{cfg.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"var(--surface)", border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer", color:"var(--text-muted)", fontSize:16 }}>✕</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          {[["Fecha",appt.date],["Horario",`${appt.startTime} – ${appt.endTime}`],["Sesión",`#${appt.sessionNum}`],["Duración",`${dur} min`]].map(([l,v],i) => (
            <div key={i} style={{ background:"var(--surface)", borderRadius:10, padding:"11px 14px" }}>
              <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:4 }}>{l}</div>
              <div style={{ ...dm("14px"), fontWeight:500, color:"var(--text-primary)" }}>{v}</div>
            </div>
          ))}
        </div>
        {appt.notes && (
          <div style={{ background:"var(--amber-bg)", border:"1px solid var(--amber)22", borderRadius:10, padding:"11px 14px", marginBottom:14 }}>
            <div style={{ ...dm("11px"), color:"var(--text-muted)", marginBottom:4 }}>Nota</div>
            <div style={{ ...dm("13px"), color:"var(--text-primary)" }}>{appt.notes}</div>
          </div>
        )}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button className="btn-g">Editar</button>
          <button className="btn-g" style={{ color:"var(--red)", borderColor:"var(--red)44" }}>Cancelar cita</button>
          <button className="btn-p">Ver expediente</button>
        </div>
      </div>
    </div>
  );
}

export function AgendaView() {
  const [view, setView]       = useState<ViewMode>("week");
  const [date, setDate]       = useState(new Date("2026-01-07"));
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [filter, setFilter]   = useState<AppStatus | "all">("all");

  const weekDates  = getWeekDates(date);
  const monthCells = getMonthCells(date.getFullYear(), date.getMonth());
  const appts      = APPOINTMENTS.filter(a => filter === "all" || a.status === filter);

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

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", maxWidth:1280, margin:"0 auto" }}>
      <style>{`
        .agenda-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .agenda-day-sidebar { display: flex; }
        .agenda-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .agenda-header-actions { gap: 8px; }
          .agenda-day-sidebar { display: none !important; }
          .agenda-filters { gap: 6px; }
          .agenda-filters span:first-child { display: none; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, gap:12, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:24, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.3px" }}>Agenda</h1>
          <p style={{ ...dm("13px"), color:"var(--text-muted)", marginTop:4 }}>Gestión de citas y horarios</p>
        </div>
        <div className="agenda-header-actions">
          {/* Vista */}
          <div style={{ display:"flex", background:"var(--surface)", borderRadius:10, padding:3, border:"1px solid var(--border)", gap:2 }}>
            {(["day","week","month"] as ViewMode[]).map(v => (
              <button key={v} className={`vbtn${view===v?" on":""}`} onClick={() => setView(v)}>
                {v==="day"?"Día":v==="week"?"Semana":"Mes"}
              </button>
            ))}
          </div>
          {/* Navegación */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button className="tbtn" onClick={() => nav(-1)}>‹</button>
            <span style={{ ...dm("12px"), fontWeight:500, color:"var(--text-primary)", minWidth:120, textAlign:"center" }}>{headerLabel}</span>
            <button className="tbtn" onClick={() => nav(1)}>›</button>
          </div>
          <button className="tbtn" onClick={() => setDate(new Date(TODAY))} style={{ ...dm("12px"), padding:"7px 12px" }}>Hoy</button>
          <button
            style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 16px", borderRadius:10, height:36, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"0 2px 8px rgba(139,115,85,0.35)", whiteSpace:"nowrap" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}
          >
            + Nueva cita
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="agenda-filters" style={{ marginBottom:16 }}>
        <span style={{ ...dm("12px"), color:"var(--text-muted)", marginRight:4 }}>Filtrar:</span>
        {(["all","confirmed","pending","done","cancelled"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding:"4px 12px", borderRadius:20, border:`1px solid ${filter===s?"var(--accent)":"var(--border)"}`, background:filter===s?"var(--accent-bg)":"transparent", color:filter===s?"var(--accent)":"var(--text-muted)", ...dm("12px"), cursor:"pointer", transition:"all .15s", fontWeight:filter===s?500:400 }}>
            {s==="all"?"Todas":STATUS_CFG[s as AppStatus].label}
          </button>
        ))}
        <div style={{ flex:1 }} />
        <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>{appts.length} citas</span>
      </div>

      {/* Cuerpo */}
      <div style={{ flex:1, overflow:"auto", borderRadius:16, border:"1px solid var(--border-light)", background:"var(--bg-card)", boxShadow:"0 1px 3px rgba(28,25,23,0.06)" }} className="fi">

        {/* ── WEEK ── */}
        {view === "week" && (
          <div style={{ display:"flex", flexDirection:"column", minWidth:600 }}>
            <div style={{ display:"flex", borderBottom:"2px solid var(--border-light)", background:"var(--bg-card)", position:"sticky", top:0, zIndex:8 }}>
              <div style={{ width:50, flexShrink:0 }} />
              {weekDates.map((d, i) => {
                const iso = toISO(d);
                const isToday = iso === TODAY;
                const cnt = appts.filter(a => a.date === iso).length;
                return (
                  <div key={i} style={{ flex:1, padding:"8px 4px", textAlign:"center", borderLeft:"1px solid var(--border-light)" }}>
                    <div style={{ ...dm("10px"), color:"var(--text-muted)", marginBottom:3 }}>{DAY_SHORT[i]}</div>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:isToday?"var(--accent)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 3px" }}>
                      <span style={{ fontFamily:"var(--font-lora)", fontSize:13, fontWeight:600, color:isToday?"#FAF7F2":"var(--text-primary)" }}>{d.getDate()}</span>
                    </div>
                    {cnt > 0 && <div style={{ ...dm("9px"), color:"var(--text-muted)" }}>{cnt}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex" }}>
              <div style={{ width:50, flexShrink:0 }}>
                {HOURS.map((h, i) => (
                  <div key={i} style={{ height:HOUR_H, display:"flex", alignItems:"flex-start", justifyContent:"flex-end", paddingRight:8, paddingTop:4 }}>
                    <span style={{ ...dm("10px"), color:"var(--text-muted)" }}>{h}</span>
                  </div>
                ))}
              </div>
              <div style={{ flex:1, display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderLeft:"1px solid var(--border-light)" }}>
                {weekDates.map((d, di) => {
                  const iso = toISO(d);
                  const isToday = iso === TODAY;
                  const dayAppts = appts.filter(a => a.date === iso);
                  return (
                    <div key={di} className="dcol" style={{ background:isToday?"rgba(139,115,85,.02)":"transparent" }}>
                      {HOURS.map((_,hi) => <div key={hi} className="hrow" style={{ height:HOUR_H }} />)}
                      {isToday && <div className="tline" style={{ top:todayLineTop }} />}
                      {dayAppts.map(a => <ApptBlock key={a.id} appt={a} onClick={() => setSelected(a)} />)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── DAY ── */}
        {view === "day" && (
          <div style={{ display:"flex", height:"100%", minHeight:600 }}>
            <div style={{ width:50, flexShrink:0 }}>
              {HOURS.map((h,i) => <div key={i} style={{ height:HOUR_H, display:"flex", alignItems:"flex-start", justifyContent:"flex-end", paddingRight:8, paddingTop:4 }}><span style={{ ...dm("10px"), color:"var(--text-muted)" }}>{h}</span></div>)}
            </div>
            <div style={{ flex:1, borderLeft:"1px solid var(--border-light)", position:"relative" }}>
              {HOURS.map((_,i) => <div key={i} className="hrow" style={{ height:HOUR_H }} />)}
              {toISO(date) === TODAY && <div className="tline" style={{ top:todayLineTop }} />}
              {appts.filter(a => a.date === toISO(date)).map(a => <ApptBlock key={a.id} appt={a} onClick={() => setSelected(a)} />)}
              {appts.filter(a => a.date === toISO(date)).length === 0 && (
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ fontSize:32 }}>📅</span>
                  <span style={{ ...dm("14px"), color:"var(--text-muted)" }}>Sin citas este día</span>
                  <button className="btn-p" style={{ marginTop:8 }}>+ Agendar cita</button>
                </div>
              )}
            </div>
            {/* Panel lateral — oculto en móvil via CSS */}
            <div className="agenda-day-sidebar" style={{ width:240, borderLeft:"1px solid var(--border-light)", padding:14, overflowY:"auto", flexShrink:0, flexDirection:"column" }}>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:15, fontWeight:600, color:"var(--text-primary)", marginBottom:14 }}>
                {date.getDate()} de {MONTH_NAMES[date.getMonth()]}
              </div>
              {appts.filter(a => a.date === toISO(date)).sort((a,b) => a.startTime.localeCompare(b.startTime)).map(appt => (
                <div key={appt.id} onClick={() => setSelected(appt)}
                  style={{ padding:"10px 12px", borderRadius:10, marginBottom:8, cursor:"pointer", border:"1px solid var(--border-light)", background:"var(--bg-card)", transition:"all .15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background="var(--bg-card)"; }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:appt.color, flexShrink:0 }} />
                    <span style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{appt.patientName}</span>
                    <span style={{ ...dm("11px"), color:"var(--text-muted)" }}>{appt.startTime}</span>
                  </div>
                  <div style={{ ...dm("11px"), color:"var(--text-muted)", marginTop:4, marginLeft:16 }}>{appt.tag} · #{appt.sessionNum}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MONTH ── */}
        {view === "month" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"2px solid var(--border-light)", position:"sticky", top:0, background:"var(--bg-card)", zIndex:8 }}>
              {DAY_SHORT.map((d,i) => <div key={i} style={{ padding:"8px 4px", ...dm("11px"), fontWeight:500, color:"var(--text-muted)", textAlign:"center", borderRight:i<6?"1px solid var(--border-light)":"none" }}>{d}</div>)}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
              {monthCells.map((d, i) => {
                if (!d) return <div key={i} style={{ minHeight:70, borderRight:"1px solid var(--border-light)", borderBottom:"1px solid var(--border-light)", background:"var(--surface)", opacity:.25 }} />;
                const iso = toISO(d);
                const isToday = iso === TODAY;
                const dayAppts = appts.filter(a => a.date === iso);
                return (
                  <div key={i} className={`mcell${isToday?" tc":""}`} style={{ minHeight:70, padding:6 }} onClick={() => { setDate(d); setView("day"); }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ width:22, height:22, borderRadius:"50%", background:isToday?"var(--accent)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-lora)", fontSize:12, fontWeight:isToday?600:400, color:isToday?"#FAF7F2":"var(--text-primary)" }}>{d.getDate()}</span>
                      {dayAppts.length > 0 && <span style={{ ...dm("9px"), color:"var(--text-muted)" }}>{dayAppts.length}</span>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {dayAppts.slice(0,2).map((a,ai) => (
                        <div key={ai} onClick={e => { e.stopPropagation(); setSelected(a); }}
                          style={{ padding:"2px 4px", borderRadius:3, background:`${a.color}18`, borderLeft:`2px solid ${a.color}`, ...dm("9px"), color:a.color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }}>
                          {a.startTime} {a.patientName.split(" ")[0]}
                        </div>
                      ))}
                      {dayAppts.length > 2 && <div style={{ ...dm("9px"), color:"var(--text-muted)", paddingLeft:4 }}>+{dayAppts.length-2}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selected && <Modal appt={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}