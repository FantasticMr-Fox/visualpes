import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex w-full rounded-lg border border-white/10 bg-[#111113] px-3.5 py-2 text-sm text-[#F7F5EF] placeholder:text-[#8C8379]/60 focus:border-[#C9A96B] focus:ring-1 focus:ring-[#C9A96B]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };

