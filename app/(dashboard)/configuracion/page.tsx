import { Suspense } from "react";
import { ConfiguracionView } from "@/components/configuracion/ConfiguracionView";

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={null}>
      <ConfiguracionView />
    </Suspense>
  );
}