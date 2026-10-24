"use client";

import React, { useMemo } from "react";

interface VersionSpec {
  version: number;
  ecCodewordsPerBlock: number;
  g1Blocks: number;
  g1DataCodewords: number;
  g2Blocks: number;
  g2DataCodewords: number;
  alignmentCenters: number[];
}

// ISO/IEC 18004 — Niveau de correction d'erreur M (15 %) pour les versions 1 à 10
const VERSION_SPECS_M: VersionSpec[] = [
  {
    version: 1,
    ecCodewordsPerBlock: 10,
    g1Blocks: 1,
    g1DataCodewords: 16,
    g2Blocks: 0,
    g2DataCodewords: 0,
    alignmentCenters: [],
  },
  {
    version: 2,
    ecCodewordsPerBlock: 16,
    g1Blocks: 1,
    g1DataCodewords: 28,
    g2Blocks: 0,
    g2DataCodewords: 0,
    alignmentCenters: [6, 18],
  },
  {
    version: 3,
    ecCodewordsPerBlock: 26,
    g1Blocks: 1,
    g1DataCodewords: 44,
    g2Blocks: 0,
    g2DataCodewords: 0,
    alignmentCenters: [6, 22],
  },
  {
    version: 4,
    ecCodewordsPerBlock: 18,
    g1Blocks: 2,
    g1DataCodewords: 32,
    g2Blocks: 0,
    g2DataCodewords: 0,
    alignmentCenters: [6, 26],
  },
  {
    version: 5,
    ecCodewordsPerBlock: 24,
    g1Blocks: 2,
    g1DataCodewords: 43,
    g2Blocks: 0,
    g2DataCodewords: 0,
    alignmentCenters: [6, 30],
  },
  {
    version: 6,
    ecCodewordsPerBlock: 16,
    g1Blocks: 4,
    g1DataCodewords: 27,
    g2Blocks: 0,
    g2DataCodewords: 0,
    alignmentCenters: [6, 34],
  },
  {
    version: 7,
    ecCodewordsPerBlock: 18,
    g1Blocks: 4,
    g1DataCodewords: 31,
    g2Blocks: 0,
    g2DataCodewords: 0,
    alignmentCenters: [6, 22, 38],
  },
  {
    version: 8,
    ecCodewordsPerBlock: 22,
    g1Blocks: 2,
    g1DataCodewords: 38,
    g2Blocks: 2,
    g2DataCodewords: 39,
    alignmentCenters: [6, 24, 42],
  },
  {
    version: 9,
    ecCodewordsPerBlock: 22,
    g1Blocks: 3,
    g1DataCodewords: 36,
    g2Blocks: 2,
    g2DataCodewords: 37,
    alignmentCenters: [6, 26, 46],
  },
  {
    version: 10,
    ecCodewordsPerBlock: 26,
    g1Blocks: 4,
    g1DataCodewords: 43,
    g2Blocks: 1,
    g2DataCodewords: 44,
    alignmentCenters: [6, 28, 50],
  },
];

// Tables GF(256) avec polynôme primitif 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildReedSolomonDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) {
        result[j] ^= result[j + 1];
      }
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function computeReedSolomonRemainder(data: Uint8Array, degree: number): Uint8Array {
  const divisor = buildReedSolomonDivisor(degree);
  const result = new Uint8Array(degree);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    result.copyWithin(0, 1);
    result[degree - 1] = 0;
    for (let j = 0; j < degree; j++) {
      result[j] ^= gfMul(divisor[j], factor);
    }
  }
  return result;
}

function pushBits(bits: number[], val: number, length: number): void {
  for (let i = length - 1; i >= 0; i--) {
    bits.push((val >>> i) & 1);
  }
}

export function generateQrMatrix(text: string): boolean[][] {
  const payloadBytes = new TextEncoder().encode(text);

  // Choix de la version minimale (1..10) pouvant contenir payloadBytes en mode Byte (0100)
  let spec: VersionSpec | null = null;
  for (const candidate of VERSION_SPECS_M) {
    const totalDataCodewords =
      candidate.g1Blocks * candidate.g1DataCodewords +
      candidate.g2Blocks * candidate.g2DataCodewords;
    const countBits = candidate.version <= 9 ? 8 : 16;
    const availableBits = totalDataCodewords * 8 - 4 - countBits;
    if (payloadBytes.length * 8 <= availableBits) {
      spec = candidate;
      break;
    }
  }

  if (!spec) {
    throw new Error("Chaîne Wi-Fi trop longue pour un QR Code standard.");
  }

  const totalDataCodewords =
    spec.g1Blocks * spec.g1DataCodewords + spec.g2Blocks * spec.g2DataCodewords;
  const totalDataBits = totalDataCodewords * 8;

  const bits: number[] = [];
  // Mode Byte = 0100
  pushBits(bits, 0b0100, 4);
  pushBits(bits, payloadBytes.length, spec.version <= 9 ? 8 : 16);
  for (let i = 0; i < payloadBytes.length; i++) {
    pushBits(bits, payloadBytes[i], 8);
  }

  // Terminateur (jusqu'à 4 zéros)
  const terminatorLength = Math.min(4, totalDataBits - bits.length);
  pushBits(bits, 0, terminatorLength);

  // Alignement sur l'octet
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Octets de remplissage alternés 0xEC / 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalDataBits) {
    pushBits(bits, padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataCodewords = new Uint8Array(totalDataCodewords);
  for (let i = 0; i < totalDataCodewords; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    dataCodewords[i] = byte;
  }

  // Découpage en blocs et calcul Reed-Solomon + entrelacement
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < spec.g1Blocks; i++) {
    const block = dataCodewords.slice(offset, offset + spec.g1DataCodewords);
    offset += spec.g1DataCodewords;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomonRemainder(block, spec.ecCodewordsPerBlock));
  }
  for (let i = 0; i < spec.g2Blocks; i++) {
    const block = dataCodewords.slice(offset, offset + spec.g2DataCodewords);
    offset += spec.g2DataCodewords;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomonRemainder(block, spec.ecCodewordsPerBlock));
  }

  const interleaved: number[] = [];
  const maxDataLen = Math.max(spec.g1DataCodewords, spec.g2DataCodewords);
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) {
        interleaved.push(block[i]);
      }
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (const block of ecBlocks) {
      interleaved.push(block[i]);
    }
  }

  // Construction de la grille (row = y, col = x)
  const size = spec.version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );

  const setFunctionModule = (row: number, col: number, dark: boolean) => {
    if (row < 0 || row >= size || col < 0 || col >= size) return;
    modules[row][col] = dark;
    isFunction[row][col] = true;
  };

  // Motifs de détection de position (Finder patterns 7x7 + séparateurs blancs)
  const drawFinderPattern = (topRow: number, leftCol: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topRow + dr;
        const c = leftCol + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        const isIn7x7 = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        setFunctionModule(r, c, isIn7x7 && (isBorder || isCenter));
      }
    }
  };

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // Motifs de synchronisation (Timing patterns)
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Motifs d'alignement (Alignment patterns 5x5)
  const centers = spec.alignmentCenters;
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === centers.length - 1) ||
        (i === centers.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = centers[i];
      const cc = centers[j];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunctionModule(cr + dr, cc + dc, dist !== 1);
        }
      }
    }
  }

  // Module sombre fixe : (row = 4 * version + 9, col = 8)
  setFunctionModule(4 * spec.version + 9, 8, true);

  // Réservation des zones d'information de format
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
  }

  // Blocs d'information de version (pour versions >= 7)
  if (spec.version >= 7) {
    let rem = spec.version;
    for (let i = 0; i < 12; i++) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const verBits = (spec.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = ((verBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(b, a, bit);
      setFunctionModule(a, b, bit);
    }
  }

  // Placement en zigzag des bits de données + ECC
  let bitIdx = 0;
  const totalInterleavedBits = interleaved.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        if (!isFunction[row][col]) {
          let dark = false;
          if (bitIdx < totalInterleavedBits) {
            const byte = interleaved[bitIdx >>> 3];
            dark = ((byte >>> (7 - (bitIdx & 7))) & 1) !== 0;
            bitIdx++;
          }
          modules[row][col] = dark;
        }
      }
    }
  }

  // Application du masque 0 ((row + col) % 2 === 0)
  const maskIndex = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c];
      }
    }
  }

  // Calcul BCH (15, 5) pour l'information de format : Niveau M = 00, Masque = 000
  const formatData = (0b00 << 3) | maskIndex;
  let formatRem = formatData;
  for (let i = 0; i < 10; i++) {
    formatRem = (formatRem << 1) ^ ((formatRem >>> 9) * 0x537);
  }
  const formatBits = ((formatData << 10) | formatRem) ^ 0x5412;

  const getFormatBit = (idx: number): boolean => ((formatBits >>> idx) & 1) !== 0;

  // Copie 1 : autour du finder haut-gauche (ISO/IEC 18004 Fig. 25 : bit 0 en (0,8), bit 14 en (8,0))
  for (let i = 0; i <= 5; i++) modules[i][8] = getFormatBit(i);
  modules[7][8] = getFormatBit(6);
  modules[8][8] = getFormatBit(7);
  modules[8][7] = getFormatBit(8);
  for (let i = 9; i < 15; i++) modules[8][14 - i] = getFormatBit(i);

  // Copie 2 : autour des finders haut-droite (ligne 8) et bas-gauche (colonne 8)
  for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = getFormatBit(i);
  for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = getFormatBit(i);

  return modules;
}

interface WifiQrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

export function WifiQrCodeSvg({
  value,
  size = 184,
  className = "",
}: WifiQrCodeSvgProps) {
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) {
    return null;
  }

  const quietZone = 4;
  const totalModules = matrix.length + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalModules} ${totalModules}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR Code de connexion Wi-Fi"
      className={`rounded-xl bg-white p-1 shadow-inner ${className}`}
    >
      <rect width={totalModules} height={totalModules} fill="#ffffff" />
      {matrix.map((row, rIdx) =>
        row.map((isDark, cIdx) =>
          isDark ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + quietZone}
              y={rIdx + quietZone}
              width={1}
              height={1}
              fill="#0a0a0a"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
