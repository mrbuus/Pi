import { ArrowRightLeft } from "lucide-react";

export interface VisitNote {
  /** Утсанд: «12-6-д нөхсөн» */
  short: string;
  /** «12-6 ангид нөхөж суусан» / «406-д нөхөж хийсэн» */
  full: string;
}

/** Өөрийн ангийн самбарт нэрийн ард/доор: тэр өдрийн хичээлээ өөр газарт нөхсөн */
export default function VisitNoteChip({ note }: { note: VisitNote }) {
  return (
    <span className="min-w-0 sm:pl-[2.625rem]" title={note.full}>
      <span className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border border-brand-bright/50 bg-brand-bright/10 px-1.5 py-px text-[11px] font-semibold leading-4 text-brand-soft">
        <ArrowRightLeft className="size-3 shrink-0" aria-hidden />
        <span className="truncate sm:hidden" aria-hidden>
          {note.short}
        </span>
        <span className="sr-only sm:not-sr-only sm:truncate">{note.full}</span>
      </span>
    </span>
  );
}
