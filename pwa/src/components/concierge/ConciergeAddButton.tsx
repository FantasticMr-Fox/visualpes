"use client";

import React from "react";
import { Plus } from "lucide-react";

interface ConciergeAddButtonProps {
  onClick: () => void;
  title: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Bouton d'action (+) signature VisuAlpes Alpine Gold.
 * Harmonisé sur l'ensemble de l'application cliente :
 * - Diamètre 40px (w-10 h-10)
 * - Fond or ambré lumineux (#F3C075 -> hover #E5B365)
 * - Halo lumineux diffus (box-shadow or chaud)
 * - Icône Plus noire alpine avec rotation fluide de 90° au survol
 */
export function ConciergeAddButton({
  onClick,
  title,
  ariaLabel,
  className = "",
}: ConciergeAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-10 h-10 rounded-full bg-[#F3C075] hover:bg-[#E5B365] text-[#0A0A0C] flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 cursor-pointer shrink-0 hover:shadow-[0_0_24px_rgba(243,192,117,0.65)] ${className}`}
      style={{
        boxShadow: "0 0 16px rgba(243, 192, 117, 0.4)",
      }}
      title={title}
      aria-label={ariaLabel || title}
    >
      <Plus className="w-5 h-5 stroke-[2.8] transition-transform duration-300 group-hover:rotate-90" />
    </button>
  );
}

