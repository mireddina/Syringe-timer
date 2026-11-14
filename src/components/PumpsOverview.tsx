/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  ArrowRight,
  Clock,
  AlertTriangle,
  UserCheck,
  ListChecks,
  Syringe,
  Bell,
  BellOff
} from 'lucide-react';
import { SyringeData } from '../types';
import {
  computeSyringeCalculations,
  formatVolume,
  formatClockTime
} from '../utils/calculations';
import { computeDoseFlow } from '../utils/dose';
import { getPumpColorStyle } from '../utils/pumpColors';

interface PumpsOverviewProps {
  syringes: SyringeData[];
  activeSyringeId: string;
  currentTime: Date;
  shiftEndDate: Date;
  onSelectPump: (id: string) => void;
  onToggleRunning: (id: string) => void;
  onRefillPump: (id: string) => void;
  onAddPump: () => void;
  onDeletePump: (id: string) => void;
  onClearAllPumps: () => void;
  onLoadSamplePumps?: () => void;
  onTogglePumpAlarm: (id: string) => void;
}

export const PumpsOverview: React.FC<PumpsOverviewProps> = ({
  syringes,
  activeSyringeId,
  currentTime,
  shiftEndDate,
  onSelectPump,
  onToggleRunning,
  onRefillPump,
  onAddPump,
  onDeletePump,
  onClearAllPumps,
  onLoadSamplePumps,
  onTogglePumpAlarm
}) => {
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const rows = syringes.map((syr, idx) => ({
    index: idx + 1,
    syringe: syr,
    calcs: computeSyringeCalculations(syr, currentTime, shiftEndDate)
  }));

  const runningCount = rows.filter((r) => r.syringe.isRunning && !r.calcs.isFinished).length;
  const colleagueAdviceCount = rows.filter((r) => r.calcs.advisePrepareForColleague).length;

  // Find earliest upcoming empty pump among non-finished running pumps (or any non-finished)
  const nextExpiring = rows
    .filter((r) => !r.calcs.isFinished && r.calcs.estimatedEmptyTime !== null)
    .sort((a, b) => a.calcs.durationHours - b.calcs.durationHours)[0];

  return (
    <div className="space-y-4">
      {/* Header & Aggregate Metrics */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                Elenco Pompe
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>{rows.length} {rows.length === 1 ? 'pompa' : 'pompe'} configurate</span>
              <span aria-hidden="true">·</span>
              <span>{runningCount} in esecuzione</span>
              <span aria-hidden="true">·</span>
              <span>Fine turno ore {formatClockTime(shiftEndDate)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {rows.length > 0 && !confirmClearAll && (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                title="Cancella tutte le pompe e riparti da 0"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-900/70 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancella tutte</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAddPump}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Pompa</span>
            </button>
          </div>
        </div>

        {confirmClearAll && rows.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-xs font-medium text-rose-900 dark:text-rose-200">
              Cancellare tutte le {rows.length} {rows.length === 1 ? 'pompa' : 'pompe'} e ripartire da 0?
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmClearAll(false);
                  onClearAllPumps();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Sì, cancella tutte
              </button>
            </div>
          </div>
        )}

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Prossimo Esaurimento
            </span>
            {nextExpiring ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${getPumpColorStyle(nextExpiring.syringe.color).swatchClass}`}
                  />
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    #{nextExpiring.index} {nextExpiring.syringe.drugName || 'Farmaco'}
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 shrink-0">
                  ore {nextExpiring.calcs.estimatedEmptyTime ? formatClockTime(nextExpiring.calcs.estimatedEmptyTime) : '--:--'}
                </span>
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-400 mt-1 block">
                Nessuna infusione attiva
              </span>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Da Preparare per Collega
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-lg font-bold font-mono ${
                  colleagueAdviceCount > 0
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {colleagueAdviceCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {colleagueAdviceCount === 0
                  ? 'nessuna scadenza entro 1h'
                  : colleagueAdviceCount === 1
                  ? 'pompa termina entro 1h'
                  : 'pompe terminano entro 1h'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pumps List or Empty State */}
      {rows.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-center mx-auto">
            <Syringe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Nessuna pompa impostata
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Elenco vuoto per inizio turno. Aggiungi la prima pompa siringa per avviare il monitoraggio e il calcolo dei ricambi.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onAddPump}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Prima Pompa</span>
            </button>
            {onLoadSamplePumps && (
              <button
                type="button"
                onClick={onLoadSamplePumps}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Carica esempio
              </button>
            )}
          </div>
        </div>
      ) : (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {rows.map(({ index, syringe, calcs }) => {
          const isSelected = syringe.id === activeSyringeId;
          const statusText = calcs.isFinished
            ? 'Esaurita'
            : syringe.isRunning
            ? calcs.isPreAlarmActive
              ? 'In esecuzione · Pre-allarme'
              : 'In esecuzione'
            : 'In pausa';

          const statusColorClass = calcs.isFinished
            ? 'text-rose-600 dark:text-rose-400'
            : !syringe.isRunning
            ? 'text-amber-600 dark:text-amber-400'
            : calcs.isPreAlarmActive
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-emerald-600 dark:text-emerald-400';

          const barColorClass = calcs.isFinished
            ? 'bg-rose-500'
            : calcs.isPreAlarmActive || calcs.percentRemaining <= 20
            ? 'bg-amber-500'
            : 'bg-blue-600 dark:bg-blue-500';

          const colorStyle = getPumpColorStyle(syringe.color);
          const isAlarmActive =
            !syringe.alarmDismissed &&
            (calcs.isPreAlarmActive || calcs.isUrgentAlarmActive);
          const isAlarmSilenced =
            !syringe.soundEnabled || Boolean(syringe.alarmDismissed);

          return (
            <div
              key={syringe.id}
              className={`p-4 transition-colors ${colorStyle.borderLeftClass} ${
                isSelected
                  ? 'bg-blue-50/40 dark:bg-blue-950/20'
                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Identity, Status & Progress Bar */}
                <div className="space-y-2 min-w-0 lg:w-72 shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectPump(syringe.id)}
                      className="text-left group min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`w-3 h-3 rounded-[3px] shrink-0 ${colorStyle.swatchClass}`}
                        />
                        <span className="text-xs font-mono font-bold text-slate-400">
                          #{index}
                        </span>
                        <span
                          className={`text-sm font-bold px-2 py-0.5 rounded-md group-hover:brightness-95 transition-all truncate ${colorStyle.highlightClass}`}
                        >
                          {syringe.drugName || 'Farmaco'}
                        </span>
                      </div>
                      <div className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${statusColorClass}`}>
                        {calcs.isPreAlarmActive && !calcs.isFinished && (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{statusText}</span>
                      </div>
                    </button>
                  </div>

                  {/* Volume & Linear Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">
                        {formatVolume(syringe.currentVolume)} / {formatVolume(syringe.nominalVolume)} ml
                      </span>
                      <span className="text-slate-400">
                        {calcs.percentRemaining.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
                        style={{ width: `${calcs.percentRemaining}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Middle: Telemetry Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 text-xs">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase block">
                      Velocità
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">
                      {formatVolume(syringe.infusionRate)} ml/h
                    </span>
                    {(() => {
                      const doseFlow = computeDoseFlow(syringe);
                      if (!doseFlow) return null;
                      return (
                        <span className="text-[11px] font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400 block">
                          {doseFlow.formatted}
                        </span>
                      );
                    })()}
                  </div>

                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase block">
                      Durata Residua
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5 block">
                      {calcs.formattedDuration}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase block">
                      Fine Siringa
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {calcs.estimatedEmptyTime ? formatClockTime(calcs.estimatedEmptyTime) : '--:--'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase block">
                      Ricambi Turno
                    </span>
                    <span
                      className={`font-mono font-bold text-sm mt-0.5 block ${
                        calcs.coversFullShift
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {calcs.coversFullShift
                        ? '0 (copre turno)'
                        : `${calcs.syringesNeededForShift} da ${formatVolume(syringe.nominalVolume)} ml`}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                      Residuo: {formatVolume(calcs.residualVolumeAtShiftEnd)} ml
                    </span>
                  </div>
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 lg:pt-0">
                  <motion.button
                    type="button"
                    onClick={() => onToggleRunning(syringe.id)}
                    whileTap={{ scale: 0.96 }}
                    className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 whitespace-nowrap cursor-pointer ${
                      syringe.isRunning
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {syringe.isRunning ? (
                        <motion.span
                          key="run"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-1.5"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pausa</span>
                        </motion.span>
                      ) : (
                        <motion.span
                          key="pause"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Avvia</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => onRefillPump(syringe.id)}
                    title={`Ricarica a ${formatVolume(syringe.nominalVolume)} ml`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Ricarica</span>
                  </button>

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
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isAlarmActive
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold'
                        : isAlarmSilenced
                        ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isAlarmSilenced || isAlarmActive ? (
                      <BellOff className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Bell className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                    <span>
                      {isAlarmActive
                        ? 'Annulla allarme'
                        : isAlarmSilenced
                        ? 'Silenziato'
                        : 'Silenzia'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectPump(syringe.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-semibold text-blue-700 dark:text-blue-300 transition-colors whitespace-nowrap"
                  >
                    <span>Apri</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeletePump(syringe.id)}
                    title="Elimina pompa"
                    aria-label={`Elimina ${syringe.drugName}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Colleague advice inline line if syringe ends within 1h of shift end */}
              {calcs.advisePrepareForColleague && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <UserCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>
                    <strong>Consiglio fine turno:</strong> prepara 1 siringa da{' '}
                    <span className="font-mono font-semibold">{formatVolume(syringe.nominalVolume)} ml</span> per il collega (termina alle{' '}
                    <span className="font-mono font-semibold">
                      {calcs.syringeEndsAtAfterShift ? formatClockTime(calcs.syringeEndsAtAfterShift) : formatClockTime(shiftEndDate)}
                    </span>
                    , +{calcs.residualMinutesAfterShiftEnd} min dopo fine turno).
                  </span>
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
