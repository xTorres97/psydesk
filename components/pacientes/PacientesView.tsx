"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PatientStatus = "activo" | "lista_espera" | "alta" | "archivado";
type Modality = "presencial" | "online" | "mixto";
type Gender = "masculino" | "femenino" | "no_binario" | "prefiero_no_decir";

interface Patient {
  id: string; name: string; initials: string; color: string;
  age: number; tag: string; status: PatientStatus; sessions: number;
  nextSession: string | null; lastSession: string; modality: Modality;
  phone: string; email: string; since: string;
  pendingTest: boolean; pendingNote: boolean;
}

const AVATAR_COLORS = [
  "#8B7355","#4A7BA7","#5C8A6E","#C47B2B","#B5594A",
  "#7B6EA8","#A85E6A","#6A9E8A","#4A7BA7","#8B7355",
];

const DIAGNOSTICOS = [
  "Ansiedad","Depresión","Trauma","TDAH","Estrés","TOC",
  "Fobia","Pareja","Burnout","Duelo","Otro","No evaluado",
];



const STATUS_META: Record<PatientStatus, { label: string; color: string; bg: string }> = {
  activo:       { label:"Activo",       color:"var(--green)", bg:"var(--green-bg)" },
  lista_espera: { label:"Lista espera", color:"var(--amber)", bg:"var(--amber-bg)" },
  alta:         { label:"Alta",         color:"var(--blue)",  bg:"var(--blue-bg)"  },
  archivado:    { label:"Archivado",    color:"var(--text-muted)", bg:"var(--surface)" },
};

const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });

function getInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}
function getMonthYear() {
  const d = new Date();
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
function calcAge(birthDate: string): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ─── Modal Nuevo Paciente ─────────────────────────────────────────────────────
interface NuevoPacienteModalProps {
  onClose: () => void;
  onCreated: (patient: Patient) => void;
}

function NuevoPacienteModal({ onClose, onCreated }: NuevoPacienteModalProps) {
  const supabase = createClient();

  const [step, setStep]     = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  // Paso 1
  const [firstName, setFirstName]         = useState("");
  const [lastName, setLastName]           = useState("");
  const [birthDate, setBirthDate]         = useState("");
  const [gender, setGender]               = useState<Gender | "">("");
  const [phone, setPhone]                 = useState("");
  const [email, setEmail]                 = useState("");
  const [occupation, setOccupation]       = useState("");
  // Paso 2
  const [diagnosis, setDiagnosis]         = useState<string[]>([]);
  const [referralSource, setReferralSource] = useState("");
  const [status, setStatus]               = useState<PatientStatus>("activo");
  const [modality, setModality]           = useState<Modality>("presencial");
  const [notes, setNotes]                 = useState("");

  const fullName   = `${firstName} ${lastName}`.trim();
  const initials   = firstName && lastName ? getInitials(firstName, lastName) : firstName ? firstName[0]?.toUpperCase() ?? "?" : "?";
  const colorIdx   = fullName.length % AVATAR_COLORS.length;
  const colorAvatar = AVATAR_COLORS[colorIdx];

  const step1Valid = firstName.trim() && lastName.trim() && birthDate && gender && phone.trim();
  const step2Valid = diagnosis.length > 0;

  const GENDER_OPTIONS: { val: Gender; label: string }[] = [
    { val:"femenino",          label:"♀ Femenino" },
    { val:"masculino",         label:"♂ Masculino" },
    { val:"no_binario",        label:"⚧ No binario" },
    { val:"prefiero_no_decir", label:"— Prefiero no decir" },
  ];

  async function handleGuardar() {
    if (!step1Valid || !step2Valid) return;
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data, error: dbError } = await supabase
        .from("patients")
        .insert({
          psychologist_id: user.id,
          first_name:      firstName.trim(),
          last_name:       lastName.trim(),
          birth_date:      birthDate || null,
          gender:          gender || null,
          phone:           phone.trim(),
          email:           email.trim() || null,
          occupation:      occupation.trim() || null,
          diagnosis:       diagnosis.join(", "),
          referral_source: referralSource.trim() || null,
          status:          status,
          notes:           notes.trim() || null,
          session_count:   0,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const age = calcAge(birthDate);
      const newPatient: Patient = {
        id:          data.id,
        name:        fullName,
        initials:    initials,
        color:       colorAvatar,
        age,
        tag:         diagnosis.join(", "),
        status,
        sessions:    0,
        nextSession: null,
        lastSession: "—",
        modality,
        phone:       phone.trim(),
        email:       email.trim(),
        since:       getMonthYear(),
        pendingTest: false,
        pendingNote: false,
      };

      onCreated(newPatient);
      onClose();
    } catch (e: any) {
      setError(e.message || "Error al guardar el paciente");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width:"100%", border:"1px solid var(--border)", borderRadius:10,
    padding:"9px 13px", background:"var(--surface)", outline:"none",
    ...dm("13px"), color:"var(--text-primary)", boxSizing:"border-box",
    transition:"border-color .15s",
  };
  const labelStyle: React.CSSProperties = {
    ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase",
    letterSpacing:"0.5px", fontWeight:600, display:"block", marginBottom:5,
  };
  const optLabel: React.CSSProperties = { fontWeight:400, textTransform:"none", letterSpacing:0 };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, backdropFilter:"blur(3px)" }} />
      <div style={{
        position:"fixed", top:"50%", left:"50%",
        transform:"translate(-50%, -50%)",
        width:"min(540px, 95vw)", maxHeight:"90vh",
        background:"var(--bg-card)", borderRadius:20,
        border:"1px solid var(--border-light)",
        boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
        zIndex:101, display:"flex", flexDirection:"column",
        animation:"modalIn .2s ease",
      }}>
        <style>{`
          @keyframes modalIn { from{transform:translate(-50%,-48%);opacity:0} to{transform:translate(-50%,-50%);opacity:1} }
          .np-input:focus { border-color: var(--accent) !important; }
          .np-seg { display:flex; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:3px; gap:2px; }
          .np-seg button { flex:1; padding:7px 6px; border:none; cursor:pointer; border-radius:8px; font-family:var(--font-dm-sans); font-size:12px; font-weight:500; transition:all .15s; white-space:nowrap; }
          .np-seg button.active { background:var(--accent); color:#FAF7F2; }
          .np-seg button:not(.active) { background:transparent; color:var(--text-secondary); }
          .np-gender { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
          .np-gender button { padding:8px 10px; border:1px solid var(--border); border-radius:10px; cursor:pointer; font-family:var(--font-dm-sans); font-size:12px; font-weight:500; transition:all .15s; text-align:left; }
          .np-gender button.active { border-color:var(--accent); background:var(--accent-bg); color:var(--accent); }
          .np-gender button:not(.active) { background:var(--surface); color:var(--text-secondary); }
        `}</style>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border-light)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:42, height:42, borderRadius:"50%",
              background: fullName ? `${colorAvatar}20` : "var(--surface)",
              color: fullName ? colorAvatar : "var(--text-muted)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:14, fontWeight:600, fontFamily:"var(--font-dm-sans)",
              border:`2px solid ${fullName ? colorAvatar+"40" : "var(--border)"}`,
              transition:"all .2s",
            }}>
              {initials || "?"}
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>
                {fullName || "Nuevo paciente"}
              </div>
              <div style={{ ...dm("11px"), color:"var(--text-muted)", marginTop:2 }}>
                Paso {step} de 2 — {step===1 ? "Datos personales" : "Información clínica"}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ height:3, background:"var(--border-light)" }}>
          <div style={{ height:"100%", width:step===1?"50%":"100%", background:"var(--accent)", transition:"width .3s ease", borderRadius:2 }} />
        </div>

        {/* Body */}
        <div style={{ padding:"20px 24px", overflowY:"auto", flex:1 }}>
          {step === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input className="np-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="María" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Apellido *</label>
                  <input className="np-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="González" style={inputStyle} />
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={labelStyle}>Fecha de nacimiento *</label>
                  <input
                    className="np-input" type="date" value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    style={{ ...inputStyle, colorScheme:"dark" }}
                  />
                  {birthDate && (
                    <div style={{ ...dm("11px"), color:"var(--text-muted)", marginTop:4 }}>
                      {calcAge(birthDate)} años
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Ocupación <span style={optLabel}>(opcional)</span></label>
                  <input className="np-input" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Ej: Diseñadora" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Género *</label>
                <div className="np-gender">
                  {GENDER_OPTIONS.map(g => (
                    <button key={g.val} className={gender===g.val?"active":""} onClick={() => setGender(g.val)}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Teléfono *</label>
                <input className="np-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 55 1234 5678" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Correo electrónico <span style={optLabel}>(opcional)</span></label>
                <input className="np-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="paciente@email.com" style={inputStyle} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={labelStyle}>Diagnóstico / Motivo principal * <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:"var(--text-muted)" }}>(puedes elegir varios)</span></label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                  {DIAGNOSTICOS.map(d => {
                    const selected = diagnosis.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => setDiagnosis(prev => selected ? prev.filter(x => x !== d) : [...prev, d])}
                        style={{
                          padding:"6px 14px", borderRadius:20, border:"1px solid",
                          cursor:"pointer", ...dm("12px"), fontWeight:500,
                          background: selected ? "var(--accent)" : "var(--surface)",
                          borderColor: selected ? "var(--accent)" : "var(--border)",
                          color: selected ? "#FAF7F2" : "var(--text-secondary)",
                          transition:"all .15s",
                        }}
                      >{selected ? "✓ " : ""}{d}</button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Derivado por <span style={optLabel}>(opcional)</span></label>
                <input className="np-input" value={referralSource} onChange={e => setReferralSource(e.target.value)} placeholder="Ej: Médico familiar, auto-referido..." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Modalidad</label>
                <div className="np-seg">
                  {(["presencial","online","mixto"] as Modality[]).map(m => (
                    <button key={m} className={modality===m?"active":""} onClick={() => setModality(m)}>
                      {m==="presencial"?"🏥 Presencial":m==="online"?"🎥 Online":"↔ Mixto"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Estado inicial</label>
                <div className="np-seg">
                  {(["activo","lista_espera"] as PatientStatus[]).map(s => (
                    <button key={s} className={status===s?"active":""} onClick={() => setStatus(s)}>
                      {s==="activo"?"✓ Activo":"⏳ Lista de espera"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notas iniciales <span style={optLabel}>(opcional)</span></label>
                <textarea
                  className="np-input" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Observaciones iniciales, contexto relevante..."
                  rows={3} style={{ ...inputStyle, resize:"none", lineHeight:1.5 }}
                />
              </div>

              {error && (
                <div style={{ padding:"10px 14px", borderRadius:10, background:"var(--red-bg)", border:"1px solid var(--red)33", ...dm("12px"), color:"var(--red)" }}>
                  ⚠ {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:"1px solid var(--border-light)", display:"flex", gap:10, justifyContent:"flex-end" }}>
          {step===2 && (
            <button className="btn-g" onClick={() => setStep(1)} style={{ padding:"0 20px", height:38 }}>← Atrás</button>
          )}
          <button
            onClick={() => step===1 ? (step1Valid && setStep(2)) : handleGuardar()}
            disabled={step===1 ? !step1Valid : !step2Valid || loading}
            style={{
              padding:"0 24px", height:38, borderRadius:10, border:"none",
              background: (step===1 ? step1Valid : step2Valid && !loading) ? "var(--accent)" : "var(--border)",
              color: (step===1 ? step1Valid : step2Valid && !loading) ? "#FAF7F2" : "var(--text-muted)",
              ...dm("13px"), fontWeight:500,
              cursor: (step===1 ? step1Valid : step2Valid && !loading) ? "pointer" : "not-allowed",
              transition:"all .15s",
            }}
          >
            {loading ? "Guardando..." : step===1 ? "Continuar →" : "✓ Crear paciente"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────
export function PacientesView() {
  const supabaseView = createClient();
  const router = useRouter();

  const [patients, setPatients]         = useState<Patient[]>([]);
  const [loadingList, setLoadingList]   = useState(true);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState<PatientStatus | "all">("all");
  const [filterTag, setFilterTag]       = useState("all");
  const [viewMode, setViewMode]         = useState<"grid" | "list">("list");
  const [selected, setSelected]         = useState<Patient | null>(null);
  const [showModal, setShowModal]       = useState(false);

  useEffect(() => {
    async function fetchPatients() {
      setLoadingList(true);
      try {
        const { data: { user } } = await supabaseView.auth.getUser();
        if (!user) return;

        const { data, error } = await supabaseView
          .from("patients")
          .select("*")
          .eq("psychologist_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped: Patient[] = (data ?? []).map((p: any) => {
          const fullName = `${p.first_name} ${p.last_name}`.trim();
          const colorIdx = fullName.length % AVATAR_COLORS.length;
          const age = p.birth_date ? calcAge(p.birth_date) : 0;
          const createdAt = new Date(p.created_at);
          const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
          const since = `${months[createdAt.getMonth()]} ${createdAt.getFullYear()}`;

          return {
            id:          p.id,
            name:        fullName,
            initials:    getInitials(p.first_name, p.last_name),
            color:       AVATAR_COLORS[colorIdx],
            age,
            tag:         p.diagnosis ?? "—",
            status:      (p.status ?? "activo") as PatientStatus,
            sessions:    p.session_count ?? 0,
            nextSession: null,
            lastSession: "—",
            modality:    "presencial",
            phone:       p.phone ?? "",
            email:       p.email ?? "",
            since,
            pendingTest: false,
            pendingNote: false,
          };
        });

        setPatients(mapped);
      } catch (e) {
        console.error("Error cargando pacientes:", e);
      } finally {
        setLoadingList(false);
      }
    }

    fetchPatients();
  }, []);

  const tags = ["all", ...Array.from(new Set(patients.flatMap(p => p.tag.split(", ").map(s => s.trim()).filter(Boolean))))];

  const filtered = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.tag.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus==="all" || p.status===filterStatus;
    const matchTag    = filterTag==="all" || p.tag.split(", ").map(s => s.trim()).includes(filterTag);
    return matchSearch && matchStatus && matchTag;
  });

  const [editTarget, setEditTarget]   = useState<Patient | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState("");

  // Campos edición
  const [eFirstName, setEFirstName]       = useState("");
  const [eLastName, setELastName]         = useState("");
  const [eBirthDate, setEBirthDate]       = useState("");
  const [eGender, setEGender]             = useState<Gender | "">("");
  const [ePhone, setEPhone]               = useState("");
  const [eEmail, setEEmail]               = useState("");
  const [eOccupation, setEOccupation]     = useState("");
  const [eDiagnosis, setEDiagnosis]       = useState<string[]>([]);
  const [eStatus, setEStatus]             = useState<PatientStatus>("activo");
  const [eNotes, setENotes]               = useState("");

  function openEditModal(p: Patient) {
    setEFirstName(p.name.split(" ")[0] ?? "");
    setELastName(p.name.split(" ").slice(1).join(" ") ?? "");
    setEBirthDate("");
    setEGender("");
    setEPhone(p.phone);
    setEEmail(p.email);
    setEOccupation("");
    setEDiagnosis(p.tag === "—" ? [] : p.tag.split(", ").map(s => s.trim()).filter(Boolean));
    setEStatus(p.status);
    setENotes("");
    setEditError("");
    setEditTarget(p);
  }

  async function handleEditSave() {
    if (!editTarget) return;
    setEditLoading(true);
    setEditError("");
    try {
      const supabase = createClient();
      const updates: any = {
        first_name: eFirstName.trim(),
        last_name:  eLastName.trim(),
        phone:      ePhone.trim() || null,
        email:      eEmail.trim() || null,
        occupation: eOccupation.trim() || null,
        diagnosis:  eDiagnosis.length > 0 ? eDiagnosis.join(", ") : null,
        status:     eStatus,
        notes:      eNotes.trim() || null,
      };
      if (eBirthDate) updates.birth_date = eBirthDate;
      if (eGender)    updates.gender = eGender;

      const { error } = await supabase.from("patients").update(updates).eq("id", editTarget.id);
      if (error) throw error;

      const fullName = `${eFirstName.trim()} ${eLastName.trim()}`.trim();
      const age = eBirthDate ? calcAge(eBirthDate) : editTarget.age;
      const updated: Patient = {
        ...editTarget,
        name:     fullName,
        initials: getInitials(eFirstName.trim(), eLastName.trim()),
        age,
        tag:      eDiagnosis.length > 0 ? eDiagnosis.join(", ") : "—",
        status:   eStatus,
        phone:    ePhone.trim(),
        email:    eEmail.trim(),
      };
      setPatients(prev => prev.map(p => p.id === editTarget.id ? updated : p));
      setSelected(updated);
      setEditTarget(null);
    } catch (e: any) {
      setEditError(e.message || "Error al guardar");
    } finally {
      setEditLoading(false);
    }
  }

  const [deleteTarget, setDeleteTarget]       = useState<Patient | null>(null);
  const [deleteStep, setDeleteStep]           = useState<1 | 2>(1);
  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  function handlePatientCreated(patient: Patient) {
    setPatients(prev => [patient, ...prev]);
    setSelected(patient);
  }

  function openDeleteModal(patient: Patient) {
    setDeleteTarget(patient);
    setDeleteStep(1);
    setDeleteConfirmName("");
  }

  function closeDeleteModal() {
    setDeleteTarget(null);
    setDeleteStep(1);
    setDeleteConfirmName("");
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("patients").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setPatients(prev => prev.filter(p => p.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
      closeDeleteModal();
    } catch (e: any) {
      alert("Error al eliminar: " + e.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  const DetailPanel = () => selected ? (
    <>
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
          <span className="tag" style={{ background:"var(--surface)", color:"var(--text-secondary)" }}>{selected.modality==="online"?"🎥 Online":"🏥 Presencial"}</span>
        </div>
      </div>
      <div style={{ padding:"16px 20px", overflowY:"auto", flex:1 }}>
        <div style={{ ...dm("11px"), color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10 }}>Contacto</div>
        {[{ icon:"📞", val:selected.phone },{ icon:"📧", val:selected.email }].map((r,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid var(--border-light)" }}>
            <span>{r.icon}</span><span style={{ ...dm("13px"), color:"var(--text-primary)" }}>{r.val || "—"}</span>
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
          <button className="btn-p" onClick={() => router.push(`/expedientes?patientId=${selected.id}`)} style={{ width:"100%" }}>📂 Ver expediente completo</button>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button className="btn-g" style={{ fontSize:12 }}>📅 Agendar cita</button>
            <button className="btn-g" style={{ fontSize:12 }}>📋 Enviar test</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8, paddingTop:12, borderTop:"1px solid var(--border-light)" }}>
            <button
              onClick={() => openEditModal(selected)}
              style={{ padding:"8px 0", border:"1px solid var(--border)", borderRadius:10, background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor="var(--accent)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor="var(--border)"; }}
            >
              ✏️ Editar
            </button>
            <button
              onClick={() => openDeleteModal(selected)}
              style={{ padding:"8px 0", border:"1px solid var(--red)44", borderRadius:10, background:"var(--red-bg)", color:"var(--red)", fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background="var(--red)18"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background="var(--red-bg)"; }}
            >
              🗑 Eliminar
            </button>
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
          .pac-table-row { grid-template-columns: 1fr auto !important; gap: 8px !important; }
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
          <p style={{ ...dm("13px"), color:"var(--text-muted)", marginTop:4 }}>{filtered.length} pacientes · {patients.filter(p => p.status==="activo").length} activos</p>
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
            onClick={() => setShowModal(true)}
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
        {(["all","activo","lista_espera","alta","archivado"] as const).map(s => (
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
          {loadingList ? (
            <div className="card" style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"64px 24px", gap:12 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin .7s linear infinite" }} />
              <span style={{ ...dm("13px"), color:"var(--text-muted)" }}>Cargando pacientes...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : patients.length === 0 ? (
            <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"64px 24px", gap:16, textAlign:"center" }}>
              <div style={{ fontSize:48, opacity:0.4 }}>🧑‍⚕️</div>
              <div style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)" }}>Aún no tienes pacientes</div>
              <div style={{ ...dm("13px"), color:"var(--text-muted)", maxWidth:300 }}>Agrega tu primer paciente usando el botón "+ Nuevo paciente" para comenzar.</div>
              <button
                onClick={() => setShowModal(true)}
                style={{ marginTop:8, display:"flex", alignItems:"center", gap:6, background:"var(--accent)", color:"#FAF7F2", border:"none", padding:"0 22px", borderRadius:10, height:40, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"0 2px 8px rgba(139,115,85,0.35)" }}
              >
                + Agregar primer paciente
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 24px", gap:10, textAlign:"center" }}>
              <div style={{ fontSize:36, opacity:0.4 }}>🔍</div>
              <div style={{ ...dm("14px"), fontWeight:600, color:"var(--text-primary)" }}>Sin resultados</div>
              <div style={{ ...dm("13px"), color:"var(--text-muted)" }}>Ningún paciente coincide con los filtros actuales.</div>
            </div>
          ) : viewMode === "list" ? (
            <div className="card" style={{ overflow:"hidden" }}>
              <div className="pac-table-header" style={{ gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr auto", gap:12, padding:"10px 18px", borderBottom:"1px solid var(--border-light)", background:"var(--surface)" }}>
                {["Paciente","Diagnóstico","Estado","Sesiones","Próxima cita","Modalidad",""].map((h,i) => (
                  <span key={i} style={{ ...dm("11px"), fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</span>
                ))}
              </div>
              {filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelected(p.id===selected?.id?null:p)}
                  className="pac-table-row"
                  style={{ gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr auto", gap:12, padding:"13px 18px", alignItems:"center", borderBottom:"1px solid var(--border-light)", cursor:"pointer", transition:"all .15s", background:selected?.id===p.id?"var(--accent-bg)":"transparent", borderLeft:selected?.id===p.id?"3px solid var(--accent)":"3px solid transparent" }}
                  onMouseEnter={e => { if(selected?.id!==p.id)(e.currentTarget as HTMLDivElement).style.background="var(--surface)"; }}
                  onMouseLeave={e => { if(selected?.id!==p.id)(e.currentTarget as HTMLDivElement).style.background="transparent"; }}
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
                  key={p.id} className="card"
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

        {selected && (
          <div className="pac-detail-desktop" style={{ width:300, flexShrink:0, borderRadius:16, overflow:"hidden", border:"1px solid var(--border-light)", background:"var(--bg-card)", boxShadow:"0 1px 3px rgba(28,25,23,0.06)", flexDirection:"column", animation:"slideIn .25s ease" }}>
            <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
            <DetailPanel />
          </div>
        )}
      </div>

      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:60, backdropFilter:"blur(2px)" }} className="pac-detail-mobile" />
          <div className="pac-detail-mobile" style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--bg-card)", borderRadius:"20px 20px 0 0", border:"1px solid var(--border-light)", boxShadow:"0 -4px 24px rgba(0,0,0,0.12)", zIndex:61, maxHeight:"85vh", flexDirection:"column", animation:"slideUp .25s ease" }}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:"var(--border)" }} />
            </div>
            <DetailPanel />
          </div>
        </>
      )}

      {showModal && (
        <NuevoPacienteModal
          onClose={() => setShowModal(false)}
          onCreated={handlePatientCreated}
        />
      )}

      {/* Modal eliminar paciente */}
      {deleteTarget && (
        <>
          <div onClick={closeDeleteModal} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:110, backdropFilter:"blur(3px)" }} />
          <div style={{
            position:"fixed", top:"50%", left:"50%",
            transform:"translate(-50%, -50%)",
            width:"min(420px, 92vw)",
            background:"var(--bg-card)", borderRadius:20,
            border:"1px solid var(--border-light)",
            boxShadow:"0 20px 60px rgba(0,0,0,0.35)",
            zIndex:111, overflow:"hidden",
            animation:"modalIn .2s ease",
          }}>
            {deleteStep === 1 ? (
              /* Paso 1: Advertencia */
              <div style={{ padding:"28px 28px 24px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
                  <div style={{ width:48, height:48, borderRadius:"50%", background:"var(--red-bg)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>⚠️</div>
                  <div>
                    <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)" }}>¿Eliminar paciente?</div>
                    <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:3 }}>Esta acción no se puede deshacer</div>
                  </div>
                </div>
                <div style={{ padding:"14px 16px", borderRadius:12, background:"var(--surface)", border:"1px solid var(--border-light)", marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:`${deleteTarget.color}20`, color:deleteTarget.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, fontFamily:"var(--font-dm-sans)", flexShrink:0 }}>{deleteTarget.initials}</div>
                    <div>
                      <div style={{ ...dm("14px"), fontWeight:600, color:"var(--text-primary)" }}>{deleteTarget.name}</div>
                      <div style={{ ...dm("12px"), color:"var(--text-muted)" }}>{deleteTarget.tag} · {deleteTarget.sessions} sesiones</div>
                    </div>
                  </div>
                </div>
                <div style={{ ...dm("13px"), color:"var(--text-secondary)", lineHeight:1.6, marginBottom:24 }}>
                  Se eliminarán permanentemente todos los datos del paciente, incluyendo su historial, notas y documentos asociados.
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={closeDeleteModal} className="btn-g" style={{ flex:1, height:40 }}>Cancelar</button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    style={{ flex:1, height:40, borderRadius:10, border:"none", background:"var(--red)", color:"#fff", fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, cursor:"pointer" }}
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            ) : (
              /* Paso 2: Confirmación escribiendo nombre */
              <div style={{ padding:"28px 28px 24px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:"var(--red-bg)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🗑</div>
                  <div>
                    <div style={{ fontFamily:"var(--font-lora)", fontSize:17, fontWeight:600, color:"var(--text-primary)" }}>Confirmación final</div>
                    <div style={{ ...dm("12px"), color:"var(--text-muted)", marginTop:3 }}>Escribe el nombre para confirmar</div>
                  </div>
                </div>
                <div style={{ ...dm("13px"), color:"var(--text-secondary)", marginBottom:14, lineHeight:1.5 }}>
                  Para confirmar, escribe exactamente: <span style={{ fontWeight:600, color:"var(--text-primary)" }}>{deleteTarget.name}</span>
                </div>
                <input
                  autoFocus
                  value={deleteConfirmName}
                  onChange={e => setDeleteConfirmName(e.target.value)}
                  placeholder={deleteTarget.name}
                  style={{
                    width:"100%", border:`1px solid ${deleteConfirmName === deleteTarget.name ? "var(--red)" : "var(--border)"}`,
                    borderRadius:10, padding:"10px 14px", background:"var(--surface)", outline:"none",
                    ...dm("13px"), color:"var(--text-primary)", boxSizing:"border-box",
                    transition:"border-color .2s", marginBottom:20,
                  }}
                />
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => setDeleteStep(1)} className="btn-g" style={{ flex:1, height:40 }}>← Atrás</button>
                  <button
                    onClick={handleDeleteConfirmed}
                    disabled={deleteConfirmName !== deleteTarget.name || deleteLoading}
                    style={{
                      flex:1, height:40, borderRadius:10, border:"none",
                      background: deleteConfirmName === deleteTarget.name && !deleteLoading ? "var(--red)" : "var(--border)",
                      color: deleteConfirmName === deleteTarget.name && !deleteLoading ? "#fff" : "var(--text-muted)",
                      fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500,
                      cursor: deleteConfirmName === deleteTarget.name && !deleteLoading ? "pointer" : "not-allowed",
                      transition:"all .15s",
                    }}
                  >
                    {deleteLoading ? "Eliminando..." : "Eliminar definitivamente"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {/* Modal edición */}
      {editTarget && (() => {
        const inputStyle: React.CSSProperties = {
          width:"100%", border:"1px solid var(--border)", borderRadius:10,
          padding:"9px 13px", background:"var(--surface)", outline:"none",
          fontFamily:"var(--font-dm-sans)", fontSize:"13px", color:"var(--text-primary)",
          boxSizing:"border-box", transition:"border-color .15s",
        };
        const labelStyle: React.CSSProperties = {
          fontFamily:"var(--font-dm-sans)", fontSize:"11px", color:"var(--text-muted)",
          textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600,
          display:"block", marginBottom:5,
        };
        const GENDER_OPTIONS: { val: Gender; label: string }[] = [
          { val:"femenino",          label:"♀ Femenino" },
          { val:"masculino",         label:"♂ Masculino" },
          { val:"no_binario",        label:"⚧ No binario" },
          { val:"prefiero_no_decir", label:"— Prefiero no decir" },
        ];
        return (
          <>
            <div onClick={() => setEditTarget(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, backdropFilter:"blur(3px)" }} />
            <div style={{
              position:"fixed", top:"50%", left:"50%",
              transform:"translate(-50%, -50%)",
              width:"min(540px, 95vw)", maxHeight:"90vh",
              background:"var(--bg-card)", borderRadius:20,
              border:"1px solid var(--border-light)",
              boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
              zIndex:101, display:"flex", flexDirection:"column",
              animation:"modalIn .2s ease",
            }}>
              {/* Header */}
              <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border-light)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:42, height:42, borderRadius:"50%", background:`${editTarget.color}20`, color:editTarget.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:600, fontFamily:"var(--font-dm-sans)", border:`2px solid ${editTarget.color}40` }}>
                    {getInitials(eFirstName || (editTarget.name.split(" ")[0] ?? ""), eLastName || (editTarget.name.split(" ")[1] ?? ""))}
                  </div>
                  <div>
                    <div style={{ fontFamily:"var(--font-lora)", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>Editar paciente</div>
                    <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:"11px", color:"var(--text-muted)", marginTop:2 }}>{editTarget.name}</div>
                  </div>
                </div>
                <button onClick={() => setEditTarget(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding:"20px 24px", overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={labelStyle}>Nombre *</label>
                    <input className="np-input" value={eFirstName} onChange={e => setEFirstName(e.target.value)} placeholder="Nombre" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Apellido *</label>
                    <input className="np-input" value={eLastName} onChange={e => setELastName(e.target.value)} placeholder="Apellido" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={labelStyle}>Fecha de nacimiento</label>
                    <input className="np-input" type="date" value={eBirthDate} onChange={e => setEBirthDate(e.target.value)} style={{ ...inputStyle, colorScheme:"dark" }} />
                    {eBirthDate && <div style={{ fontFamily:"var(--font-dm-sans)", fontSize:"11px", color:"var(--text-muted)", marginTop:4 }}>{calcAge(eBirthDate)} años</div>}
                  </div>
                  <div>
                    <label style={labelStyle}>Teléfono</label>
                    <input className="np-input" value={ePhone} onChange={e => setEPhone(e.target.value)} placeholder="+52 55 1234 5678" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Correo electrónico</label>
                  <input className="np-input" type="email" value={eEmail} onChange={e => setEEmail(e.target.value)} placeholder="paciente@email.com" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Género</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                    {GENDER_OPTIONS.map(g => (
                      <button key={g.val} onClick={() => setEGender(g.val === eGender ? "" : g.val)}
                        style={{ padding:"8px 10px", border:`1px solid ${eGender===g.val?"var(--accent)":"var(--border)"}`, borderRadius:10, cursor:"pointer", fontFamily:"var(--font-dm-sans)", fontSize:"12px", fontWeight:500, transition:"all .15s", textAlign:"left", background:eGender===g.val?"var(--accent-bg)":"var(--surface)", color:eGender===g.val?"var(--accent)":"var(--text-secondary)" }}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Diagnóstico <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:"var(--text-muted)" }}>(puedes elegir varios)</span></label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                    {DIAGNOSTICOS.map(d => {
                      const isSelected = eDiagnosis.includes(d);
                      return (
                        <button key={d}
                          onClick={() => setEDiagnosis(prev => isSelected ? prev.filter(x => x !== d) : [...prev, d])}
                          style={{ padding:"6px 14px", borderRadius:20, border:"1px solid", cursor:"pointer", fontFamily:"var(--font-dm-sans)", fontSize:"12px", fontWeight:500, background:isSelected?"var(--accent)":"var(--surface)", borderColor:isSelected?"var(--accent)":"var(--border)", color:isSelected?"#FAF7F2":"var(--text-secondary)", transition:"all .15s" }}>
                          {isSelected ? "✓ " : ""}{d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Estado</label>
                  <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:3, gap:2 }}>
                    {(["activo","lista_espera","alta","archivado"] as PatientStatus[]).map(s => (
                      <button key={s} onClick={() => setEStatus(s)}
                        style={{ flex:1, padding:"7px 4px", border:"none", cursor:"pointer", borderRadius:8, fontFamily:"var(--font-dm-sans)", fontSize:"11px", fontWeight:500, transition:"all .15s", background:eStatus===s?"var(--accent)":"transparent", color:eStatus===s?"#FAF7F2":"var(--text-secondary)", whiteSpace:"nowrap" }}>
                        {STATUS_META[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Notas</label>
                  <textarea className="np-input" value={eNotes} onChange={e => setENotes(e.target.value)} placeholder="Observaciones..." rows={3} style={{ ...inputStyle, resize:"none", lineHeight:1.5 }} />
                </div>

                {editError && (
                  <div style={{ padding:"10px 14px", borderRadius:10, background:"var(--red-bg)", border:"1px solid var(--red)33", fontFamily:"var(--font-dm-sans)", fontSize:"12px", color:"var(--red)" }}>
                    ⚠ {editError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding:"16px 24px", borderTop:"1px solid var(--border-light)", display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button className="btn-g" onClick={() => setEditTarget(null)} style={{ padding:"0 20px", height:38 }}>Cancelar</button>
                <button
                  onClick={handleEditSave}
                  disabled={!eFirstName.trim() || !eLastName.trim() || editLoading}
                  style={{
                    padding:"0 24px", height:38, borderRadius:10, border:"none",
                    background: eFirstName.trim() && eLastName.trim() && !editLoading ? "var(--accent)" : "var(--border)",
                    color: eFirstName.trim() && eLastName.trim() && !editLoading ? "#FAF7F2" : "var(--text-muted)",
                    fontFamily:"var(--font-dm-sans)", fontSize:"13px", fontWeight:500,
                    cursor: eFirstName.trim() && eLastName.trim() && !editLoading ? "pointer" : "not-allowed",
                    transition:"all .15s",
                  }}
                >
                  {editLoading ? "Guardando..." : "✓ Guardar cambios"}
                </button>
              </div>
            </div>
          </>
        );
      })()}

    </div>
  );
}