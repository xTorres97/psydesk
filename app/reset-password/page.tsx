"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { AuthCard, AuthAlert, authInputStyle, authLabelStyle, authButtonStyle } from "@/components/auth/AuthCard";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const router   = useRouter();
  const supabase = createClient();
  const { isDemo } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo)                 { setError("La contraseña de la cuenta demo no se puede cambiar."); return; }
    if (password.length < 8)    { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirm)   { setError("Las contraseñas no coinciden."); return; }
    setLoading(true); setError("");

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message.includes("same") ? "La nueva contraseña debe ser distinta a la anterior." : "El enlace expiró o no es válido. Solicita uno nuevo.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <AuthCard
      title="Nueva contraseña"
      subtitle="Elige una contraseña de al menos 8 caracteres"
      footer={<a href="/forgot-password" style={{ color:"var(--accent)", textDecoration:"none", fontWeight:500 }}>Solicitar un nuevo enlace</a>}
    >
      <form onSubmit={handleSubmit} noValidate>
        {error && <AuthAlert kind="error">{error}</AuthAlert>}
        <div style={{ marginBottom:12 }}>
          <label htmlFor="password" style={authLabelStyle}>Nueva contraseña</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" style={authInputStyle} />
        </div>
        <div style={{ marginBottom:16 }}>
          <label htmlFor="confirm" style={authLabelStyle}>Confirmar contraseña</label>
          <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={authInputStyle} />
        </div>
        <button type="submit" disabled={loading} style={authButtonStyle(loading)}>
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </AuthCard>
  );
}
