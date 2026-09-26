"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/cn";

/* Утсан дээр доороос гарч ирэх, хуруугаар доош чирч хаадаг хуудас (vaul —
   shadcn/ui-ийн Drawer). Фокус занга, Escape, дэвсгэр дарж хаах бүгд дотроо. */
export const Drawer = (props: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={false} {...props} />
);
export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerClose = DrawerPrimitive.Close;
export const DrawerTitle = DrawerPrimitive.Title;
export const DrawerDescription = DrawerPrimitive.Description;

export function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
      <DrawerPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[28px] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] outline-none",
          className,
        )}
        {...props}
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-ink/15" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}
