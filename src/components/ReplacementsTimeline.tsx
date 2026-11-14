/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SyringeData } from '../types';
import {
  computeSyringeCalculations,
  formatVolume,
  formatClockTime
} from '../utils/calculations';
import { computeDoseFlow } from '../utils/dose';
import { getPumpColorStyle } from '../utils/pumpColors';
import {
  AlertTriangle,
  Syringe,
  Clock,
  ShieldCheck,
  UserCheck,
  SlidersHorizontal,
  Bell,
  BellOff
} from 'lucide-react';

interface ReplacementsTimelineProps {
  syringes: SyringeData[];
  currentTime: Date;
  shiftEndDate: Date;
  onOpenPumpDetail?: (id: string) => void;
  onTogglePumpAlarm?: (id: string) => void;
}

export const ReplacementsTimeline: React.FC<ReplacementsTimelineProps> = ({
  syringes,
  currentTime,
  shiftEndDate,
  onOpenPumpDetail,
  onTogglePumpAlarm
}) => {
  const pumpEntries = syringes.map((syringe, index) => ({
    index: index + 1,
    syringe,
    calculations: computeSyringeCalculations(syringe, currentTime, shiftEndDate)
  }));

  const colleagueCount = pumpEntries.filter(
    (item) => item.calculations.advisePrepareForColleague
  ).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Syringe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
            Ricambi Necessari Fino a Fine Turno
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          <span>
            {syringes.length} {syringes.length === 1 ? 'pompa' : 'pompe'}
          </span>
          {colleagueCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {colleagueCount} per collega
              </span>
            </>
          )}
        </div>
      </div>

      {/* Per-Pump Replacement List */}
      {pumpEntries.length === 0 ? (
        <div className="p-6 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
          Nessuna pompa attiva nel turno. Aggiungi una pompa per calcolare i ricambi.
        </div>
      ) : (
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {pumpEntries.map(({ index, syringe, calculations }) => {
          const {
            coversFullShift,
            syringesNeededForShift,
            replacements,
            residualVolumeAtShiftEnd,
            residualMinutesAfterShiftEnd,
            syringeEndsAtAfterShift,
            advisePrepareForColleague,
            totalVolumeNeededForShift,
            shiftEnd,
            isFinished
          } = calculations;

          const nominalVol = syringe.nominalVolume;
          const statusLabel = isFinished
            ? 'Esaurita'
            : syringe.isRunning
            ? 'In esecuzione'
            : 'In pausa';

          const statusColorClass = isFinished
            ? 'text-rose-600 dark:text-rose-400'
            : syringe.isRunning
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400';

          const colorStyle = getPumpColorStyle(syringe.color);
          const isAlarmActive =
            !syringe.alarmDismissed &&
            (calculations.isPreAlarmActive || calculations.isUrgentAlarmActive);
          const isAlarmSilenced =
            !syringe.soundEnabled || Boolean(syringe.alarmDismissed);

          return (
            <div key={syringe.id} className={`p-4 space-y-3 ${colorStyle.borderLeftClass}`}>
              {/* Pump Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      aria-hidden="true"
                      className={`w-3 h-3 rounded-[3px] shrink-0 ${colorStyle.swatchClass}`}
                    />
                    <span className="text-xs font-mono font-bold text-slate-400">
                      #{index}
                    </span>
                    <h3
                      className={`text-sm font-bold px-2 py-0.5 rounded-md truncate max-w-full ${colorStyle.highlightClass}`}
                    >
                      {syringe.drugName || 'Farmaco'}
                    </h3>
                    <span className={`text-xs font-medium ${statusColorClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    <span>
                      Residuo {formatVolume(syringe.currentVolume)} / {formatVolume(nominalVol)} ml
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatVolume(syringe.infusionRate)} ml/h</span>
                    {(() => {
                      const doseFlow = computeDoseFlow(syringe);
                      if (!doseFlow) return null;
                      return (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {doseFlow.formatted}
                          </span>
                        </>
                      );
                    })()}
                    <span aria-hidden="true">·</span>
                    <span>
                      Fine turno alle {shiftEnd ? formatClockTime(shiftEnd) : '--:--'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-mono tabular-nums font-bold ${
                      coversFullShift
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {coversFullShift
                      ? '0 ricambi'
                      : `${syringesNeededForShift} ${
                          syringesNeededForShift === 1 ? 'ricambio' : 'ricambi'
                        }`}
                  </span>

                  {onTogglePumpAlarm && (
                    <button
                      type="button"
                      onClick={() => onTogglePumpAlarm(syringe.id)}
                      title={
                        isAlarmActive
                          ? 'Annulla allarme attivo su questa pompa'
                          : isAlarmSilenced
                          ? 'Riattiva allarme sonoro su questa pompa'
                          : 'Silenzia allarme su questa pompa'
                      }
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        isAlarmActive
                          ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold'
                          : isAlarmSilenced
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isAlarmSilenced || isAlarmActive ? (
                        <BellOff className="w-3 h-3 shrink-0" />
                      ) : (
                        <Bell className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                      <span>
                        {isAlarmActive
                          ? 'Annulla allarme'
                          : isAlarmSilenced
                          ? 'Silenziato'
                          : 'Silenzia'}
                      </span>
                    </button>
                  )}

                  {onOpenPumpDetail && (
                    <button
                      type="button"
                      onClick={() => onOpenPumpDetail(syringe.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>Dettaglio</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Replacement Status Summary for this Pump */}
              {coversFullShift ? (
                <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-emerald-900 dark:text-emerald-200 space-y-0.5">
                    <p className="font-semibold">
                      Nessun ricambio necessario durante il turno
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300 font-mono tabular-nums text-[11px]">
                      Residuo stimato al cambio turno:{' '}
                      <strong>{formatVolume(residualVolumeAtShiftEnd)} ml</strong> su{' '}
                      {formatVolume(nominalVol)} ml
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-amber-950 dark:text-amber-200 space-y-0.5">
                      <p className="font-semibold">
                        Preparare {syringesNeededForShift}{' '}
                        {syringesNeededForShift === 1 ? 'siringa piena' : 'siringhe piene'} da{' '}
                        {formatVolume(nominalVol)} ml
                      </p>
                      <p className="font-mono tabular-nums text-[11px] text-amber-800 dark:text-amber-300">
                        Volume infuso nel turno:{' '}
                        <strong>{formatVolume(totalVolumeNeededForShift)} ml</strong> · Residuo a fine turno:{' '}
                        <strong>{formatVolume(residualVolumeAtShiftEnd)} ml</strong>
                      </p>
                    </div>
                  </div>

                  {/* Scheduled replacement times */}
                  <div className="pl-6 space-y-1.5 border-t border-amber-200/60 dark:border-amber-800/50 pt-2">
                    {replacements.map((rep) => (
                      <div
                        key={rep.index}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums"
                      >
                        <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          Ricambio #{rep.index} · Ore {rep.formattedTime}
                        </span>
                        <span className="text-[11px] text-amber-700 dark:text-amber-300">
                          tra ~{rep.minutesFromNow} min · +{formatVolume(rep.volumeAdded)} ml
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Colleague Preparation Advice when syringe runs out within 1h of shift end */}
              {advisePrepareForColleague && (
                <div className="p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/35 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-2.5 text-xs">
                  <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-blue-950 dark:text-blue-100 space-y-0.5">
                    <p className="font-semibold">
                      Consiglio consegne: prepara 1 siringa da {formatVolume(nominalVol)} ml per il collega
                    </p>
                    <p className="text-blue-800 dark:text-blue-300 text-[11px]">
                      {residualMinutesAfterShiftEnd === 0 ? (
                        <>
                          Esaurimento coincidente con fine turno (ore{' '}
                          <strong className="font-mono tabular-nums">
                            {shiftEnd ? formatClockTime(shiftEnd) : '--:--'}
                          </strong>
                          ).
                        </>
                      ) : (
                        <>
                          Termina entro 1 ora dal fine turno (alle{' '}
                          <strong className="font-mono tabular-nums">
                            {syringeEndsAtAfterShift ? formatClockTime(syringeEndsAtAfterShift) : '--:--'}
                          </strong>
                          , +{residualMinutesAfterShiftEnd} min).
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
