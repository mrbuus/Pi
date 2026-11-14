import { formatMnt, TUITION } from "@/lib/orgInfo";

/**
 * Нүүрний «Хандах эрх» хэсгийн танхимын сургалтын төлбөр (тестэрийн санал 2026-11-05): өмнө нь
 * «Үнийн мэдээлэл Төлбөр хэсэгт» холбоос үнэгүй «Элсэлт» хэсэг рүү аваачдаг — хэрэглэгч үнээ олдоггүй
 * байв. Үнэ lib/orgInfo TUITION-оос (гараар давхардуулахгүй). Загвар нь home.css-ийн .acc.
 */
export default function HomeTuition() {
  return (
    <div className="tuit">
      <div className="mono dash">Танхимын сургалтын төлбөр, 2026–2027</div>
      <div className="acc tuit-grid">
        {TUITION.map((tier) => {
          const full = tier.plans.find((p) => p.kind === "FULL_YEAR");
          const inst = tier.plans.find((p) => p.kind === "INSTALLMENT");
          const month = tier.plans.find((p) => p.kind === "MONTHLY");
          return (
            <div key={tier.id} className="a">
              <div className="k">{tier.label}</div>
              {full && (
                <h3>
                  {formatMnt(full.amount)}
                  <small> / бүтэн жил</small>
                </h3>
              )}
              <ul className="tuit-list">
                {month && (
                  <li>
                    <span>Сар бүр</span>
                    <b>{formatMnt(month.amount)}</b>
                  </li>
                )}
                {inst && (
                  <li>
                    <span>
                      Хуваан төлөх, эхний төлбөр {formatMnt(tier.installment.firstPayment)}, үлдэгдлийг{" "}
                      {tier.installment.deadline}-нд
                    </span>
                    <b>{formatMnt(inst.amount)}</b>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="note">Ном, бодлогын сангийн багцын үнийг бүртгүүлж нэвтэрсний дараа «Миний эрхүүд» хэсгээс харна</p>
    </div>
  );
}
