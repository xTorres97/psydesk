// Hook para leer el resultado del callback de Google al volver a /configuracion
// Úsalo al inicio de ConfiguracionView

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const INTEGRATION_NAMES: Record<string, string> = {
  calendar: "Google Calendar",
  meet:     "Google Meet",
  drive:    "Google Drive",
};

export function useGoogleIntegrationCallback(
  showToast: (msg: string, ok?: boolean) => void,
  setSection: (s: string) => void,
  setIntegrations: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
) {
  const searchParams = useSearchParams();
  const router       = useRouter();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const section   = searchParams.get("section");
    const error     = searchParams.get("error");

    if (section === "integraciones") setSection("integraciones");

    if (connected && INTEGRATION_NAMES[connected]) {
      setIntegrations(p => ({ ...p, [connected]: true }));
      showToast(`✓ ${INTEGRATION_NAMES[connected]} conectado correctamente`);
      // Limpiar params de la URL sin recargar
      router.replace("/configuracion?section=integraciones");
    }

    if (error) {
      const msg = error === "cancelled"
        ? "Conexión cancelada."
        : "Error al conectar con Google. Intenta de nuevo.";
      showToast(msg, false);
      router.replace("/configuracion?section=integraciones");
    }
  }, []);
}