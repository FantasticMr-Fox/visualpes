import React from "react";

/** Cloche de réception (outline), normalisée sur la grille 24x24 des icônes Lucide. */
export function ConciergeBellIcon({
  className = "w-6 h-6",
  strokeWidth = 2,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* bouton poussoir */}
      <path d="M12 2.5v2" />
      <path d="M10 2.5h4" />
      {/* dôme de la sonnette */}
      <path d="M4.5 17c0-4.5 3.3-8.5 7.5-8.5s7.5 4 7.5 8.5" />
      {/* socle principal */}
      <path d="M2.5 17h19" />
      {/* pied / biseau inférieur */}
      <path d="M5 20.5h14" />
    </svg>
  );
}
