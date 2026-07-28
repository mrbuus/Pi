"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

// ─── Top bar slot гэрээ ────────────────────────────────────────────────
// AppLayout нь дээд самбарынхаа баруун талд нэг DOM зангилаа (portal
// target) байрлуулж, түүнийг энэ context-оор бүх дэд хуудсанд дамжуулна.
// Ямар ч хуудас (жишээ нь багшийн самбар дахь ангийн сонголт) өөрийн
// удирдлагыг зүгээр л <TopBarSlot> дотор ороосон бол дээд самбарт
// автоматаар гарч ирнэ — AppLayout-ийг засах шаардлагагүй.
const TopBarSlotContext = createContext<HTMLDivElement | null>(null);

export function TopBarSlotProvider({
  node,
  children,
}: {
  node: HTMLDivElement | null;
  children: ReactNode;
}) {
  return (
    <TopBarSlotContext.Provider value={node}>
      {children}
    </TopBarSlotContext.Provider>
  );
}

/**
 * Дэд хуудаснаас дуудагдана: `<TopBarSlot><YourControl /></TopBarSlot>`.
 * AppLayout-ийн дээд самбар mount хийгдээгүй эсвэл slot зангилаа олдоогүй
 * тохиолдолд юу ч рендерлэхгүй (алдаа шидэхгүй) — SSR/эхний render-д аюулгүй.
 */
export default function TopBarSlot({ children }: { children: ReactNode }) {
  const node = useContext(TopBarSlotContext);
  if (!node) return null;
  return createPortal(children, node);
}
