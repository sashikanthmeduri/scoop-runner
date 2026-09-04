import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display tracking-wide uppercase transition-colors duration-[var(--motion-fast,250ms)] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/70 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-masthead text-paper hover:bg-masthead/90",
        paper: "bg-paper text-ink hover:bg-paper-dim",
        ink: "bg-ink-soft text-paper border border-paper/15 hover:border-paper/35",
        ghost: "bg-transparent text-paper hover:bg-paper/10",
      },
      size: {
        default: "h-11 rounded-[10px] px-5 text-sm",
        lg: "h-12 rounded-[12px] px-7 text-base",
        sm: "h-9 rounded-[8px] px-3 text-xs",
        icon: "size-11 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";
