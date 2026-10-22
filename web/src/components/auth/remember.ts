/**
 * «Намайг сана» сонголтыг хөтөчид санана (эзэн 2026-10-22). Өгөгдмөл нь
 * ЧАГТТАЙ — ихэнх сурагч өөрийн утсаар нэвтэрдэг; нийтийн компьютер дээр
 * хэрэглэгч өөрөө авна. Google-ээр нэвтрэхэд (/auth/google) мөн үүнийг уншина.
 */
const KEY = "pi_remember";

export function rememberPreference(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

export function saveRememberPreference(remember: boolean) {
  try {
    localStorage.setItem(KEY, remember ? "1" : "0");
  } catch {
    // Хөтчийн санах ой хаалттай — сонголт зөвхөн энэ удаад үйлчилнэ
  }
}
