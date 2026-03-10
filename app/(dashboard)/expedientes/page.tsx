import { Suspense } from "react";
import { ExpedientesView } from "@/components/expedientes/ExpedientesView";

export default function ExpedientesPage() {
  return (
    <Suspense fallback={null}>
      <ExpedientesView />
    </Suspense>
  );
}