"use client";

import { useState } from "react";

type PatientStatus = "active" | "waitlist" | "discharged" | "archived";
type Modality = "presencial" | "online" | "mixto";

interface Patient {
  id: number; name: string; initials: string; color: string;
  age: number; tag: string; status: PatientStatus; sessions: number;
  nextSession: string | null; lastSession: string; modality: Modality;
  phone: string; email: string; since: string;
  pendingTest: boolean; pendingNote: boolean;
}

const PATIENTS: Patient[] = [
  { id:1,  name:"María González",  initials:"MG", color:"#8B7355", age:34, tag:"Ansiedad",  status:"active",     sessions:12, nextSession:"Hoy 10:00",    lastSession:"hace 7 días",  modality:"presencial", phone:"+52 55 1234 5678", email:"maria.g@email.com",    since:"Mar 2024", pendingTest:true,  pendingNote:false },
  { id:2,  name:"Carlos Mendoza",  initials:"CM", color:"#4A7BA7", age:28, tag:"Depresión", status:"active",     sessions:8,  nextSession:"Hoy 11:30",    lastSession:"hace 7 días",  modality:"online",     phone:"+52 55 2345 6789", email:"carlos.m@email.com",   since:"Jun 2024", pendingTest:false, pendingNote:true  },
  { id:3,  name:"Ana Reyes",       initials:"AR", color:"#5C8A6E", age:41, tag:"Trauma",    status:"active",     sessions:23, nextSession:"Hoy 14:00",    lastSession:"hace 7 días",  modality:"presencial", phone:"+52 55 3456 7890", email:"ana.r@email.com",      since:"Ene 2024", pendingTest:false, pendingNote:false },
  { id:4,  name:"Joaquín Torres",  initials:"JT", color:"#C47B2B", age:19, tag:"TDAH",      status:"active",     sessions:5,  nextSession:"Mañana 9:00",  lastSession:"hace 7 días",  modality:"online",     phone:"+52 55 4567 8901", email:"joaquin.t@email.com",  since:"Dic 2024", pendingTest:true,  pendingNote:true  },
  { id:5,  name:"Sofía Vargas",    initials:"SV", color:"#B5594A", age:52, tag:"Estrés",    status:"active",     sessions:2,  nextSession:"Mañana 15:30", lastSession:"hace 14 días", modality:"presencial", phone:"+52 55 5678 9012", email:"sofia.v@email.com",    since:"Ene 2025", pendingTest:false, pendingNote:false },
  { id:6,  name:"Lucía Paredes",   initials:"LP", color:"#7B6EA8", age:27, tag:"TOC",       status:"active",     sessions:9,  nextSession:"Mié 11:00",    lastSession:"hace 7 días",  modality:"presencial", phone:"+52 55 6789 0123", email:"lucia.p@email.com",    since:"Sep 2024", pendingTest:false, pendingNote:false },
  { id:7,  name:"Pedro Salas",     initials:"PS", color:"#A85E6A", age:45, tag:"Fobia",     status:"active",     sessions:3,  nextSession:"Mié 14:30",    lastSession:"hace 7 días",  modality:"presencial", phone:"+52 55 7890 1234", email:"pedro.s@email.com",    since:"Dic 2024", pendingTest:false, pendingNote:true  },
  { id:8,  name:"Laura Díaz",      initials:"LD", color:"#6A9E8A", age:38, tag:"Pareja",    status:"active",     sessions:6,  nextSession:"Jue 10:00",    lastSession:"hace 7 días",  modality:"presencial", phone:"+52 55 8901 2345", email:"laura.d@email.com",    since:"Oct 2024", pendingTest:false, pendingNote:false },
  { id:9,  name:"Emilio Ruiz",     initials:"ER", color:"#4A7BA7", age:33, tag:"Burnout",   status:"active",     sessions:11, nextSession:"Jue 15:00",    lastSession:"hace 7 días",  modality:"online",     phone:"+52 55 9012 3456", email:"emilio.r@email.com",   since:"Jul 2024", pendingTest:true,  pendingNote:false },
  { id:10, name:"Claudia Mora",    initials:"CL", color:"#8B7355", age:29, tag:"Duelo",     status:"active",     sessions:7,  nextSession:"Vie 9:30",     lastSession:"hace 7 días",  modality:"presencial", phone:"+52 55 0123 4567", email:"claudia.m@email.com",  since:"Oct 2024", pendingTest:false, pendingNote:false },
  { id:11, name:"Valentina Cruz",  initials:"VC", color:"#5C8A6E", age:24, tag:"Ansiedad",  status:"waitlist",   sessions:0,  nextSession:null,            lastSession:"—",            modality:"online",     phone:"+52 55 1122 3344", email:"valentina.c@email.com",since:"Ene 2025", pendingTest:false, pendingNote:false },
  { id:12, name:"Roberto Fuentes", initials:"RF", color:"#C47B2B", age:55, tag:"Depresión", status:"discharged", sessions:18, nextSession:null,            lastSession:"hace 2 meses", modality:"presencial", phone:"+52 55 2233 4455", email:"roberto.f@email.com",  since:"Ago 2023", pendingTest:false, pendingNote:false },
];

const STATUS_META: Record<PatientStatus, { label: string; color: string; bg: string }> = {
  active:     { label:"Activo",       color:"var(--green)", bg:"var(--green-bg)" },
  waitlist:   { label:"Lista espera", color:"var(--amber)", bg:"var(--amber-bg)" },
  discharged: { label:"Alta",         color:"var(--blue)",  bg:"var(--blue-bg)"  },
  archived:   { label:"Archivado",    color:"var(--text-muted)", bg:"var(--surface)" },
};

const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });

export function PacientesView() {
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState<PatientStatus | "all">("all");
  const [filterTag, setFilterTag]       = useState("all");
  const [viewMode, setViewMode]         = useState<"grid" | "list">("list");
  const [selected, setSelected]         = useState<Patient | null>(null);

  const tags = ["all", ...Array.from(new Set(PATIENTS.map(p => p.tag)))];

  const filtered = PATIENTS.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.tag.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchTag    = filterTag === "all"    || p.tag === filterTag;
    return matchSearch && matchStatus && matchTag;
  });

  const DetailPanel = () => selected ? (
    <>
      {/* Header */}
      <div style={{ padding:"20px 20px 16px", borderBottom:"1px solid var(--border-light)", background:`${selected.color}0A` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:`${selected.color}20`, color:selected.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:600, fontFamily:"var(--font-dm-sans)" }}>{selected.initials}</div>
            <div>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>{selected.name}</div>
              <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:2 }}>{selected.age} años · desde {selected.since}</div>
            </div>
          </div>
          <button onClick={() => setSelected(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <span className="tag" style={{ background:`${selected.color}18`, color:selected.color }}>{selected.tag}</span>
          <span className="tag" style={{ background:STATUS_META[selected.status].bg, color:STATUS_META[selected.status].color }}>{STATUS_META[selected.status].label}</span>
          <span className="tag" style={{ background:"var(--surface)", color:"var(--text-secondary)" }}>{selected.modality === "online" ? "🎥 Online" : "🏥 Presencial"}</span>
        </div>
      </div>
      <div style={{ padding:"16px 20px", overflowY:"auto", flex:1 }}>
        <div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10 }}>Contacto</div>
        {[{ icon:"📞", val:selected.phone }, { icon:"📧", val:selected.email }].map((r,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid var(--border-light)" }}>
            <span>{r.icon}</span><span style={{ ...dm("13px"), color:"var(--text-primary)" }}>{r.val}</span>
          </div>
        ))}
        <div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.6px", margin:"16px 0 10px" }}>Actividad clínica</div>
        {[
          { label:"Sesiones totales", val:String(selected.sessions) },
          { label:"Última sesión",    val:selected.lastSession },
          { label:"Próxima cita",     val:selected.nextSession ?? "Sin programar" },
        ].map((r,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid var(--border-light)" }}>
            <span style={{ ...dm("12px"), color:"var(--text-muted)" }}>{r.label}</span>
            <span style={{ ...dm("13px"), color:"var(--text-primary)", fontWeight:500 }}>{r.val}</span>
          </div>
        ))}
        {(selected.pendingTest || selected.pendingNote) && (
          <div style={{ marginTop:16 }}>
            <div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8 }}>Pendientes</div>
            {selected.pendingTest && <div style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 12px", borderRadius:10, background:"var(--amber-bg)", border:"1px solid var(--amber)22", marginBottom:6 }}><span>📋</span><span style={{ ...dm("12px"), color:"var(--text-primary)" }}>Test psicológico pendiente</span></div>}
            {selected.pendingNote && <div style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 12px", borderRadius:10, background:"var(--red-bg)", border:"1px solid var(--red)22" }}><span>📝</span><span style={{ ...dm("12px"), color:"var(--text-primary)" }}>Nota de sesión sin completar</span></div>}
          </div>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:20 }}>
          <button className="btn-p" style={{ width:"100%" }}>📂 Ver expediente completo</button>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button className="btn-g" style={{ fontSize:12 }}>📅 Agendar cita</button>
            <button className="btn-g" style={{ fontSize:12 }}>📋 Enviar test</button>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", maxWidth:1280, margin:"0 auto" }}>
      <style>{`
        .pac-search { width: 220px; }
        .pac-view-toggle { display: flex; }
        .pac-table-header { display: grid; }
        .pac-table-row { display: grid; }
        .pac-detail-desktop { display: flex; }
        .pac-detail-mobile { display: none; }
        .pac-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .pac-search { width: 100%; }
          .pac-view-toggle { display: none; }
          .pac-table-header { display: none !important; }
          .pac-table-row {
            grid-template-columns: 1fr auto !important;
            gap: 8px !important;
          }
          .pac-table-row > *:not(:first-child):not(:last-child) { display: none; }
          .pac-detail-desktop { display: none !important; }
          .pac-detail-mobile { display: flex !important; }
          .pac-filters { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; }
          .pac-filters::-webkit-scrollbar { display: none; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, gap:12, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:24, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.3px" }}>Pacientes</h1>
          <p style={{ ...dm("13px"), color:"var(--text-muted)", marginTop:4 }}>{filtered.length} pacientes · {PATIENTS.filter(p => p.status==="active").length} activos</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", width:"100%" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"7px 14px", flex:1 }}>
            <span style={{ color:"var(--text-muted)" }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar paciente o diagnóstico..."
              className="pac-search"
              style={{ border:"none", background:"transparent", outline:"none", ...dm("13px"), color:"var(--text-primary)", minWidth:0 }}
            />
          </div>
          <div className="pac-view-toggle" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:3, gap:2 }}>
            {(["list","grid"] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding:"5px 10px", borderRadius:8, border:"none", cursor:"pointer", transition:"all .15s", background:viewMode===v?"var(--bg-card)":"transparent", color:viewMode===v?"var(--text-primary)":"var(--text-secondary)", fontSize:14 }}>
                {v==="list"?"☰":"⊞"}
              </button>
            ))}
          </div>
          <button
            style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 18px", borderRadius:10, height:38, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"0 2px 8px rgba(139,115,85,0.35)", whiteSpace:"nowrap" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}
          >
            + Nuevo paciente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="pac-filters" style={{ marginBottom:16 }}>
        <span style={{ ...dm("12px"), color:"var(--text-muted)", flexShrink:0 }}>Estado:</span>
        {(["all","active","waitlist","discharged","archived"] as const).map(s => (
          <span key={s} className={`chip${filterStatus===s?" on":""}`} onClick={() => setFilterStatus(s)} style={{ cursor:"pointer", flexShrink:0 }}>
            {s==="all"?"Todos":STATUS_META[s as PatientStatus]?.label}
          </span>
        ))}
        <div style={{ width:1, height:20, background:"var(--border)", margin:"0 4px", flexShrink:0 }} />
        {tags.map(t => (
          <span key={t} className={`chip${filterTag===t?" on":""}`} onClick={() => setFilterTag(t)} style={{ cursor:"pointer", flexShrink:0 }}>
            {t==="all"?"Todos":t}
          </span>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ display:"flex", flex:1, overflow:"hidden", gap:16 }}>
        <div style={{ flex:1, overflowY:"auto" }}>
          {viewMode === "list" ? (
            <div className="card" style={{ overflow:"hidden" }}>
              {/* Cabecera tabla — oculta en móvil */}
              <div className="pac-table-header" style={{ gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr auto", gap:12, padding:"10px 18px", borderBottom:"1px solid var(--border-light)", background:"var(--surface)" }}>
                {["Paciente","Diagnóstico","Estado","Sesiones","Próxima cita","Modalidad",""].map((h,i) => (
                  <span key={i} style={{ ...dm("11px"), fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</span>
                ))}
              </div>
              {filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelected(p.id === selected?.id ? null : p)}
                  className="pac-table-row"
                  style={{
                    gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr auto",
                    gap:12, padding:"13px 18px", alignItems:"center",
                    borderBottom:"1px solid var(--border-light)", cursor:"pointer", transition:"all .15s",
                    background:selected?.id===p.id?"var(--accent-bg)":"transparent",
                    borderLeft:selected?.id===p.id?"3px solid var(--accent)":"3px solid transparent",
                  }}
                  onMouseEnter={e => { if (selected?.id!==p.id) (e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
                  onMouseLeave={e => { if (selected?.id!==p.id) (e.currentTarget as HTMLDivElement).style.background="transparent"; }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:`${p.color}18`, color:p.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>{p.initials}</div>
                    <div>
                      <div style={{ ...dm("13px"), fontWeight:500, color:"var(--text-primary)" }}>{p.name}</div>
                      <div style={{ ...dm("11px"), color:"var(--text-muted)" }}>{p.age} años · {p.tag}</div>
                    </div>
                    {p.pendingTest && <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--amber)", flexShrink:0 }} />}
                    {p.pendingNote && <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--red)", flexShrink:0 }} />}
                  </div>
                  <div><span className="tag" style={{ background:`${p.color}14`, color:p.color }}>{p.tag}</span></div>
                  <div><span className="tag" style={{ background:STATUS_META[p.status].bg, color:STATUS_META[p.status].color }}>{STATUS_META[p.status].label}</span></div>
                  <div style={{ ...dm("13px"), color:"var(--text-secondary)" }}>{p.sessions}</div>
                  <div style={{ ...dm("12px"), color:p.nextSession?"var(--text-primary)":"var(--text-muted)" }}>{p.nextSession??"—"}</div>
                  <div><span className="tag" style={{ background:"var(--surface)", color:"var(--text-secondary)" }}>{p.modality==="online"?"🎥 Online":p.modality==="presencial"?"🏥 Presencial":"↔ Mixto"}</span></div>
                  <button className="btn-g" style={{ padding:"5px 10px", fontSize:11 }}>Ver</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
              {filtered.map(p => (
                <div
                  key={p.id}
                  className="card"
                  onClick={() => setSelected(p.id===selected?.id?null:p)}
                  style={{ padding:16, cursor:"pointer", borderColor:selected?.id===p.id?"var(--accent-light)":"var(--border-light)", background:selected?.id===p.id?"var(--accent-bg)":"var(--bg-card)", transition:"all .2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(0)"; }}
                >
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                    <div style={{ width:40, height:40, borderRadius:"50%", background:`${p.color}18`, color:p.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, fontFamily:"var(--font-dm-sans)" }}>{p.initials}</div>
                    <span className="tag" style={{ background:STATUS_META[p.status].bg, color:STATUS_META[p.status].color }}>{STATUS_META[p.status].label}</span>
                  </div>
                  <div style={{ ...dm("14px"), fontWeight:600, color:"var(--text-primary)", marginBottom:2 }}>{p.name}</div>
                  <div style={{ ...dm("12px"), color:"var(--text-muted)", marginBottom:10 }}>{p.age} años · {p.sessions} sesiones</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <span className="tag" style={{ background:`${p.color}14`, color:p.color }}>{p.tag}</span>
                    {p.pendingTest && <span className="tag" style={{ background:"var(--amber-bg)", color:"var(--amber)" }}>📋 Test</span>}
                  </div>
                  {p.nextSession && <div style={{ marginTop:10, ...dm("12px"), color:"var(--text-secondary)" }}>🗓 {p.nextSession}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel detalle — desktop: sidebar derecho */}
        {selected && (
          <div className="pac-detail-desktop" style={{ width:300, flexShrink:0, borderRadius:16, overflow:"hidden", border:"1px solid var(--border-light)", background:"var(--bg-card)", boxShadow:"0 1px 3px rgba(28,25,23,0.06)", flexDirection:"column", animation:"slideIn .25s ease" }}>
            <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
            <DetailPanel />
          </div>
        )}
      </div>

      {/* Panel detalle — móvil: bottom sheet */}
      {selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:60, backdropFilter:"blur(2px)" }}
            className="pac-detail-mobile"
          />
          <div
            className="pac-detail-mobile"
            style={{
              position:"fixed", bottom:0, left:0, right:0,
              background:"var(--bg-card)", borderRadius:"20px 20px 0 0",
              border:"1px solid var(--border-light)",
              boxShadow:"0 -4px 24px rgba(0,0,0,0.12)",
              zIndex:61, maxHeight:"85vh",
              flexDirection:"column",
              animation:"slideUp .25s ease",
            }}
          >
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            {/* Handle */}
            <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:"var(--border)" }} />
            </div>
            <DetailPanel />
          </div>
        </>
      )}
    </div>
  );
}