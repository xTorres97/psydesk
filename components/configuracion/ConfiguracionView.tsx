"use client";

import { useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import type { Theme } from "@/context/PreferencesContext";

type ConfigSection = "perfil" | "consultorio" | "notificaciones" | "seguridad" | "facturacion" | "apariencia" | "integraciones";

const CONFIG_SECTIONS: { id: ConfigSection; icon: string; label: string; desc: string }[] = [
  { id:"perfil",         icon:"👤", label:"Perfil profesional", desc:"Datos personales y credenciales"   },
  { id:"consultorio",    icon:"🏥", label:"Consultorio",        desc:"Horarios, dirección y políticas"   },
  { id:"notificaciones", icon:"🔔", label:"Notificaciones",     desc:"Recordatorios y alertas"           },
  { id:"seguridad",      icon:"🔐", label:"Seguridad",          desc:"Contraseña y autenticación"        },
  { id:"facturacion",    icon:"💳", label:"Facturación",        desc:"Plan, pagos y suscripción"         },
  { id:"apariencia",     icon:"🎨", label:"Apariencia",         desc:"Tema, idioma y preferencias"       },
  { id:"integraciones",  icon:"🔗", label:"Integraciones",      desc:"Google, Zoom, WhatsApp"            },
];

const ACCENT_PALETTE = [
  { color:"#8B7355", name:"Café cálido"  },
  { color:"#4A7BA7", name:"Azul sereno"  },
  { color:"#5C8A6E", name:"Verde salvia" },
  { color:"#B5594A", name:"Terracota"    },
  { color:"#7B6EA8", name:"Lavanda"      },
  { color:"#C47B2B", name:"Ámbar"        },
  { color:"#1C1917", name:"Grafito"      },
];

function Toggle({ checked, onChange, color = "var(--accent)" }: { checked: boolean; onChange: () => void; color?: string }) {
  return (
    <div onClick={onChange} style={{ width:44, height:24, borderRadius:12, background:checked?color:"var(--surface-2)", cursor:"pointer", transition:"background .2s", position:"relative", border:`1px solid ${checked?color:"var(--border)"}`, flexShrink:0 }}>
      <div style={{ width:18, height:18, borderRadius:9, background:"#FFFFFF", position:"absolute", top:2, left:checked?22:2, transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.15)" }} />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:hint?3:7 }}>{label}</div>
      {hint && <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginBottom:7 }}>{hint}</div>}
      {children}
    </div>
  );
}

function CardSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="card" style={{ padding:"20px 22px", marginBottom:20, borderRadius:16, ...style }}>{children}</div>;
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily:"var(--font-lora)", fontSize:15, fontWeight:600, color:"var(--text-primary)", marginBottom:14 }}>{children}</div>;
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid var(--border-light)", gap:10, flexWrap:"wrap" }}>{children}</div>
);

export function ConfiguracionView() {
  const [section, setSection]       = useState<ConfigSection>("perfil");
  const [saved, setSaved]           = useState(false);
  const [lang, setLang]             = useState("es-MX");
  const [twoFactor, setTwoFactor]   = useState(true);
  const [autoLogout, setAutoLogout] = useState(true);
  const [sessionLog, setSessionLog] = useState(true);
  const [notif, setNotif] = useState({
    emailReminder:true, smsReminder:false, whatsapp:true,
    sessionCancel:true, newPatient:true, testComplete:true,
    weeklyReport:false, loginAlert:true,
    reminder24h:true, reminder1h:true, reminderCustom:false,
  });

  const { theme, accentColor, setTheme, setAccentColor } = usePreferences();

  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"9px 12px", borderRadius:10, border:"1px solid var(--border)",
    background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)",
    fontSize:13, outline:"none", transition:"border-color .15s",
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const current = CONFIG_SECTIONS.find(s => s.id === section)!;

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      <style>{`
        .cfg-sidebar        { display: flex; }
        .cfg-mobile-select  { display: none; }
        .cfg-grid-2         { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cfg-grid-3         { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
        .cfg-grid-3f        { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
        .cfg-integ-actions  { display: flex; gap: 8px; align-items: center; }

        @media (max-width: 768px) {
          .cfg-sidebar       { display: none !important; }
          .cfg-mobile-select { display: flex !important; }
          .cfg-grid-2        { grid-template-columns: 1fr !important; gap: 0; }
          .cfg-grid-3        { grid-template-columns: 1fr 1fr !important; }
          .cfg-grid-3f       { grid-template-columns: 1fr !important; }
          .cfg-integ-actions { flex-wrap: wrap; }
        }

        .theme-card {
          padding: 14px 10px; border-radius: 12px; cursor: pointer;
          text-align: center; transition: all .2s;
          border: 2px solid var(--border-light);
          background: var(--surface);
        }
        .theme-card:hover { border-color: var(--accent-light); }
        .theme-card.selected { border-color: var(--accent); background: var(--accent-bg); }
        .theme-card .tc-label {
          font-family: var(--font-dm-sans); font-size: 13px;
          color: var(--text-secondary); font-weight: 400; transition: color .2s;
        }
        .theme-card.selected .tc-label { color: var(--accent); font-weight: 600; }

        .acc-swatch {
          width: 28px; height: 28px; border-radius: 8px;
          cursor: pointer; transition: transform .15s, box-shadow .15s;
          border: 2px solid transparent; position: relative;
        }
        .acc-swatch:hover { transform: scale(1.1); }
        .acc-swatch.selected {
          border-color: var(--text-primary); transform: scale(1.18);
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
        }
        .acc-swatch.selected::after {
          content: '✓'; position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.5);
        }
      `}</style>

      {/* Menú lateral — desktop */}
      <div className="cfg-sidebar" style={{ width:230, flexShrink:0, borderRight:"1px solid var(--border-light)", background:"var(--bg-card)", padding:"16px 10px", overflowY:"auto", borderRadius:16, marginRight:20, flexDirection:"column" }}>
        <div style={{ fontFamily:"var(--font-lora)", fontSize:15, fontWeight:600, color:"var(--text-primary)", padding:"4px 10px", marginBottom:14 }}>Configuración</div>
        {CONFIG_SECTIONS.map(s => (
          <div key={s.id} onClick={() => setSection(s.id)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, cursor:"pointer", transition:"all .15s", marginBottom:2, background:section===s.id?"var(--accent-bg)":"transparent", borderLeft:`3px solid ${section===s.id?"var(--accent)":"transparent"}` }}
            onMouseEnter={e => { if (section!==s.id) (e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
            onMouseLeave={e => { if (section!==s.id) (e.currentTarget as HTMLDivElement).style.background="transparent"; }}
          >
            <span style={{ fontSize:17, flexShrink:0 }}>{s.icon}</span>
            <div>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:section===s.id?"var(--accent)":"var(--text-primary)" }}>{s.label}</div>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex:1, overflowY:"auto" }}>
        <div style={{ maxWidth:640 }}>

          {/* Selector móvil */}
          <div className="cfg-mobile-select" style={{ alignItems:"center", gap:10, marginBottom:20 }}>
            <select value={section} onChange={e => setSection(e.target.value as ConfigSection)}
              style={{ flex:1, border:"1px solid var(--border)", borderRadius:10, padding:"9px 12px", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none" }}
            >
              {CONFIG_SECTIONS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
            </select>
          </div>

          {/* Header sección */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:20, fontWeight:600, color:"var(--text-primary)" }}>{current.icon} {current.label}</div>
              <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginTop:3 }}>{current.desc}</div>
            </div>
            <button onClick={handleSave}
              style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 16px", borderRadius:10, height:36, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"0 2px 8px rgba(139,115,85,0.35)", whiteSpace:"nowrap" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity="0.9"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity="1"; }}
            >Guardar cambios</button>
          </div>

          {/* ── PERFIL ── */}
          {section === "perfil" && (
            <>
              <CardSection>
                <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:20, flexWrap:"wrap" }}>
                  <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,var(--accent-light),var(--accent))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, color:"#FAF7F2", fontFamily:"var(--font-dm-sans)", fontWeight:600, flexShrink:0 }}>DL</div>
                  <div>
                    <div style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>Dra. Laura Martínez</div>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)", marginBottom:8 }}>laura.martinez@psydesk.mx</div>
                    <button className="btn-g" style={{ fontSize:12, padding:"6px 12px" }}>Cambiar foto</button>
                  </div>
                </div>
                <div className="cfg-grid-2">
                  <Field label="Nombre"><input style={inputStyle} defaultValue="Laura" /></Field>
                  <Field label="Apellidos"><input style={inputStyle} defaultValue="Martínez Reyes" /></Field>
                  <Field label="Cédula profesional"><input style={inputStyle} defaultValue="12345678" /></Field>
                  <Field label="Especialidad"><input style={inputStyle} defaultValue="Psicología Clínica" /></Field>
                  <Field label="Teléfono"><input style={inputStyle} defaultValue="+52 55 9999 0000" /></Field>
                  <Field label="País / Región">
                    <select style={inputStyle} defaultValue="MX">
                      <option value="MX">México</option><option value="ES">España</option>
                      <option value="AR">Argentina</option><option value="CO">Colombia</option>
                    </select>
                  </Field>
                </div>
                <Field label="Bio profesional" hint="Aparece en el portal del paciente">
                  <textarea style={{ ...inputStyle, minHeight:90, resize:"vertical" } as React.CSSProperties} defaultValue="Psicóloga clínica con especialidad en Terapia Cognitivo-Conductual. 8 años de experiencia en el tratamiento de ansiedad, depresión y trauma." />
                </Field>
              </CardSection>
              <CardSection>
                <SecTitle>Formación y certificaciones</SecTitle>
                {[
                  { title:"Maestría en Psicología Clínica", inst:"UNAM",          year:"2018" },
                  { title:"Certificación TCC",              inst:"Beck Institute", year:"2020" },
                ].map((c,i) => (
                  <Row key={i}>
                    <div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{c.title}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{c.inst} · {c.year}</div>
                    </div>
                    <button className="btn-g" style={{ fontSize:11, padding:"5px 10px" }}>Editar</button>
                  </Row>
                ))}
                <button className="btn-g" style={{ marginTop:12, fontSize:12 }}>+ Agregar certificación</button>
              </CardSection>
            </>
          )}

          {/* ── CONSULTORIO ── */}
          {section === "consultorio" && (
            <>
              <CardSection>
                <SecTitle>Datos del consultorio</SecTitle>
                <Field label="Nombre del consultorio"><input style={inputStyle} defaultValue="Consultorio Dra. Laura Martínez" /></Field>
                <Field label="Dirección"><input style={inputStyle} defaultValue="Av. Insurgentes Sur 1234, Col. Del Valle, CDMX" /></Field>
                <div className="cfg-grid-2">
                  <Field label="Duración por defecto">
                    <select style={inputStyle}><option>50 minutos</option><option>45 minutos</option><option>60 minutos</option><option>80 minutos</option></select>
                  </Field>
                  <Field label="Tiempo entre citas">
                    <select style={inputStyle}><option>10 minutos</option><option>15 minutos</option><option>20 minutos</option></select>
                  </Field>
                </div>
              </CardSection>
              <CardSection>
                <SecTitle>Horario de atención</SecTitle>
                {["Lunes","Martes","Miércoles","Jueves","Viernes"].map((d,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid var(--border-light)", flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)", width:80, flexShrink:0 }}>{d}</span>
                    <input style={{ ...inputStyle, width:86 }} defaultValue="09:00" type="time" />
                    <span style={{ color:"var(--text-muted)", fontSize:12 }}>—</span>
                    <input style={{ ...inputStyle, width:86 }} defaultValue="18:00" type="time" />
                    <Toggle checked={true} onChange={() => {}} />
                  </div>
                ))}
                {["Sábado","Domingo"].map((d,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i===0?"1px solid var(--border-light)":"none" }}>
                    <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", width:80 }}>{d}</span>
                    <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)", flex:1 }}>No disponible</span>
                    <Toggle checked={false} onChange={() => {}} />
                  </div>
                ))}
              </CardSection>
              <CardSection>
                <SecTitle>Políticas de cancelación</SecTitle>
                <Field label="Aviso mínimo para cancelar sin penalización">
                  <select style={inputStyle}><option>24 horas</option><option>48 horas</option><option>72 horas</option><option>Sin política</option></select>
                </Field>
                <Field label="Mensaje para pacientes al confirmar cita">
                  <textarea style={{ ...inputStyle, minHeight:80, resize:"vertical" } as React.CSSProperties} defaultValue="Recuerda que debes confirmar o cancelar tu cita con al menos 24 horas de anticipación." />
                </Field>
              </CardSection>
            </>
          )}

          {/* ── NOTIFICACIONES ── */}
          {section === "notificaciones" && (
            <>
              <CardSection>
                <SecTitle>Recordatorios a pacientes</SecTitle>
                {[
                  { key:"reminder24h" as const,    label:"Recordatorio 24h antes",     desc:"Se envía automáticamente el día anterior" },
                  { key:"reminder1h" as const,     label:"Recordatorio 1h antes",      desc:"Recordatorio de último momento"           },
                  { key:"reminderCustom" as const, label:"Recordatorio personalizado", desc:"Define tu propio tiempo de envío"         },
                ].map(n => (
                  <Row key={n.key}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{n.label}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{n.desc}</div>
                    </div>
                    <Toggle checked={notif[n.key]} onChange={() => setNotif(p => ({ ...p, [n.key]: !p[n.key] }))} />
                  </Row>
                ))}
              </CardSection>
              <CardSection>
                <SecTitle>Canales de envío</SecTitle>
                {[
                  { key:"emailReminder" as const, label:"Correo electrónico", desc:"Requiere email del paciente"  },
                  { key:"smsReminder" as const,   label:"SMS",                desc:"Costo adicional por mensaje" },
                  { key:"whatsapp" as const,      label:"WhatsApp",           desc:"Requiere integración activa" },
                ].map(n => (
                  <Row key={n.key}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{n.label}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{n.desc}</div>
                    </div>
                    <Toggle checked={notif[n.key]} onChange={() => setNotif(p => ({ ...p, [n.key]: !p[n.key] }))} />
                  </Row>
                ))}
              </CardSection>
              <CardSection>
                <SecTitle>Alertas del sistema</SecTitle>
                {[
                  { key:"sessionCancel" as const, label:"Cancelación de cita",   desc:"Cuando un paciente cancele"             },
                  { key:"newPatient" as const,    label:"Nuevo paciente",         desc:"Cuando se registre un nuevo paciente"   },
                  { key:"testComplete" as const,  label:"Test completado",        desc:"Cuando un paciente complete un test"    },
                  { key:"weeklyReport" as const,  label:"Reporte semanal",        desc:"Resumen de actividad cada lunes"        },
                  { key:"loginAlert" as const,    label:"Alerta de nuevo acceso", desc:"Si hay login desde dispositivo nuevo"   },
                ].map(n => (
                  <Row key={n.key}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{n.label}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{n.desc}</div>
                    </div>
                    <Toggle checked={notif[n.key]} onChange={() => setNotif(p => ({ ...p, [n.key]: !p[n.key] }))} />
                  </Row>
                ))}
              </CardSection>
            </>
          )}

          {/* ── SEGURIDAD ── */}
          {section === "seguridad" && (
            <>
              <CardSection>
                <SecTitle>Cambiar contraseña</SecTitle>
                <Field label="Contraseña actual"><input type="password" style={inputStyle} placeholder="••••••••" /></Field>
                <Field label="Nueva contraseña"><input type="password" style={inputStyle} placeholder="••••••••" /></Field>
                <Field label="Confirmar nueva contraseña"><input type="password" style={inputStyle} placeholder="••••••••" /></Field>
                <button className="btn-p" style={{ marginTop:4 }}>Actualizar contraseña</button>
              </CardSection>
              <CardSection>
                <SecTitle>Opciones de seguridad</SecTitle>
                {[
                  { label:"Autenticación de dos factores (2FA)", desc:"Agrega una capa extra de seguridad al iniciar sesión", state:twoFactor, set:setTwoFactor },
                  { label:"Cierre de sesión automático",         desc:"Cerrar sesión tras 30 minutos de inactividad",         state:autoLogout, set:setAutoLogout },
                  { label:"Registro de accesos",                  desc:"Guardar log de todos los inicios de sesión",           state:sessionLog, set:setSessionLog },
                ].map((o,i) => (
                  <Row key={i}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{o.label}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{o.desc}</div>
                    </div>
                    <Toggle checked={o.state} onChange={() => o.set(!o.state)} color="var(--green)" />
                  </Row>
                ))}
              </CardSection>
              <CardSection>
                <SecTitle>Sesiones activas</SecTitle>
                {[
                  { device:"MacBook Pro · Chrome", loc:"Ciudad de México", time:"Ahora mismo",  current:true  },
                  { device:"iPhone 14 · Safari",   loc:"Ciudad de México", time:"Hace 2 horas", current:false },
                ].map((s,i) => (
                  <Row key={i}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                        <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{s.device}</span>
                        {s.current && <span style={{ background:"var(--green-bg)", color:"var(--green)", padding:"1px 7px", borderRadius:10, fontSize:10, fontFamily:"var(--font-dm-sans)", fontWeight:600 }}>Actual</span>}
                      </div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>{s.loc} · {s.time}</div>
                    </div>
                    {!s.current && <button className="btn-g" style={{ fontSize:11, padding:"5px 10px", color:"var(--red)", borderColor:"var(--red)" }}>Cerrar</button>}
                  </Row>
                ))}
              </CardSection>
            </>
          )}

          {/* ── FACTURACIÓN ── */}
          {section === "facturacion" && (
            <>
              <CardSection>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                  <div>
                    <div style={{ fontFamily:"var(--font-lora)", fontSize:15, fontWeight:600, color:"var(--text-primary)", marginBottom:4 }}>Plan Pro</div>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-secondary)" }}>Facturación mensual · Próximo cobro: 7 Feb 2026</div>
                  </div>
                  <span style={{ background:"var(--accent-bg)", color:"var(--accent)", padding:"4px 12px", borderRadius:20, fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:600 }}>Activo</span>
                </div>
                <div className="cfg-grid-3f" style={{ marginTop:16 }}>
                  {[{ label:"Pacientes", val:"34 / ∞" }, { label:"Almacenamiento", val:"2.1 / 10 GB" }, { label:"Tests enviados", val:"12 / ∞" }].map((s,i) => (
                    <div key={i} style={{ background:"var(--surface)", borderRadius:10, padding:"10px 12px" }}>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:10, color:"var(--text-muted)", marginBottom:2 }}>{s.label}</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:14, fontWeight:600, color:"var(--text-primary)" }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </CardSection>
              <CardSection>
                <SecTitle>Método de pago</SecTitle>
                <Row>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <div style={{ width:40, height:26, borderRadius:5, background:"var(--blue)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:10, fontFamily:"var(--font-dm-sans)", fontWeight:700, flexShrink:0 }}>VISA</div>
                    <div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)" }}>•••• •••• •••• 4242</div>
                      <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)" }}>Vence 09/27</div>
                    </div>
                  </div>
                  <button className="btn-g" style={{ fontSize:11, padding:"5px 10px" }}>Cambiar</button>
                </Row>
              </CardSection>
              <CardSection>
                <SecTitle>Historial de pagos</SecTitle>
                {[{ date:"7 Ene 2026", amount:"$29.00" }, { date:"7 Dic 2025", amount:"$29.00" }, { date:"7 Nov 2025", amount:"$29.00" }].map((p,i) => (
                  <Row key={i}>
                    <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)" }}>{p.date}</span>
                    <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{p.amount}</span>
                    <span style={{ background:"var(--green-bg)", color:"var(--green)", padding:"2px 10px", borderRadius:20, fontFamily:"var(--font-dm-sans)", fontSize:11, fontWeight:500 }}>Pagado</span>
                    <button className="btn-g" style={{ fontSize:11, padding:"5px 10px" }}>Factura</button>
                  </Row>
                ))}
              </CardSection>
            </>
          )}

          {/* ── APARIENCIA ── */}
          {section === "apariencia" && (
            <>
              <CardSection>
                <SecTitle>Tema de la interfaz</SecTitle>
                <div className="cfg-grid-3">
                  {([
                    ["light", "☀️", "Claro",      "Fondos claros y cálidos"],
                    ["dark",  "🌙", "Oscuro",     "Ideal para sesiones nocturnas"],
                    ["auto",  "💻", "Automático", "Sigue al sistema operativo"],
                  ] as [Theme, string, string, string][]).map(([v, ic, l, hint]) => (
                    <div key={v}
                      className={`theme-card${theme===v?" selected":""}`}
                      onClick={() => setTheme(v)}
                      title={hint}
                    >
                      <div style={{ fontSize:26, marginBottom:6 }}>{ic}</div>
                      <div className="tc-label">{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:14, padding:"12px 14px", borderRadius:12, background:"var(--surface)", border:"1px solid var(--border-light)", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:14 }}>{theme==="light"?"☀️":theme==="dark"?"🌙":"💻"}</span>
                  <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-secondary)" }}>
                    {theme==="light" ? "Modo claro activo" : theme==="dark" ? "Modo oscuro activo" : "Siguiendo preferencia del sistema"}
                  </span>
                  <span style={{ marginLeft:"auto", fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--accent)", fontWeight:500, background:"var(--accent-bg)", padding:"2px 8px", borderRadius:20 }}>Activo</span>
                </div>
              </CardSection>

              <CardSection>
                <SecTitle>Color de acento</SecTitle>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
                  {ACCENT_PALETTE.map(({ color, name }) => (
                    <div
                      key={color}
                      className={`acc-swatch${accentColor===color?" selected":""}`}
                      style={{ background:color }}
                      onClick={() => setAccentColor(color)}
                      title={name}
                    />
                  ))}
                </div>
                <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:20, height:20, borderRadius:6, background:accentColor, flexShrink:0 }} />
                  <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-secondary)" }}>
                    {ACCENT_PALETTE.find(p => p.color===accentColor)?.name ?? "Personalizado"} · {accentColor}
                  </span>
                </div>
                <div style={{ marginTop:14, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  <button style={{ background:"var(--accent)", color:"#fff", border:"none", padding:"6px 14px", borderRadius:8, fontFamily:"var(--font-dm-sans)", fontSize:12, cursor:"default" }}>Botón primario</button>
                  <span style={{ background:"var(--accent-bg)", color:"var(--accent)", padding:"4px 10px", borderRadius:20, fontFamily:"var(--font-dm-sans)", fontSize:12 }}>Badge activo</span>
                  <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--accent)", fontWeight:600 }}>Enlace</span>
                </div>
              </CardSection>

              <CardSection>
                <SecTitle>Idioma y formato</SecTitle>
                <Field label="Idioma">
                  <select style={inputStyle} value={lang} onChange={e => setLang(e.target.value)}>
                    <option value="es-MX">Español (México)</option>
                    <option value="es-ES">Español (España)</option>
                    <option value="es-AR">Español (Argentina)</option>
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </Field>
                <div className="cfg-grid-2">
                  <Field label="Formato de fecha">
                    <select style={inputStyle}><option>DD/MM/AAAA</option><option>MM/DD/AAAA</option><option>AAAA-MM-DD</option></select>
                  </Field>
                  <Field label="Formato de hora">
                    <select style={inputStyle}><option>12 horas (AM/PM)</option><option>24 horas</option></select>
                  </Field>
                </div>
              </CardSection>
            </>
          )}

          {/* ── INTEGRACIONES ── */}
          {section === "integraciones" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { icon:"📅", name:"Google Calendar",      desc:"Sincroniza citas automáticamente con tu calendario de Google.", connected:true,  color:"#4A7BA7" },
                { icon:"🎥", name:"Google Meet / Zoom",   desc:"Genera links de videollamada automáticos para sesiones online.", connected:false, color:"#5C8A6E" },
                { icon:"💬", name:"WhatsApp Business",    desc:"Envía recordatorios de citas y tests por WhatsApp.",            connected:true,  color:"#5C8A6E" },
                { icon:"📧", name:"Correo personalizado", desc:"Usa tu propio servidor de correo para las notificaciones.",    connected:false, color:"#8B7355" },
                { icon:"💳", name:"Stripe / Conekta",     desc:"Acepta pagos en línea de tus pacientes.",                      connected:false, color:"#7B6EA8" },
                { icon:"☁️", name:"Google Drive",         desc:"Guarda y accede a archivos de pacientes en Drive.",            connected:false, color:"#C47B2B" },
              ].map((t,i) => (
                <div key={i} className="card" style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderRadius:14, flexWrap:"wrap" }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`${t.color}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{t.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:14, fontWeight:600, color:"var(--text-primary)", marginBottom:2 }}>{t.name}</div>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)" }}>{t.desc}</div>
                  </div>
                  <div className="cfg-integ-actions">
                    {t.connected ? (
                      <>
                        <span style={{ background:"var(--green-bg)", color:"var(--green)", padding:"3px 10px", borderRadius:20, fontFamily:"var(--font-dm-sans)", fontSize:11, fontWeight:500 }}>✓ Conectado</span>
                        <button className="btn-g" style={{ fontSize:11, padding:"5px 10px", color:"var(--red)", borderColor:"var(--red)" }}>Desconectar</button>
                      </>
                    ) : (
                      <button className="btn-p" style={{ fontSize:12, padding:"7px 14px" }}>Conectar</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Toast */}
      {saved && (
        <div style={{ position:"fixed", bottom:24, right:24, background:"var(--green)", color:"#fff", padding:"12px 20px", borderRadius:12, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, boxShadow:"0 4px 16px rgba(0,0,0,.15)", zIndex:99, animation:"toastIn .3s ease" }}>
          <style>{`@keyframes toastIn{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          ✓ Preferencias guardadas
        </div>
      )}
    </div>
  );
}