import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-white text-neutral-950 shadow-sm hover:bg-neutral-200",
        destructive:
          "border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25",
        outline:
          "border border-neutral-800 bg-neutral-900/80 text-neutral-200 hover:bg-neutral-800 hover:text-white",
        secondary:
          "bg-neutral-800 text-neutral-100 hover:bg-neutral-700",
        ghost:
          "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100",
        link: "text-sky-300 underline-offset-4 hover:underline",
      },
      size: {
        default: "px-3.5 py-2",
        sm: "rounded-lg px-2.5 py-1.5 text-[11px]",
        lg: "rounded-xl px-5 py-2.5 text-sm",
        icon: "h-8 w-8 rounded-lg",
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
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

