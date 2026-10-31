"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isDemoEmail } from "@/lib/demo";
import { AuthCard, AuthAlert, authInputStyle, authLabelStyle, authButtonStyle } from "@/components/auth/AuthCard";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Ingresa un email válido."); return; }
    if (isDemoEmail(email)) { setError("La cuenta demo no permite restablecer la contraseña."); return; }
    setLoading(true); setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);

    // Por seguridad no revelamos si el email existe: siempre mostramos el mismo mensaje
    if (error && error.status === 429) { setError("Demasiados intentos. Espera unos minutos."); return; }
    setSent(true);
  };

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para crear una nueva"
      footer={<a href="/login" style={{ color:"var(--accent)", textDecoration:"none", fontWeight:500 }}>← Volver a iniciar sesión</a>}
    >
      {sent ? (
        <AuthAlert kind="success">
          Si existe una cuenta con <strong>{email}</strong>, recibirás un email con el enlace en unos minutos. Revisa también la carpeta de spam.
        </AuthAlert>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && <AuthAlert kind="error">{error}</AuthAlert>}
          <div style={{ marginBottom:16 }}>
            <label htmlFor="email" style={authLabelStyle}>Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={authInputStyle} />
          </div>
          <button type="submit" disabled={loading} style={authButtonStyle(loading)}>
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
