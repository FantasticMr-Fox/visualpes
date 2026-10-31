import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A96B] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-[#C9A96B] text-[#0E0E0E] font-semibold hover:bg-[#B89354] shadow-xs active:translate-y-px",
        secondary:
          "border border-white/10 bg-[#202024] text-[#F7F5EF] hover:bg-[#28282D] hover:text-white",
        outline:
          "border border-[#C9A96B]/40 bg-transparent text-[#DFCA9F] hover:bg-[#C9A96B]/10 hover:border-[#C9A96B]",
        ghost:
          "text-[#8C8379] hover:bg-white/5 hover:text-[#F7F5EF]",
        destructive:
          "border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25",
        link: "text-[#C9A96B] underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4 py-2",
        sm: "px-3 py-1.5 text-[11px]",
        lg: "px-5 py-2.5 text-sm",
        icon: "h-9 w-9",
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

