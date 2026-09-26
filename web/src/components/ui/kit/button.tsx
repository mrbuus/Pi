import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-bold tracking-wide transition-[color,background-color,border-color,box-shadow,transform] outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // «Товгор» 3D товч — доод сүүдэр нь өөрийн өнгөний бараан хувилбар.
        default: "btn-3d bg-brand-bright text-on-brand hover:brightness-105",
        success: "btn-3d bg-success text-on-success [--btn-3d-base:var(--success)] hover:brightness-105",
        secondary: "chunky chunky-press rounded-2xl border-brand-bright/30 bg-brand-bright/10 text-brand-soft",
        outline: "chunky chunky-press rounded-2xl text-ink hover:bg-bg",
        ghost: "text-ink-dim hover:bg-ink/5 hover:text-ink",
        danger: "chunky chunky-press rounded-2xl border-error/35 text-error hover:bg-error/5",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "min-h-9 px-3 text-sm",
        md: "min-h-12 px-5 text-sm",
        lg: "min-h-12 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** true бол хүүхэд элементийг (ж: <Link>) товчны хэлбэрээр рендерлэнэ. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
