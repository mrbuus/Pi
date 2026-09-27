import { Suspense } from "react";
import { LoadingState } from "@/components/ui/StateBlock";
import FormulaPrintClient from "./FormulaPrintClient";
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FormulaPrintClient />
    </Suspense>
  );
}
