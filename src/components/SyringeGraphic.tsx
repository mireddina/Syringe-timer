/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getSyringeGraduationTicks, formatVolume } from '../utils/calculations';

interface SyringeGraphicProps {
  nominalVolume: number;
  currentVolume: number;
  colorTheme?: string;
  drugName?: string;
}

export const SyringeGraphic: React.FC<SyringeGraphicProps> = ({
  nominalVolume,
  currentVolume,
  colorTheme = 'sky',
  drugName = 'Farmaco'
}) => {
  const safeNominal = nominalVolume > 0 ? nominalVolume : 50;
  const safeCurrent = Math.max(0, Math.min(safeNominal, currentVolume));
  const fillPercentage = (safeCurrent / safeNominal) * 100;

  // Compute graduation marks tailored strictly to this nominal volume
  const { majorTicks, minorTicks } = getSyringeGraduationTicks(safeNominal);

  // Colors
  const fluidColors: Record<string, { fill: string; stroke: string; glow: string; text: string }> = {
    sky: {
      fill: 'rgba(56, 189, 248, 0.65)',
      stroke: 'rgba(14, 165, 233, 0.9)',
      glow: 'rgba(56, 189, 248, 0.25)',
      text: 'text-sky-600 dark:text-sky-400'
    },
    emerald: {
      fill: 'rgba(52, 211, 153, 0.65)',
      stroke: 'rgba(16, 185, 129, 0.9)',
      glow: 'rgba(52, 211, 153, 0.25)',
      text: 'text-emerald-600 dark:text-emerald-400'
    },
    amber: {
      fill: 'rgba(251, 191, 36, 0.7)',
      stroke: 'rgba(217, 119, 6, 0.9)',
      glow: 'rgba(251, 191, 36, 0.25)',
      text: 'text-amber-600 dark:text-amber-400'
    },
    violet: {
      fill: 'rgba(192, 132, 252, 0.65)',
      stroke: 'rgba(147, 51, 234, 0.9)',
      glow: 'rgba(192, 132, 252, 0.25)',
      text: 'text-violet-600 dark:text-violet-400'
    },
    rose: {
      fill: 'rgba(251, 113, 133, 0.65)',
      stroke: 'rgba(225, 29, 72, 0.9)',
      glow: 'rgba(251, 113, 133, 0.25)',
      text: 'text-rose-600 dark:text-rose-400'
    }
  };

  const selectedTheme = fluidColors[colorTheme] || fluidColors.sky;

  // Syringe geometry in SVG coordinate system (viewBox: 0 0 740 180)
  // Luer Lock Tip: X: 40 to 80
  // Barrel: X: 80 to 580 (width: 500)
  // Barrel Y: 35 to 145 (height: 110)
  // Flange: X: 575 to 585
  // Plunger Rod: X: 580 + (travel)
  const barrelStartX = 85;
  const barrelWidth = 495;
  const barrelTop = 38;
  const barrelHeight = 104;
  const barrelBottom = barrelTop + barrelHeight;

  // Fluid width: 0 ml is at barrelStartX, safeNominal ml fills entire barrel
  const fluidWidth = (fillPercentage / 100) * barrelWidth;
  const stopperX = barrelStartX + fluidWidth;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full relative overflow-hidden bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
        {/* Header HUD inside card */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200 tracking-wide">
              {drugName || 'INFUSIONE'}
            </span>
            <span>·</span>
            <span>CAPACITÀ: {formatVolume(safeNominal)} ml</span>
          </div>
          <div className="flex items-center gap-2">
            <span>RESIDUO:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {formatVolume(safeCurrent)} ml
            </span>
            <span className="text-slate-400">({fillPercentage.toFixed(0)}%)</span>
          </div>
        </div>

        {/* Realistic Interactive SVG Syringe */}
        <div className="w-full h-36 sm:h-44 flex items-center justify-center">
          <svg
            viewBox="0 0 740 180"
            className="w-full h-full select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Glass Barrel Gradient */}
              <linearGradient id="barrelGlass" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="35%" stopColor="#f1f5f9" stopOpacity="0.3" />
                <stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.75" />
              </linearGradient>

              {/* Fluid Gradient */}
              <linearGradient id={`fluidGrad-${colorTheme}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={selectedTheme.stroke} stopOpacity="0.55" />
                <stop offset="50%" stopColor={selectedTheme.fill} stopOpacity="0.75" />
                <stop offset="100%" stopColor={selectedTheme.stroke} stopOpacity="0.85" />
              </linearGradient>

              {/* Plunger Rubber Stopper Gradient */}
              <linearGradient id="rubberStopper" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              {/* Plunger Plastic Stem */}
              <linearGradient id="plungerStem" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>

              {/* Clip Path for Barrel interior */}
              <clipPath id="barrelInteriorClip">
                <rect
                  x={barrelStartX}
                  y={barrelTop}
                  width={barrelWidth}
                  height={barrelHeight}
                  rx="6"
                />
              </clipPath>
            </defs>

            {/* Background Barrel Guide */}
            <rect
              x={barrelStartX}
              y={barrelTop}
              width={barrelWidth}
              height={barrelHeight}
              rx="6"
              fill="url(#barrelGlass)"
              stroke="#94a3b8"
              strokeWidth="2.5"
            />

            {/* FLUID LAYER (clipped inside barrel) */}
            <g clipPath="url(#barrelInteriorClip)">
              {/* Liquid Rect */}
              <rect
                x={barrelStartX}
                y={barrelTop}
                width={Math.max(0, fluidWidth)}
                height={barrelHeight}
                fill={`url(#fluidGrad-${colorTheme})`}
                className="transition-all duration-300 ease-out"
              />

              {/* Meniscus / Liquid Surface reflection */}
              {fluidWidth > 2 && (
                <line
                  x1={barrelStartX + fluidWidth}
                  y1={barrelTop}
                  x2={barrelStartX + fluidWidth}
                  y2={barrelBottom}
                  stroke={selectedTheme.stroke}
                  strokeWidth="3"
                  className="transition-all duration-300 ease-out"
                />
              )}
            </g>

            {/* PLUNGER SHAFT & RUBBER STOPPER */}
            <g className="transition-all duration-300 ease-out">
              {/* Rubber Stopper Seals inside barrel */}
              <rect
                x={stopperX - 3}
                y={barrelTop + 2}
                width="16"
                height={barrelHeight - 4}
                rx="3"
                fill="url(#rubberStopper)"
              />
              <rect
                x={stopperX + 6}
                y={barrelTop + 4}
                width="4"
                height={barrelHeight - 8}
                fill="#475569"
              />

              {/* Plunger plastic rib extending to the right */}
              <rect
                x={stopperX + 13}
                y={barrelTop + (barrelHeight / 2) - 8}
                width={Math.max(20, 700 - (stopperX + 13))}
                height="16"
                fill="url(#plungerStem)"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              {/* Top/Bottom Plunger cross fins */}
              <line
                x1={stopperX + 20}
                y1={barrelTop + (barrelHeight / 2)}
                x2="700"
                y2={barrelTop + (barrelHeight / 2)}
                stroke="#94a3b8"
                strokeWidth="2"
              />

              {/* Plunger Thumb Rest Disk */}
              <rect
                x="695"
                y={barrelTop - 12}
                width="14"
                height={barrelHeight + 24}
                rx="4"
                fill="#cbd5e1"
                stroke="#475569"
                strokeWidth="2"
              />
            </g>

            {/* GRADUATION TICKS & VOLUME NUMBERS */}
            {/* Minor Ticks */}
            {minorTicks.map((val, idx) => {
              const tickX = barrelStartX + (val / safeNominal) * barrelWidth;
              return (
                <line
                  key={`min-${idx}`}
                  x1={tickX}
                  y1={barrelTop}
                  x2={tickX}
                  y2={barrelTop + 14}
                  stroke="#334155"
                  strokeWidth="1.2"
                  opacity="0.75"
                />
              );
            })}

            {/* Major Ticks with Numbers */}
            {majorTicks.map((val) => {
              const tickX = barrelStartX + (val / safeNominal) * barrelWidth;
              const isZero = val === 0;
              const isMax = Math.abs(val - safeNominal) < 0.001;
              return (
                <g key={`maj-${val}`}>
                  {/* Top tick mark */}
                  <line
                    x1={tickX}
                    y1={barrelTop}
                    x2={tickX}
                    y2={barrelTop + 24}
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                  {/* Bottom tick mark */}
                  <line
                    x1={tickX}
                    y1={barrelBottom - 18}
                    x2={tickX}
                    y2={barrelBottom}
                    stroke="#0f172a"
                    strokeWidth="1.6"
                  />
                  {/* Number Label */}
                  <text
                    x={tickX}
                    y={barrelTop + 40}
                    textAnchor={isZero ? 'start' : isMax ? 'end' : 'middle'}
                    className="font-mono text-[13px] font-bold fill-slate-800 dark:fill-slate-900 select-none"
                    style={{ pointerEvents: 'none' }}
                  >
                    {formatVolume(val)}
                  </text>
                </g>
              );
            })}

            {/* Luer Lock Nozzle / Tip on Left */}
            {/* Cone taper */}
            <polygon
              points={`85,${barrelTop + 32} 55,${barrelTop + 40} 55,${barrelBottom - 40} 85,${barrelBottom - 32}`}
              fill="#cbd5e1"
              stroke="#64748b"
              strokeWidth="2"
            />
            {/* Luer Lock Collar */}
            <rect
              x="30"
              y={barrelTop + 42}
              width="25"
              height={barrelHeight - 84}
              rx="2"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="2"
            />
            {/* Internal catheter line / infusion exit port */}
            <line
              x1="12"
              y1={barrelTop + barrelHeight / 2}
              x2="30"
              y2={barrelTop + barrelHeight / 2}
              stroke={selectedTheme.stroke}
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Barrel Flanges (Finger Grip) on Right */}
            <rect
              x={barrelStartX + barrelWidth - 2}
              y={barrelTop - 18}
              width="14"
              height={barrelHeight + 36}
              rx="4"
              fill="#cbd5e1"
              stroke="#64748b"
              strokeWidth="2.5"
            />

            {/* Glass Highlighting Reflection Strip */}
            <rect
              x={barrelStartX + 6}
              y={barrelTop + 8}
              width={barrelWidth - 12}
              height="10"
              rx="5"
              fill="#ffffff"
              opacity="0.4"
              style={{ pointerEvents: 'none' }}
            />
          </svg>
        </div>

        {/* Footer Sub-indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
          <span>Scala graduata dinamica calibrata su {formatVolume(safeNominal)} ml</span>
          <span className="font-mono">
            {formatVolume(safeNominal - safeCurrent)} ml già infusi
          </span>
        </div>
      </div>
    </div>
  );
};
