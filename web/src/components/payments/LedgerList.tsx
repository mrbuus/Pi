"use client";

import { useState } from "react";
import LedgerRowItem, { useIsDesktop } from "./LedgerRowItem";
import { MonthHeader } from "./MonthBlocks";
import PayDialog from "./PayDialog";
import type { LedgerRow, YearView } from "./ledgerTypes";

/**
 * Сурагчдын жагсаалт + наалддаг сарын толгой. Компьютер дээр төлөгдөөгүй
 * блок дээр дарахад төлбөр бүртгэх цонх шууд нээгдэнэ.
 */
export default function LedgerList({
  rows,
  year,
  current,
  showClass = false,
  onPaid,
}: {
  rows: LedgerRow[];
  year: YearView;
  current: string;
  showClass?: boolean;
  onPaid: (row: LedgerRow) => void;
}) {
  const desktop = useIsDesktop();
  const [pay, setPay] = useState<{ row: LedgerRow; month: string } | null>(null);
  return (
    <>
      <div className="sticky top-14 z-20 -mx-1 bg-bg/95 px-1 py-1.5 backdrop-blur">
        {desktop ? (
          <div className="grid grid-cols-[minmax(11rem,1fr)_auto_7.5rem] gap-x-5 px-3">
            <span className="text-xs text-ink-dim">Сурагч</span>
            <MonthHeader months={year.months} current={current} />
            <span className="text-right text-xs text-ink-dim">Өр / дараагийн</span>
          </div>
        ) : (
          <div className="px-[13px]">
            <MonthHeader months={year.months} current={current} />
          </div>
        )}
      </div>
      <ul className={desktop ? "chunky divide-y divide-line p-1.5" : "space-y-2"}>
        {rows.map((r) => (
          <li key={r.id}>
            <LedgerRowItem
              r={r}
              current={current}
              showClass={showClass}
              onPay={(row, month) => setPay({ row, month })}
            />
          </li>
        ))}
      </ul>
      {pay && (
        <PayDialog
          row={pay.row}
          month={pay.month}
          onClose={() => setPay(null)}
          onPaid={(row) => onPaid(row)}
        />
      )}
    </>
  );
}
