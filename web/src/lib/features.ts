// Түр унтраасан функцүүд (эзэн 2026-10-13). Код устгаагүй — тохиргоог асаахад
// буцаж ажиллана: NEXT_PUBLIC_SMS_ENABLED=true (вэб) ба SMS_ENABLED=true (API).
export const SMS_ENABLED = process.env.NEXT_PUBLIC_SMS_ENABLED === "true";
