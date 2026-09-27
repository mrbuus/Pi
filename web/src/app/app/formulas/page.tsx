import { Suspense } from "react";
import { LoadingState } from "@/components/ui/StateBlock";
import FormulasClient from "./FormulasClient";
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FormulasClient />
    </Suspense>
  );
}
