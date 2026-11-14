"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/kit/drawer";
import { api } from "@/lib/api";
import MakeupTestPicker, { type PickedTest } from "./MakeupTestPicker";
import { fullName, shortClass, type VisitView } from "./types";

const keyList = (v: VisitView) =>
  v.tests
    .map((t) => (t.testId ? `t:${t.testId}` : `x:${t.title.toLocaleLowerCase("mn")}`))
    .sort()
    .join("|");

/**
 * 406: сонгосон нэг эсвэл олон сурагчид ИЖИЛ тест/сэдэв тавих. Нэг сурагч бол
 * одоогийн сэдэв нь сонгогдсон байдлаар нээгдэнэ; олон сурагч ижил сэдэвтэй бол мөн.
 */
export default function TestSheet({
  visits,
  date,
  onClose,
  onSaved,
}: {
  visits: VisitView[];
  date: string;
  onClose: () => void;
  onSaved: (rows: VisitView[]) => void;
}) {
  const same = visits.length > 0 && visits.every((v) => keyList(v) === keyList(visits[0]));
  const [picked, setPicked] = useState<PickedTest[]>(() =>
    same ? visits[0].tests.map((t) => ({ testId: t.testId, title: t.title })) : [],
  );
  const [busy, setBusy] = useState(false);
  // Замын зураг: эхний ангитай сурагчийн анги (ихэвчлэн нэг ангийнхан хамт ирдэг)
  const home = visits.find((v) => v.homeClassroom)?.homeClassroom ?? null;
  const classes = new Set(visits.map((v) => v.homeClassroom?.id ?? ""));

  const save = async () => {
    setBusy(true);
    try {
      const rows = await api<VisitView[]>("/makeup-visits/tests", {
        method: "PUT",
        body: { visitIds: visits.map((v) => v.id), tests: picked },
      });
      onSaved(rows);
      toast.success(visits.length > 1 ? `${visits.length} сурагчийн сэдэв хадгалагдлаа` : "Сэдэв хадгалагдлаа");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  };

  const who = visits.length === 1 ? fullName(visits[0].student) : `${visits.length} сурагч`;
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto h-[88dvh] w-full max-w-xl">
        <header className="border-b border-line px-4 pb-3 pt-2">
          <DrawerTitle className="cyrillic-heading text-lg font-bold text-ink">Нөхсөн сэдэв</DrawerTitle>
          <DrawerDescription className="mt-0.5 text-sm text-ink-dim">
            {who}
            {visits.length > 1 && !same ? ", сурагч бүрийн сэдэв энэ жагсаалтаар солигдоно" : ""}
          </DrawerDescription>
          {classes.size > 1 && home && (
            <p className="mt-1 text-xs text-ink-dim">Тестүүд {shortClass(home.name)} ангийн дарааллаар харагдаж байна</p>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" data-vaul-no-drag>
          <MakeupTestPicker
            classroomId={home?.id ?? null}
            className={home ? shortClass(home.name) : null}
            date={date}
            selected={picked}
            onChange={setPicked}
          />
        </div>
        <footer className="flex gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-line bg-surface text-sm font-bold text-ink hover:bg-ink/5"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="inline-flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-brand-bright text-sm font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
          >
            {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {picked.length ? `Хадгалах (${picked.length})` : "Сэдэвгүй хадгалах"}
          </button>
        </footer>
      </DrawerContent>
    </Drawer>
  );
}
