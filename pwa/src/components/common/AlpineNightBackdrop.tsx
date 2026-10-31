"use client";

import React from "react";
import Image from "next/image";

export function AlpineNightBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#060608]"
    >
      {/* 1. Photo panoramique réelle des Alpes bien visible */}
      <div className="absolute inset-0">
        <Image
          src="/alpes-bg.jpg"
          alt="Massif alpin VisuAlpes"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-[0.68] contrast-[1.05] saturate-[0.9]"
        />
      </div>

      {/* 2. Voile d'ombrage doux & dégradé pour garantir la lisibilité */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#060608]/70 via-transparent to-[#060608]/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.2)_0%,rgba(6,6,8,0.65)_100%)]" />
    </div>
  );
}
