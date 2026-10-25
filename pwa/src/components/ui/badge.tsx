import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-neutral-100 text-neutral-950",
        secondary:
          "border-neutral-800 bg-neutral-900 text-neutral-300",
        outline:
          "border-neutral-700 text-neutral-300",
        success:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        warning:
          "border-amber-500/30 bg-amber-500/15 text-amber-300",
        info:
          "border-sky-500/30 bg-sky-500/15 text-sky-300",
        purple:
          "border-purple-500/30 bg-purple-500/15 text-purple-300",
        destructive:
          "border-rose-500/30 bg-rose-500/15 text-rose-300",
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

