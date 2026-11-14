"use client";

import { History, Landmark, UserRound } from "lucide-react";
import { Meta } from "@/components/ui/Meta";
import { splitSender, type BankRow } from "./types";

/**
 * Мөнгө хаанаас ирсэн: илгээгч (энэ гүйлгээний «ХААНААС: НЭР»), харьцсан данс,
 * дансны эзэмшигч (тэр данснаас ирсэн бусад гүйлгээнээс), өмнө оноосон хүүхэд.
 */
export default function PayerInfo({ row }: { row: BankRow }) {
  const { sender } = splitSender(row.description);
  const acc = row.account;
  const owner = acc?.owner && acc.owner !== sender?.toUpperCase() ? acc.owner : null;
  if (!sender && !row.counterparty) return null;
  return (
    <dl className="space-y-1 text-sm text-ink-dim">
      {sender && (
        <div className="flex items-start gap-1.5">
          <UserRound className="mt-0.5 size-4 shrink-0" aria-hidden />
          <dt className="shrink-0">Илгээгч</dt>
          <dd className="font-semibold text-ink">{sender}</dd>
        </div>
      )}
      {row.counterparty && (
        <div className="flex items-start gap-1.5">
          <Landmark className="mt-0.5 size-4 shrink-0" aria-hidden />
          <dt className="shrink-0">Данс</dt>
          <dd className="min-w-0">
            <Meta
              items={[
                <span key="no" className="tabular-nums text-ink">
                  {row.counterparty}
                </span>,
                owner ? (
                  <span key="owner">
                    Эзэмшигч <span className="font-semibold text-ink">{owner}</span>
                  </span>
                ) : !sender && !acc?.owner ? (
                  "эзэмшигч хуулгад бичигдээгүй"
                ) : null,
                acc && acc.txCount > 1 ? `энэ данснаас ${acc.txCount} гүйлгээ` : null,
              ]}
            />
          </dd>
        </div>
      )}
      {acc && acc.students.length > 0 && (
        <div className="flex items-start gap-1.5">
          <History className="mt-0.5 size-4 shrink-0" aria-hidden />
          <dt className="shrink-0">Өмнө оноосон</dt>
          <dd className="text-ink">
            <Meta items={acc.students.map((s) => s.name)} />
          </dd>
        </div>
      )}
    </dl>
  );
}
