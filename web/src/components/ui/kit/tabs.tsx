"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

/** Утсан дээр хажуу тийш гүйлгэдэг «pill» таб мөр. Сумаар шилжинэ (Radix). */
export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-panel px-4 text-sm font-bold text-ink-dim transition outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-bright/60 data-[state=active]:border-transparent data-[state=active]:bg-brand-bright data-[state=active]:text-on-brand [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("outline-none", className)} {...props} />;
}
