/**
 * Байгууллагын бодит мэдээлэл — НЭГ ЭХ СУРВАЛЖ.
 *
 * Эх сурвалж: төвийн албан ёсны сургалтын төлбөрийн постер ба Facebook хуудас
 * (2026-07-26-нд баталгаажсан).
 *
 * ⚠️ Энд байгаа утгуудыг ХЭЗЭЭ Ч зохиож бичихгүй. Бүх тоо, данс, хаяг нь
 * төвийн нийтэлсэн материалаас гаралтай. Өөрчлөгдвөл зөвхөн энэ файлыг засна —
 * UI-ийн олон газар давхардуулж бичихгүй.
 *
 * ⚠️ SPEC §12.1 дэх "чөлөөт дүнгийн зарчим" (үнэ заахгүй, хэрэглэгч дурын дүн
 * бичнэ) нь ХУУЧИРСАН. Төв тогтмол үнэтэй болсон тул төлбөрийн урсгал
 * доорх багцууд дээр суурилна.
 */

export const ORG = {
  name: "Шинэ Ирээдүйн Эзэд сургалтын төв",
  shortName: "Шинэ Ирээдүйн Эзэд",
  slogan: "Чанартай сургалт, тогтвортой амжилт",
  tagline: 'Математик, Нийгэм судлалын хичээлээр "Элсэлтийн Ерөнхий Шалгалт"-нд бэлтгэнэ',
  email: "Shineireedui2021@gmail.com",
  facebook: "https://www.facebook.com/Baasanjaw2022",
} as const;

/** Холбоо барих утаснууд — постерын дарааллаар */
export const PHONES = ["9590 4411", "8810 6256", "8810 3988"] as const;

/** Салбарууд — Facebook хуудасны хавтасны зурагнаас */
export const BRANCHES = [
  {
    id: "salbar-1",
    label: "Салбар 1",
    address:
      'Баруун 4 зам, Барилгын политехник коллежийн хойно, "Бунда-Рага" улаан тоосгон байшин, 5 давхар',
    district: "Улаанбаатар",
  },
  {
    id: "salbar-2",
    label: "Салбар 2",
    address:
      'Зүүн 4 зам, Жуковын автобусны буудлын баруун талд, "Жоби 72" төвийн 3 давхар',
    district: "Улаанбаатар",
  },
] as const;

/** Банкны данс — төвийн нийтэлсэн постероос */
export const BANK = {
  name: "Хаан банк",
  account: "5720838844",
  iban: "MN540005005720838844",
  holder: "О.Баасанжав",
} as const;

export type PaymentPlanKind = "FULL_YEAR" | "INSTALLMENT" | "MONTHLY";

export interface TuitionPlan {
  kind: PaymentPlanKind;
  label: string;
  /** Нийт төлөх дүн (сар бүрийн хувьд — нэг сарын төлбөр) */
  amount: number;
  note?: string;
}

export interface TuitionTier {
  id: string;
  /** Дэлгэцэнд харагдах нэр */
  label: string;
  /** Хамрах ангиуд */
  grades: number[];
  plans: TuitionPlan[];
  /** Хуваан төлөх нөхцөл */
  installment: {
    firstPayment: number;
    /** Үлдэгдлийг барагдуулах эцсийн хугацаа (сар.өдөр) */
    deadline: string;
  };
}

/**
 * Сургалтын төлбөр — 2026-2027 оны хичээлийн жил.
 * Анхаарах: хуваан төлөх нь нэг дор төлөхөөс ҮНЭТЭЙ (тайлбарыг UI-д харуулна).
 */
export const TUITION: TuitionTier[] = [
  {
    id: "grade-12",
    label: "12-р анги",
    grades: [12],
    plans: [
      { kind: "FULL_YEAR", label: "Бүтэн жилийн төлбөр", amount: 2_500_000, note: "Нэг дор төлөх" },
      { kind: "INSTALLMENT", label: "Хуваан төлөх", amount: 3_000_000 },
      { kind: "MONTHLY", label: "Сар бүр төлөх", amount: 350_000, note: "Сарын төлбөр" },
    ],
    installment: { firstPayment: 1_500_000, deadline: "12.20" },
  },
  {
    id: "grade-9-11",
    label: "9-11-р анги",
    grades: [9, 10, 11],
    plans: [
      { kind: "FULL_YEAR", label: "Бүтэн жилийн төлбөр", amount: 2_000_000, note: "Нэг дор төлөх" },
      { kind: "INSTALLMENT", label: "Хуваан төлөх", amount: 2_500_000 },
      { kind: "MONTHLY", label: "Сар бүр төлөх", amount: 300_000, note: "Сарын төлбөр" },
    ],
    installment: { firstPayment: 1_300_000, deadline: "12.20" },
  },
];

/** Төгрөгийн дүнг уншихад хялбар болгож форматлана: 2500000 -> "2,500,000₮" */
export function formatMnt(amount: number): string {
  return `${amount.toLocaleString("en-US")}₮`;
}

/** Дансны дугаарыг хуулахад зориулж цэвэрлэнэ */
export function bankAccountPlain(): string {
  return BANK.account.replace(/\s/g, "");
}

/** Сурагчийн ангид тохирох төлбөрийн багцыг олно */
export function tierForGrade(grade: number | null | undefined): TuitionTier | null {
  if (grade == null) return null;
  return TUITION.find((t) => t.grades.includes(grade)) ?? null;
}
