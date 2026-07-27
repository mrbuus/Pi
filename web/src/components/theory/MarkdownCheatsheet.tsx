"use client";

// Багш нар ихэвчлэн МАТЕМАТИКИЙН багш нар — markdown хэрэглэгч биш. Тиймээс
// дэмждэг цөөхөн тэмдэглэгээг (headings/bold/lists/math) энгийн, богино
// жишээгээр эндээс шууд харуулна. <details> ашигласан тул нэмэлт JS/state
// шаардлагагүй, гараар (Enter/Space) нээгдэх/хаагдах — accessible.
export default function MarkdownCheatsheet() {
  return (
    <details className="rounded-lg border border-line bg-bg p-3 text-sm text-ink-dim">
      <summary className="cursor-pointer select-none font-semibold text-ink">
        Бичих тэмдэглэгээ (markdown) — жишээ харах
      </summary>
      <div className="mt-3 space-y-2">
        <CheatRow example="# Том гарчиг" desc="бүлгийн гол гарчиг" />
        <CheatRow example="## Дэд гарчиг" desc="дэд сэдвийн гарчиг" />
        <CheatRow example="### Жижиг гарчиг" desc="жижиг дэд гарчиг" />
        <CheatRow example="**тод текст**" desc="чухал үг/томьёог тодруулна" />
        <CheatRow example={"- эхний зүйл\n- хоёр дахь зүйл"} desc="дугааргүй жагсаалт" />
        <CheatRow example={"1. эхний алхам\n2. хоёр дахь алхам"} desc="дугаарласан жагсаалт" />
        <CheatRow example="Талбай $S = a \\cdot b$ байна" desc="мөр доторх томьёо ($...$)" />
        <CheatRow example="$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$" desc="тусдаа мөрийн том томьёо ($$...$$)" />
      </div>
      <p className="mt-3 text-xs">
        Зургийг доорх &quot;Зураг нэмэх&quot; товчоор оруулна — markdown мөрийг
        гараар бичих шаардлагагүй.
      </p>
    </details>
  );
}

function CheatRow({ example, desc }: { example: string; desc: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-panel px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
      <code className="whitespace-pre-wrap break-words font-mono text-xs text-ink">
        {example}
      </code>
      <span className="shrink-0 text-xs text-ink-dim sm:pl-3">{desc}</span>
    </div>
  );
}
