/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Syringe, UserCheck, ShieldCheck } from 'lucide-react';
import { PatientProfile, SyringeData } from '../types';
import { computeSyringeCalculations, formatVolume } from '../utils/calculations';
import { getPumpColorStyle } from '../utils/pumpColors';

interface PatientPrepSummaryProps {
  syringes: SyringeData[];
  patients: PatientProfile[];
  selectedPatientId: string;
  currentTime: Date;
  shiftEndDate: Date;
  onOpenPumpDetail?: (id: string) => void;
}

interface DrugPrepGroup {
  key: string;
  drugName: string;
  nominalVolume: number;
  color: string;
  firstPumpId: string;
  pumpCount: number;
  shiftSyringesCount: number;
  colleagueSyringesCount: number;
}

interface PatientPrepBlock {
  patient: PatientProfile;
  drugs: DrugPrepGroup[];
  totalShiftSyringes: number;
  totalColleagueSyringes: number;
}

export const PatientPrepSummary: React.FC<PatientPrepSummaryProps> = ({
  syringes,
  patients,
  selectedPatientId,
  currentTime,
  shiftEndDate,
  onOpenPumpDetail
}) => {
  const defaultPatientId = patients[0]?.id ?? 'pat-1';
  const resolvePatientId = (syr: SyringeData): string => {
    if (syr.patientId && patients.some((p) => p.id === syr.patientId)) {
      return syr.patientId;
    }
    return defaultPatientId;
  };

  const targetPatients =
    selectedPatientId === 'all'
      ? patients
      : patients.filter((p) => p.id === selectedPatientId);

  const patientBlocks: PatientPrepBlock[] = targetPatients
    .map((patient) => {
      const patSyringes = syringes.filter((s) => resolvePatientId(s) === patient.id);
      const drugMap = new Map<string, DrugPrepGroup>();

      for (const syr of patSyringes) {
        const calcs = computeSyringeCalculations(syr, currentTime, shiftEndDate);
        const cleanName = (syr.drugName || 'Farmaco').trim();
        const key = `${cleanName.toLowerCase()}::${syr.nominalVolume}`;
        const existing = drugMap.get(key);
        if (existing) {
          existing.pumpCount += 1;
          existing.shiftSyringesCount += calcs.syringesNeededForShift;
          existing.colleagueSyringesCount += calcs.advisePrepareForColleague ? 1 : 0;
        } else {
          drugMap.set(key, {
            key,
            drugName: cleanName,
            nominalVolume: syr.nominalVolume,
            color: syr.color,
            firstPumpId: syr.id,
            pumpCount: 1,
            shiftSyringesCount: calcs.syringesNeededForShift,
            colleagueSyringesCount: calcs.advisePrepareForColleague ? 1 : 0
          });
        }
      }

      const drugs = Array.from(drugMap.values());
      const totalShiftSyringes = drugs.reduce((sum, d) => sum + d.shiftSyringesCount, 0);
      const totalColleagueSyringes = drugs.reduce(
        (sum, d) => sum + d.colleagueSyringesCount,
        0
      );

      return {
        patient,
        drugs,
        totalShiftSyringes,
        totalColleagueSyringes
      };
    })
    .filter((block) => selectedPatientId !== 'all' || block.drugs.length > 0);

  const grandTotalShift = patientBlocks.reduce((sum, b) => sum + b.totalShiftSyringes, 0);
  const grandTotalColleague = patientBlocks.reduce(
    (sum, b) => sum + b.totalColleagueSyringes,
    0
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Syringe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
            Siringhe da Preparare per Farmaco
          </h2>
        </div>

        {syringes.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
            <span>
              Nel turno:{' '}
              <strong
                className={
                  grandTotalShift > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
              >
                {grandTotalShift} {grandTotalShift === 1 ? 'siringa' : 'siringhe'}
              </strong>
            </span>
            {grandTotalColleague > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  +{grandTotalColleague} per collega
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      {syringes.length === 0 ? (
        <div className="p-5 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
          Nessun farmaco in infusione. Aggiungi almeno una pompa per vedere il totale siringhe da preparare.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {patientBlocks.map((block) => (
            <div key={block.patient.id} className="p-4 space-y-2.5">
              {/* Patient sub-header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {block.patient.label}
                </h3>
                {block.drugs.length > 0 && (
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Totale:{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {block.totalShiftSyringes}{' '}
                      {block.totalShiftSyringes === 1 ? 'siringa' : 'siringhe'}
                    </strong>
                    {block.totalColleagueSyringes > 0 && (
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {' '}
                        (+{block.totalColleagueSyringes} collega)
                      </span>
                    )}
                  </span>
                )}
              </div>

              {block.drugs.length === 0 ? (
                <p className="text-xs font-mono text-slate-400">
                  Nessuna pompa attiva per {block.patient.label}.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {block.drugs.map((drug) => {
                    const colorStyle = getPumpColorStyle(drug.color);
                    const needsAnyShift = drug.shiftSyringesCount > 0;
                    return (
                      <button
                        key={drug.key}
                        type="button"
                        onClick={() => onOpenPumpDetail?.(drug.firstPumpId)}
                        className={`text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors cursor-pointer space-y-1.5 ${colorStyle.borderLeftClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              aria-hidden="true"
                              className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${colorStyle.swatchClass}`}
                            />
                            <span
                              className={`text-xs font-bold px-1.5 py-0.5 rounded truncate ${colorStyle.highlightClass}`}
                            >
                              {drug.drugName}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0">
                            {formatVolume(drug.nominalVolume)} ml
                            {drug.pumpCount > 1 ? ` ×${drug.pumpCount}` : ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          {needsAnyShift ? (
                            <span className="text-sm font-bold font-mono tabular-nums text-amber-700 dark:text-amber-300">
                              {drug.shiftSyringesCount}{' '}
                              {drug.shiftSyringesCount === 1
                                ? 'siringa da preparare'
                                : 'siringhe da preparare'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>0 (copre il turno)</span>
                            </span>
                          )}
                        </div>

                        {drug.colleagueSyringesCount > 0 && (
                          <div className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            <UserCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              +{drug.colleagueSyringesCount}{' '}
                              {drug.colleagueSyringesCount === 1
                                ? 'siringa per collega'
                                : 'siringhe per collega'}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
