"use client";

import React from "react";

interface SavoieBlasonProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Blason historique officiel de la Savoie : « De gueules à la croix d'argent »
 * Écu traditionnel rouge carmin avec croix blanche d'argent centrée.
 */
export function SavoieBlason({ className = "h-4 w-auto", ...props }: SavoieBlasonProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 120"
      fill="none"
      aria-label="Blason de la Savoie"
      role="img"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="savoieShieldClip">
          <path d="M 6 4 H 94 V 62 C 94 92 74 108 50 116 C 26 108 6 92 6 62 Z" />
        </clipPath>
      </defs>

      {/* Contenu du blason découpé selon la forme de l'écu */}
      <g clipPath="url(#savoieShieldClip)">
        {/* Fond rouge de gueules officiel Savoie */}
        <rect x="0" y="0" width="100" height="120" fill="#D52B1E" />

        {/* Croix d'argent blanche */}
        {/* Barre verticale */}
        <rect x="38" y="0" width="24" height="120" fill="#FFFFFF" />
        {/* Barre horizontale */}
        <rect x="0" y="36" width="100" height="24" fill="#FFFFFF" />
      </g>

      {/* Contour fin de protection de l'écu */}
      <path
        d="M 6 4 H 94 V 62 C 94 92 74 108 50 116 C 26 108 6 92 6 62 Z"
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth="2.5"
        fill="none"
      />
    </svg>
  );
}
