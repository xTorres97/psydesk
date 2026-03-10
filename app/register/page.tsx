"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [step,      setStep]      = useState<"form"|"success">("form");
  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [password2, setPassword2] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [sexo,      setSexo]      = useState<"masculino"|"femenino"|"">("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const supabase = createClient();

  const handleRegister = async () => {
    setError("");
    if (!fullName || !email || !password) { setError("Completa todos los campos obligatorios."); return; }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== password2) { setError("Las contraseñas no coinciden."); return; }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, specialty, sexo },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (error) {
      setError(error.message === "User already registered"
        ? "Este email ya está registrado. ¿Quieres iniciar sesión?"
        : error.message);
      setLoading(false);
    } else {
      // Guardar sexo en profiles si el usuario fue creado
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ sexo: sexo || null })
          .eq("id", data.user.id);
      }
      setStep("success");
    }
  };

  const handleGoogle = async () => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  if (step === "success") {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg-primary)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
        <div style={{ width:"100%", maxWidth:420, textAlign:"center" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"var(--green-bg)", border:"2px solid var(--green)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:28 }}>✓</div>
          <h2 style={{ fontFamily:"var(--font-lora)", fontSize:22, fontWeight:600, color:"var(--text-primary)", marginBottom:8 }}>¡Revisa tu email!</h2>
          <p style={{ fontFamily:"var(--font-dm-sans)", fontSize:14, color:"var(--text-secondary)", lineHeight:1.6, marginBottom:24 }}>
            Enviamos un enlace de verificación a <strong>{email}</strong>. Haz click en el enlace para activar tu cuenta.
          </p>
          <p style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)", marginBottom:24 }}>
            ¿No lo ves? Revisa tu carpeta de spam.
          </p>
          <a href="/login" style={{ display:"inline-block", padding:"10px 24px", borderRadius:12, background:"var(--accent)", color:"#faf7f2", fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, textDecoration:"none" }}>
            Ir al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-primary)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ width:"100%", maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:"var(--bg-sidebar)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:"0 4px 20px rgba(28,25,23,.15)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.5 2 6 4.5 6 7.5c0 2 1 3.8 2.5 4.8L8 20h8l-.5-7.7C17 11.3 18 9.5 18 7.5 18 4.5 15.5 2 12 2z" fill="#c4a882"/>
              <circle cx="12" cy="7" r="2" fill="#8b7355"/>
            </svg>
          </div>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:26, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.5px" }}>PsyDesk</h1>
          <p style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginTop:4 }}>Crea tu cuenta profesional</p>
        </div>

        {/* Card */}
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border-light)", borderRadius:20, padding:"28px 28px 24px", boxShadow:"0 4px 24px rgba(28,25,23,.08)" }}>
          <h2 style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)", marginBottom:4 }}>Crear cuenta</h2>
          <p style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginBottom:24 }}>Es gratis, sin tarjeta de crédito</p>

          {error && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:"var(--red-bg)", border:"1px solid var(--red)", color:"var(--red)", fontFamily:"var(--font-dm-sans)", fontSize:13, marginBottom:16 }}>
              {error}
            </div>
          )}

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading}
            style={{ width:"100%", padding:"10px 16px", borderRadius:12, border:"1px solid var(--border)", background:"var(--bg-card)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500, color:"var(--text-primary)", transition:"all .15s", marginBottom:16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Registrarse con Google
          </button>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:"var(--border-light)" }} />
            <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)" }}>o con email</span>
            <div style={{ flex:1, height:1, background:"var(--border-light)" }} />
          </div>

          {/* Nombre completo */}
          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>
              Nombre completo <span style={{ color:"var(--red)" }}>*</span>
            </label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Laura Martínez"
              style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none" }}
            />
          </div>

          {/* Sexo */}
          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>
              Sexo <span style={{ color:"var(--text-muted)", fontWeight:400 }}>(para el título Dr./Dra.)</span>
            </label>
            <div style={{ display:"flex", gap:8 }}>
              {(["masculino", "femenino"] as const).map(opcion => (
                <button
                  key={opcion}
                  onClick={() => setSexo(opcion)}
                  style={{
                    flex:1, padding:"10px 14px", borderRadius:10, cursor:"pointer",
                    fontFamily:"var(--font-dm-sans)", fontSize:13, fontWeight:500,
                    border: sexo === opcion ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                    background: sexo === opcion ? "var(--accent-bg)" : "var(--surface)",
                    color: sexo === opcion ? "var(--accent)" : "var(--text-secondary)",
                    transition:"all .15s",
                  }}>
                  {opcion === "masculino" ? "👨‍⚕️ Dr. (Masculino)" : "👩‍⚕️ Dra. (Femenino)"}
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>
              Email profesional <span style={{ color:"var(--red)" }}>*</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none" }}
            />
          </div>

          {/* Especialidad */}
          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>
              Especialidad <span style={{ color:"var(--text-muted)", fontWeight:400 }}>(opcional)</span>
            </label>
            <select value={specialty} onChange={e => setSpecialty(e.target.value)}
              style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:specialty?"var(--text-primary)":"var(--text-muted)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none" }}>
              <option value="">Selecciona tu especialidad</option>
              <option>Cognitivo-Conductual (TCC)</option>
              <option>Psicoanálisis / Psicodinámica</option>
              <option>Humanista / Gestalt</option>
              <option>EMDR</option>
              <option>Sistémica / Familiar</option>
              <option>Neuropsicología</option>
              <option>Infantil y Adolescentes</option>
              <option>Otra</option>
            </select>
          </div>

          {/* Contraseña */}
          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>
              Contraseña <span style={{ color:"var(--red)" }}>*</span>
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none" }}
            />
          </div>

          {/* Confirmar contraseña */}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>
              Confirmar contraseña <span style={{ color:"var(--red)" }}>*</span>
            </label>
            <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRegister()}
              placeholder="••••••••"
              style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-primary)", fontFamily:"var(--font-dm-sans)", fontSize:13, outline:"none" }}
            />
          </div>

          {/* Submit */}
          <button onClick={handleRegister} disabled={loading}
            style={{ width:"100%", padding:"11px", borderRadius:12, background:"var(--accent)", color:"#faf7f2", border:"none", cursor:loading?"not-allowed":"pointer", fontFamily:"var(--font-dm-sans)", fontSize:14, fontWeight:500, opacity:loading?.7:1, transition:"opacity .15s", boxShadow:"0 2px 8px rgba(139,115,85,.3)" }}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <p style={{ fontFamily:"var(--font-dm-sans)", fontSize:11, color:"var(--text-muted)", marginTop:12, textAlign:"center", lineHeight:1.5 }}>
            Al registrarte aceptas nuestros términos de uso y política de privacidad.
          </p>
        </div>

        {/* Footer */}
        <p style={{ textAlign:"center", fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginTop:20 }}>
          ¿Ya tienes cuenta?{" "}
          <a href="/login" style={{ color:"var(--accent)", textDecoration:"none", fontWeight:500 }}>Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}