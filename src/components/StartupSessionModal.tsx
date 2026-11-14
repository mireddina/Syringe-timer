/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, Trash2, Clock } from 'lucide-react';
import { SyringeData } from '../types';
import { formatVolume } from '../utils/calculations';

interface StartupSessionModalProps {
  isOpen: boolean;
  syringes: SyringeData[];
  onKeepSaved: () => void;
  onStartFromZero: () => void;
}

export const StartupSessionModal: React.FC<StartupSessionModalProps> = ({
  isOpen,
  syringes,
  onKeepSaved,
  onStartFromZero
}) => {
  if (!isOpen || syringes.length === 0) return null;

  const visiblePumps = syringes.slice(0, 4);
  const remainingCount = syringes.length - visiblePumps.length;

  return (
    <div
      data-no-swipe="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="startup-modal-title"
        className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h2
              id="startup-modal-title"
              className="text-sm font-bold text-slate-900 dark:text-slate-100"
            >
              Pompe salvate trovate
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vuoi mantenere le impostazioni precedenti o ripartire da zero?
            </p>
          </div>
        </div>

        {/* Saved pumps preview */}
        <div className="p-5 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {syringes.length} {syringes.length === 1 ? 'pompa presente' : 'pompe presenti'} sul dispositivo
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 divide-y divide-slate-200/70 dark:divide-slate-800">
            {visiblePumps.map((syr, idx) => (
              <div
                key={syr.id}
                className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-slate-400 shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {syr.drugName || 'Farmaco'}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                  {formatVolume(syr.currentVolume)}/{formatVolume(syr.nominalVolume)} ml ·{' '}
                  {formatVolume(syr.infusionRate)} ml/h
                </span>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="px-3 py-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 text-center">
                + {remainingCount} {remainingCount === 1 ? 'altra pompa' : 'altre pompe'}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onStartFromZero}
            className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-rose-200 dark:border-rose-800/70 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Riparti da 0</span>
          </button>

          <button
            type="button"
            onClick={onKeepSaved}
            className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>Mantieni pompe</span>
          </button>
        </div>
      </div>
    </div>
  );
};
