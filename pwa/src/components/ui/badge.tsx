import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-white/10 bg-[#222226] text-[#F7F5EF]",
        gold:
          "border-[#C9A96B]/35 bg-[#C9A96B]/10 text-[#DFCA9F]",
        secondary:
          "border-white/10 bg-[#1A1A1E] text-[#8C8379]",
        outline:
          "border-white/10 text-[#8C8379]",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-400",
        info:
          "border-sky-500/30 bg-sky-500/10 text-sky-400",
        purple:
          "border-purple-500/30 bg-purple-500/10 text-purple-300",
        destructive:
          "border-rose-500/30 bg-rose-500/10 text-rose-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

