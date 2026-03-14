"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const REMEMBER_KEY = "psydesk_remembered_email";

function LoginForm() {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [remember,   setRemember]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [message,    setMessage]    = useState("");

  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  // Al montar: leer email guardado y pre-rellenar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) { setEmail(saved); setRemember(true); }
    } catch {}
  }, []);

  useEffect(() => {
    if (searchParams.get("verified") === "true") setMessage("✓ Email verificado. Ya puedes iniciar sesión.");
    if (searchParams.get("error")    === "auth")  setError("Ocurrió un error de autenticación. Intenta de nuevo.");
  }, [searchParams]);

  const handleLogin = async () => {
    if (!email || !password) { setError("Completa todos los campos."); return; }
    setLoading(true); setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "Email o contraseña incorrectos."
        : error.message);
      setLoading(false);
    } else {
      // Guardar o limpiar email según preferencia
      try {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, email);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {}
      router.push("/dashboard");
      router.refresh();
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

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)",
    fontSize: 13, outline: "none", transition: "border-color .15s",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-primary)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ width:"100%", maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:"var(--bg-sidebar)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:"0 4px 20px rgba(28,25,23,.15)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.5 2 6 4.5 6 7.5c0 2 1 3.8 2.5 4.8L8 20h8l-.5-7.7C17 11.3 18 9.5 18 7.5 18 4.5 15.5 2 12 2z" fill="#c4a882"/>
              <circle cx="12" cy="7" r="2" fill="#8b7355"/>
            </svg>
          </div>
          <h1 style={{ fontFamily:"var(--font-lora)", fontSize:26, fontWeight:600, color:"var(--text-primary)", letterSpacing:"-0.5px" }}>PsyDesk</h1>
          <p style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginTop:4 }}>Plataforma de gestión clínica</p>
        </div>

        {/* Card */}
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border-light)", borderRadius:20, padding:"28px 28px 24px", boxShadow:"0 4px 24px rgba(28,25,23,.08)" }}>
          <h2 style={{ fontFamily:"var(--font-lora)", fontSize:18, fontWeight:600, color:"var(--text-primary)", marginBottom:4 }}>Iniciar sesión</h2>
          <p style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginBottom:24 }}>Bienvenido/a de vuelta</p>

          {message && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:"var(--green-bg)", border:"1px solid var(--green)", color:"var(--green)", fontFamily:"var(--font-dm-sans)", fontSize:13, marginBottom:16 }}>
              {message}
            </div>
          )}
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
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:"var(--border-light)" }} />
            <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--text-muted)" }}>o con email</span>
            <div style={{ flex:1, height:1, background:"var(--border-light)" }} />
          </div>

          {/* Email */}
          <div style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="tu@email.com"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <label style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, fontWeight:500, color:"var(--text-secondary)" }}>Contraseña</label>
              <a href="/forgot-password" style={{ fontFamily:"var(--font-dm-sans)", fontSize:12, color:"var(--accent)", textDecoration:"none" }}>¿Olvidaste tu contraseña?</a>
            </div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {/* Recordar dispositivo */}
          <div
            onClick={() => setRemember(r => !r)}
            style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, cursor:"pointer", userSelect:"none" }}
          >
            {/* Checkbox custom */}
            <div style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
              border: `1.5px solid ${remember ? "var(--accent)" : "var(--border)"}`,
              background: remember ? "var(--accent)" : "var(--surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .15s",
            }}>
              {remember && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#FAF7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{ fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-secondary)" }}>
              Recordar este dispositivo
            </span>
          </div>

          {/* Submit */}
          <button onClick={handleLogin} disabled={loading}
            style={{ width:"100%", padding:"11px", borderRadius:12, background:"var(--accent)", color:"#faf7f2", border:"none", cursor:loading?"not-allowed":"pointer", fontFamily:"var(--font-dm-sans)", fontSize:14, fontWeight:500, opacity:loading?0.7:1, transition:"opacity .15s", boxShadow:"0 2px 8px rgba(139,115,85,.3)" }}>
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </div>

        {/* Footer */}
        <p style={{ textAlign:"center", fontFamily:"var(--font-dm-sans)", fontSize:13, color:"var(--text-muted)", marginTop:20 }}>
          ¿No tienes cuenta?{" "}
          <a href="/register" style={{ color:"var(--accent)", textDecoration:"none", fontWeight:500 }}>Regístrate gratis</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}