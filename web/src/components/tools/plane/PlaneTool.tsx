"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../core/ToolFrame";
import { loadState, saveState } from "../core/export";
import FreeMode from "./FreeMode";
import TemplateMode from "./TemplateMode";

/* ============================================================================
 * Хавтгайн дүрс: «Загвар» (хэмжээгээр нь зөв масштабтай) ба «Чөлөөт»
 * (динамик геометр) горим. Горим бүр өөрийн ToolFrame-тэй — татах зураг нь
 * тухайн горимын үндсэн <svg>.
 * ========================================================================== */

type Mode = "template" | "free";

export default function PlaneTool() {
  const [mode, setMode] = useState<Mode>(() => (loadState<string>("plane-mode", "template") === "free" ? "free" : "template"));
  useEffect(() => saveState("plane-mode", mode), [mode]);

  const modeSwitch = (
    <Segmented<Mode>
      label="Горим"
      value={mode}
      onChange={setMode}
      className="flex-nowrap"
      options={[
        { value: "template", label: "Загвар", title: "Хэмжээгээр нь зурах" },
        { value: "free", label: "Чөлөөт", title: "Цэг, шулуун, тойргоор чөлөөтэй байгуулах" },
      ]}
    />
  );

  return mode === "template" ? <TemplateMode modeSwitch={modeSwitch} /> : <FreeMode modeSwitch={modeSwitch} />;
}
