import { dateTimeUB } from "@/components/thousand/format";

export type ScanLockReason = "NO_SOLUTION" | "NOT_IN_TEST" | "NOT_TAKEN" | "WAITING";

/**
 * QR-аар нээсэн бодлогын бодолт хаалттай үед сурагчид харуулах тайлбар.
 * Шалтгааныг сервер (api/src/scan/scan-gate.ts) шийднэ — энд зөвхөн үг хэллэг.
 * Өнгө аяс: тайлбарлах, буруутгахгүй (STATUS §6.10).
 */
export function lockMessage(reason: ScanLockReason, opensAt: string | null): { title: string; body: string } {
  switch (reason) {
    case "WAITING":
      return {
        title: "Бодолт удахгүй нээгдэнэ",
        body: opensAt
          ? `Шалгалтаа өгсөн байна. Бодолт ${dateTimeUB(opensAt)}-д нээгдэнэ.`
          : "Шалгалтаа өгсөн байна. Багш нээсний дараа бодолт харагдана.",
      };
    case "NOT_TAKEN":
      return {
        title: "Эхлээд өөрөө бодоод үзээрэй",
        body: "Энэ бодлого орсон шалгалтаа өгсний дараа бодолт нь нээгдэнэ.",
      };
    case "NOT_IN_TEST":
      return {
        title: "Бодолт хараахан нээгдээгүй",
        body: "Энэ бодлого одоогоор шалгалтад ороогүй тул бодолтыг харах боломжгүй.",
      };
    case "NO_SOLUTION":
      return {
        title: "Бодолт бэлтгэгдэж байна",
        body: "Энэ бодлогын бодолтыг багш нар бичиж байна.",
      };
  }
}
