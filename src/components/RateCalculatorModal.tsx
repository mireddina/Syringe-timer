/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calculator, X, Check, AlertCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { formatVolume } from '../utils/calculations';
import { checkPresetRateLimit } from '../utils/dose';
import { DoseConfig } from '../types';
import {
  DRUG_CATEGORIES,
  DRUG_PRESETS,
  DrugPreset,
  DrugUnit,
  TimeBase,
  findDrugPresetByName
} from '../data/drugPresets';

interface RateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  nominalVolume: number;
  activeDrugName?: string;
  currentDoseConfig?: DoseConfig;
  onApplyRate: (rate: number, notes?: string, doseConfig?: DoseConfig) => void;
}

type UnitFamily = 'mass' | 'UI' | 'mEq';

const DRUG_UNITS: DrugUnit[] = ['mcg', 'mg', 'g', 'ng', 'UI', 'mEq'];

function getUnitFamily(unit: DrugUnit): UnitFamily {
  if (unit === 'UI') return 'UI';
  if (unit === 'mEq') return 'mEq';
  return 'mass';
}

function toBaseFactor(unit: DrugUnit): number {
  switch (unit) {
    case 'g':
      return 1_000_000; // mcg
    case 'mg':
      return 1_000; // mcg
    case 'mcg':
      return 1; // mcg
    case 'ng':
      return 0.001; // mcg
    case 'UI':
      return 1;
    case 'mEq':
      return 1;
  }
}

export const RateCalculatorModal: React.FC<RateCalculatorModalProps> = ({
  isOpen,
  onClose,
  nominalVolume,
  activeDrugName,
  currentDoseConfig,
  onApplyRate
}) => {
  const [calcMode, setCalcMode] = useState<'dose' | 'total_time'>('dose');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Syringe concentration parameters
  const [syringeDrugAmount, setSyringeDrugAmount] = useState<string>('10');
  const [syringeDrugUnit, setSyringeDrugUnit] = useState<DrugUnit>('mg');

  // Prescribed flow parameters
  const [doseValue, setDoseValue] = useState<string>('0.1');
  const [doseUnit, setDoseUnit] = useState<DrugUnit>('mcg');
  const [useWeight, setUseWeight] = useState<boolean>(true);
  const [patientWeightKg, setPatientWeightKg] = useState<string>('70');
  const [timeBase, setTimeBase] = useState<TimeBase>('min');

  // Direct ml/h preset value (e.g. Argipressina)
  const [directPresetRate, setDirectPresetRate] = useState<string>('1.5');

  // Mode 2: Total time
  const [desiredDurationHours, setDesiredDurationHours] = useState<string>('8');

  const applyPreset = (preset: DrugPreset) => {
    setSelectedPresetId(preset.id);
    setCalcMode('dose');
    setSyringeDrugAmount(preset.syringeDrugAmount.toString());
    setSyringeDrugUnit(preset.syringeDrugUnit);
    setDoseUnit(preset.doseUnit);
    setUseWeight(preset.useWeight);
    setTimeBase(preset.timeBase);
    setDoseValue(preset.defaultDose.toString());
    setDirectPresetRate(preset.defaultRateMlH.toString());
  };

  // Auto-detect matching preset or restore pump's saved doseConfig when modal opens
  useEffect(() => {
    if (isOpen) {
      const matched = findDrugPresetByName(activeDrugName);
      if (matched) {
        applyPreset(matched);
      } else {
        setSelectedPresetId('');
      }
      if (currentDoseConfig) {
        setSyringeDrugAmount(currentDoseConfig.syringeDrugAmount.toString());
        setSyringeDrugUnit(currentDoseConfig.syringeDrugUnit);
        setDoseUnit(currentDoseConfig.doseUnit);
        setUseWeight(currentDoseConfig.useWeight);
        setPatientWeightKg(currentDoseConfig.patientWeightKg.toString());
        setTimeBase(currentDoseConfig.timeBase);
      }
    }
  }, [isOpen, activeDrugName, currentDoseConfig]);

  if (!isOpen) return null;

  const safeNominal = nominalVolume > 0 ? nominalVolume : 50;
  const activePreset = DRUG_PRESETS.find((p) => p.id === selectedPresetId) || null;

  // Determine unit compatibility
  const syringeFamily = getUnitFamily(syringeDrugUnit);
  const doseFamily = getUnitFamily(doseUnit);
  const isUnitCompatible = syringeFamily === doseFamily;

  // Dynamic flow label (e.g. "mcg/kg/min", "mg/kg/ora", "UI/ora")
  const timeLabel = timeBase === 'min' ? 'min' : 'ora';
  const flowUnitLabel = `${doseUnit}${useWeight ? '/kg' : ''}/${timeLabel}`;

  // Calculations
  let computedRate: number | null = null;
  let formulaExplanation = '';

  if (calcMode === 'dose') {
    if (activePreset?.flowMode === 'direct_ml_h') {
      const directVal = parseFloat(directPresetRate.replace(',', '.'));
      if (!isNaN(directVal) && directVal > 0) {
        computedRate = directVal;
        formulaExplanation = `${activePreset.name}: flusso diretto in ml/h (${activePreset.dosageRangeText})`;
      }
    } else if (isUnitCompatible) {
      const syrAmt = parseFloat(syringeDrugAmount.replace(',', '.'));
      const doseAmt = parseFloat(doseValue.replace(',', '.'));
      const weight = parseFloat(patientWeightKg.replace(',', '.'));

      const validWeight = !useWeight || (!isNaN(weight) && weight > 0);
      if (!isNaN(syrAmt) && syrAmt > 0 && !isNaN(doseAmt) && doseAmt > 0 && validWeight) {
        const totalBaseInSyringe = syrAmt * toBaseFactor(syringeDrugUnit);
        const concentrationPerMl = totalBaseInSyringe / safeNominal;
        const weightMultiplier = useWeight ? weight : 1;
        const timeMultiplier = timeBase === 'min' ? 60 : 1;
        const doseBasePerHour = doseAmt * toBaseFactor(doseUnit) * weightMultiplier * timeMultiplier;

        computedRate = doseBasePerHour / concentrationPerMl;

        const weightPart = useWeight ? ` × ${weight} kg` : '';
        const timePart = timeBase === 'min' ? ' × 60 min' : '';
        formulaExplanation = `(${doseAmt} ${flowUnitLabel}${weightPart}${timePart}) ÷ (${syrAmt} ${syringeDrugUnit} / ${formatVolume(safeNominal)} ml)`;
      }
    }
  } else {
    const hours = parseFloat(desiredDurationHours.replace(',', '.'));
    if (!isNaN(hours) && hours > 0) {
      computedRate = safeNominal / hours;
      formulaExplanation = `${formatVolume(safeNominal)} ml ÷ ${hours} ore`;
    }
  }

  const handlePresetSelectChange = (id: string) => {
    if (!id) {
      setSelectedPresetId('');
      return;
    }
    const found = DRUG_PRESETS.find((p) => p.id === id);
    if (found) {
      applyPreset(found);
    }
  };

  const handleSyringeUnitChange = (newUnit: DrugUnit) => {
    setSyringeDrugUnit(newUnit);
    if (getUnitFamily(newUnit) !== getUnitFamily(doseUnit)) {
      setDoseUnit(newUnit);
    }
  };

  const handleDoseUnitChange = (newUnit: DrugUnit) => {
    setDoseUnit(newUnit);
  };

  const handleApply = () => {
    if (computedRate && computedRate > 0) {
      const rounded = Math.round(computedRate * 100) / 100;
      let appliedConfig: DoseConfig | undefined;

      if (calcMode === 'dose') {
        if (activePreset?.flowMode === 'direct_ml_h') {
          appliedConfig = {
            syringeDrugAmount: activePreset.syringeDrugAmount,
            syringeDrugUnit: activePreset.syringeDrugUnit,
            syringeVolumeMl: activePreset.nominalVolume,
            doseUnit: activePreset.doseUnit,
            useWeight: activePreset.useWeight,
            patientWeightKg: parseFloat(patientWeightKg.replace(',', '.')) || 70,
            timeBase: activePreset.timeBase,
            flowMode: 'direct_ml_h'
          };
        } else {
          const syrAmt = parseFloat(syringeDrugAmount.replace(',', '.'));
          const weight = parseFloat(patientWeightKg.replace(',', '.'));
          if (!isNaN(syrAmt) && syrAmt > 0 && (!useWeight || (!isNaN(weight) && weight > 0))) {
            appliedConfig = {
              syringeDrugAmount: syrAmt,
              syringeDrugUnit,
              syringeVolumeMl: safeNominal,
              doseUnit,
              useWeight,
              patientWeightKg: useWeight ? weight : 70,
              timeBase,
              flowMode: 'dose'
            };
          }
        }
      }

      onApplyRate(rounded, formulaExplanation, appliedConfig);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
              Velocità da Dose (ml/h)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Calcolo basato sulla siringa attiva da{' '}
            <strong className="text-blue-600 dark:text-blue-400 font-mono">
              {formatVolume(safeNominal)} ml
            </strong>
            .
          </div>

          {/* Primary Mode Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCalcMode('dose')}
              className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                calcMode === 'dose'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              Da Dose e Flusso
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('total_time')}
              className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                calcMode === 'total_time'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              Da Durata Totale (ore)
            </button>
          </div>

          {calcMode === 'dose' ? (
            <div className="space-y-4">
              {/* Drug Preset Selector */}
              <div className="space-y-1.5">
                <label
                  htmlFor="calc-drug-preset"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Preset Farmaco</span>
                </label>
                <select
                  id="calc-drug-preset"
                  value={selectedPresetId}
                  onChange={(e) => handlePresetSelectChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Personalizzato (inserimento manuale)</option>
                  {DRUG_CATEGORIES.map((cat) => (
                    <optgroup key={cat} label={cat.toUpperCase()}>
                      {DRUG_PRESETS.filter((p) => p.category === cat).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.concentrationLabel} ({p.dosageRangeText})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {activePreset && (
                  <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[11px] text-blue-950 dark:text-blue-100 space-y-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-1 font-semibold">
                      <span>{activePreset.name} · {activePreset.category}</span>
                      <span className="font-mono text-blue-700 dark:text-blue-300">
                        {activePreset.concentrationLabel}
                      </span>
                    </div>
                    <div className="text-blue-800 dark:text-blue-300 font-mono">
                      Prep: {activePreset.preparation} · Range: {activePreset.dosageRangeText}
                    </div>
                    {Math.abs(safeNominal - activePreset.nominalVolume) >= 0.01 && (
                      <div className="text-amber-700 dark:text-amber-300 pt-0.5">
                        Nota: il preset standard è su {activePreset.nominalVolume} ml, la tua siringa attiva è {formatVolume(safeNominal)} ml (verifica il totale farmaco qui sotto).
                      </div>
                    )}
                  </div>
                )}
              </div>

              {activePreset?.flowMode === 'direct_ml_h' ? (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Velocità diretta prescritta (ml/h) — Range: {activePreset.dosageRangeText}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={directPresetRate}
                      onChange={(e) => setDirectPresetRate(e.target.value)}
                      className="w-full px-3 pr-12 py-1.5 text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                      ml/h
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* 1. Farmaco in siringa */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      1. Farmaco totale diluito in siringa ({formatVolume(safeNominal)} ml)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={syringeDrugAmount}
                        onChange={(e) => setSyringeDrugAmount(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Es. 10"
                      />
                      <select
                        aria-label="Unità farmaco in siringa"
                        value={syringeDrugUnit}
                        onChange={(e) => handleSyringeUnitChange(e.target.value as DrugUnit)}
                        className="px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {DRUG_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. Personalizzazione Flusso */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        2. Unità del flusso prescritto
                      </span>
                      <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                        {flowUnitLabel}
                      </span>
                    </div>

                    {/* Unità di dose */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Unità dose:
                      </span>
                      <div className="grid grid-cols-6 gap-1.5">
                        {DRUG_UNITS.map((u) => {
                          const active = doseUnit === u;
                          return (
                            <button
                              key={u}
                              type="button"
                              onClick={() => handleDoseUnitChange(u)}
                              className={`py-1.5 text-xs font-mono font-semibold rounded-md border transition-colors ${
                                active
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              {u}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Peso & Base temporale */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Riferimento peso:
                        </span>
                        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setUseWeight(true)}
                            className={`py-1 text-xs font-medium rounded-md transition-colors ${
                              useWeight
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Con /kg
                          </button>
                          <button
                            type="button"
                            onClick={() => setUseWeight(false)}
                            className={`py-1 text-xs font-medium rounded-md transition-colors ${
                              !useWeight
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Senza /kg
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Base temporale:
                        </span>
                        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setTimeBase('min')}
                            className={`py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                              timeBase === 'min'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {useWeight ? '/kg/min' : '/min'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimeBase('hour')}
                            className={`py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                              timeBase === 'hour'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {useWeight ? '/kg/ora' : '/ora'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Warning if unit families do not match */}
                    {!isUnitCompatible && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p>
                            Unità incompatibili tra siringa (<strong>{syringeDrugUnit}</strong>) e dose (<strong>{doseUnit}</strong>).
                          </p>
                          <button
                            type="button"
                            onClick={() => setSyringeDrugUnit(doseUnit)}
                            className="underline font-semibold hover:text-rose-900 dark:hover:text-rose-100"
                          >
                            Imposta anche la siringa in {doseUnit}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Valori di Dose e Peso */}
                  <div className={`grid gap-3 pt-1 ${useWeight ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    {useWeight && (
                      <div>
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                          Peso Paziente (kg):
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={patientWeightKg}
                          onChange={(e) => setPatientWeightKg(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="70"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        Dose prescritta ({flowUnitLabel}):
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={doseValue}
                          onChange={(e) => setDoseValue(e.target.value)}
                          className="w-full px-3 pr-24 py-1.5 text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.1"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 pointer-events-none">
                          {flowUnitLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Durata desiderata per l'intera siringa da {formatVolume(safeNominal)} ml (ore):
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={desiredDurationHours}
                  onChange={(e) => setDesiredDurationHours(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="8"
                />
              </div>
            </div>
          )}

          {/* Result Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Velocità Risultante per la Pompa:
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {computedRate !== null ? formatVolume(computedRate) : '--'}
                </span>
                <span className="text-xs font-mono text-slate-500">ml/h</span>
              </div>
              {formulaExplanation && (
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 break-all">
                  {formulaExplanation}
                </p>
              )}
            </div>

            {(() => {
              const targetPreset = activePreset ?? findDrugPresetByName(activeDrugName);
              if (!targetPreset || !computedRate || computedRate <= 0) return null;
              const syrAmt = parseFloat(syringeDrugAmount.replace(',', '.'));
              const weight = parseFloat(patientWeightKg.replace(',', '.'));
              const rateWarning = checkPresetRateLimit(
                {
                  drugName: targetPreset.name,
                  nominalVolume: safeNominal,
                  infusionRate: computedRate,
                  doseConfig:
                    calcMode === 'dose' && targetPreset.flowMode !== 'direct_ml_h'
                      ? {
                          syringeDrugAmount:
                            !isNaN(syrAmt) && syrAmt > 0 ? syrAmt : targetPreset.syringeDrugAmount,
                          syringeDrugUnit,
                          syringeVolumeMl: safeNominal,
                          doseUnit,
                          useWeight,
                          patientWeightKg: !isNaN(weight) && weight > 0 ? weight : 70,
                          timeBase,
                          flowMode: 'dose'
                        }
                      : undefined
                },
                targetPreset
              );
              if (!rateWarning) return null;
              return (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 text-xs text-amber-900 dark:text-amber-200 font-medium"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{rateWarning.message}</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={!computedRate || computedRate <= 0}
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Applica alla Pompa
          </button>
        </div>
      </div>
    </div>
  );
};
