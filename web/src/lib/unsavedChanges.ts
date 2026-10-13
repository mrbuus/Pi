/**
 * Хадгалаагүй өөрчлөлтийн бүртгэл (docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md §1).
 *
 * Засварлагч бүр `useUnsavedGuard(dirty)`-ээр энд бүртгүүлнэ. Нэг л удаа:
 *   - `beforeunload` — хуудас хаах/дахин ачаалахад хөтчийн асуулт
 *   - дотоод холбоос (<a href>, Next <Link>) дарахад «Хадгалаагүй өөрчлөлт…» асуулт
 * Таб солих, мөр хураах зэрэг өөр «гарах» үйлдлийн өмнө `confirmDiscardUnsaved()`.
 */

export const LEAVE_MESSAGE = "Хадгалаагүй өөрчлөлт байна. Хадгалахгүйгээр гарах уу?";

const sources = new Map<symbol, string>();
let installed = false;

export function hasUnsaved(): boolean {
  return sources.size > 0;
}

export function markUnsaved(id: symbol, dirty: boolean, label = ""): void {
  if (dirty) sources.set(id, label);
  else sources.delete(id);
  if (dirty) install();
}

/** true — гарч болно (өөрчлөлтгүй эсвэл хэрэглэгч зөвшөөрсөн). */
export function confirmDiscardUnsaved(message = LEAVE_MESSAGE): boolean {
  if (!hasUnsaved() || typeof window === "undefined") return true;
  const ok = window.confirm(message);
  // Зөвшөөрсөн бол дараагийн шилжилт (навигаци) дахин асуухгүй
  if (ok) sources.clear();
  return ok;
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsaved()) return;
    event.preventDefault();
    event.returnValue = "";
  });
  // Capture үе шатанд — Next <Link>-ийн onClick-оос ӨМНӨ ажиллана.
  document.addEventListener(
    "click",
    (event) => {
      if (!hasUnsaved() || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // гадаад холбоос — beforeunload асууна
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!confirmDiscardUnsaved()) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
}
