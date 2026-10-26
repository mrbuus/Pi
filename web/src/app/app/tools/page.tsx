import { Suspense } from "react";
import ToolsEntry from "@/components/tools/core/ToolsEntry";
import { LoadingState } from "@/components/ui/StateBlock";

export default function AppToolsPage() {
  return (
    <section className="mx-auto w-full min-w-0 max-w-[1400px] space-y-4 px-4 py-4 sm:px-6">
      <Suspense fallback={<LoadingState rows={6} />}>
        <ToolsEntry basePath="/app/tools" />
      </Suspense>
    </section>
  );
}
