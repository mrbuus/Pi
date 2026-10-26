"use client";

import { useSearchParams } from "next/navigation";
import ToolsHub from "./ToolsHub";

/** ?t=graph хаягаас эхний табыг уншиж ToolsHub-д өгнө */
export default function ToolsEntry({ basePath }: { basePath: string }) {
  const t = useSearchParams().get("t") ?? undefined;
  return <ToolsHub initialTab={t} basePath={basePath} />;
}
