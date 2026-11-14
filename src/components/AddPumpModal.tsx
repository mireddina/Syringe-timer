/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, X, AlertCircle, Play, Pause, Sparkles } from 'lucide-react';
import { DoseConfig, SyringeData } from '../types';
import { formatVolume, formatHoursToHms, parseVolume } from '../utils/calculations';
import { computeDoseFlow } from '../utils/dose';
import {
  DRUG_CATEGORIES,
  DRUG_PRESETS,
  DrugPreset,
  DrugUnit,
  findDrugPresetByName
} from '../data/drugPresets';

interface AddPumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextPumpNumber: number;
  onConfirmAdd: (newSyringe: SyringeData) => void;
}

const COLOR_OPTIONS: Array<{ id: string; label: string; dotClass: string }> = [
  { id: 'sky', label: 'Azzurro', dotClass: 'bg-sky-500' },
  { id: 'emerald', label: 'Verde', dotClass: 'bg-emerald-500' },
  { id: 'amber', label: 'Ambra', dotClass: 'bg-amber-500' },
  { id: 'violet', label: 'Viola', dotClass: 'bg-violet-500' },
  { id: 'rose', label: 'Rosa', dotClass: 'bg-rose-500' }
];

function toMcgFactor(unit: DrugUnit): number {
  switch (unit) {
    case 'g':
      return 1_000_000;
    case 'mg':
      return 1_000;
    case 'mcg':
      return 1;
    case 'ng':
      return 0.001;
    case 'UI':
    case 'mEq':
      return 1;
  }
}

export const AddPumpModal: React.FC<AddPumpModalProps> = ({
  isOpen,
  onClose,
  nextPumpNumber,
  onConfirmAdd
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [drugName, setDrugName] = useState<string>('');
  const [concentrationNote, setConcentrationNote] = useState<string>('');
  const [nominalInput, setNominalInput] = useState<string>('50');
  const [currentInput, setCurrentInput] = useState<string>('50');
  const [isCurrentSynced, setIsCurrentSynced] = useState<boolean>(true);
  const [rateInput, setRateInput] = useState<string>('2');
  const [color, setColor] = useState<string>('emerald');
  const [alertMinutesBefore, setAlertMinutesBefore] = useState<number>(15);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Optional inline dose helper when a preset is selected
  const [presetWeightKg, setPresetWeightKg] = useState<string>('70');
  const [presetDoseValue, setPresetDoseValue] = useState<string>('');

  // Reset form cleanly whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPresetId('');
      setDrugName('');
      setConcentrationNote('');
      setNominalInput('50');
      setCurrentInput('50');
      setIsCurrentSynced(true);
      setRateInput('2');
      setColor(COLOR_OPTIONS[(nextPumpNumber - 1) % COLOR_OPTIONS.length].id);
      setAlertMinutesBefore(15);
      setIsRunning(true);
      setPresetWeightKg('70');
      setPresetDoseValue('');
      setFormError(null);
    }
  }, [isOpen, nextPumpNumber]);

  if (!isOpen) return null;

  const activePreset = DRUG_PRESETS.find((p) => p.id === selectedPresetId) || null;
  const parsedNominal = parseVolume(nominalInput);
  const parsedCurrentRaw = parseFloat(currentInput.replace(',', '.'));
  const parsedRate = parseVolume(rateInput);

  const isCurrentValid =
    parsedNominal !== null &&
    !isNaN(parsedCurrentRaw) &&
    isFinite(parsedCurrentRaw) &&
    parsedCurrentRaw >= 0 &&
    parsedCurrentRaw <= parsedNominal;

  const previewDuration =
    parsedRate !== null && isCurrentValid
      ? formatHoursToHms(parsedCurrentRaw / parsedRate)
      : '--';

  const computeRateFromPresetDose = (
    preset: DrugPreset,
    doseStr: string,
    weightStr: string,
    nominalVol: number
  ) => {
    if (preset.flowMode === 'direct_ml_h') return;
    const doseNum = parseFloat(doseStr.replace(',', '.'));
    const weightNum = parseFloat(weightStr.replace(',', '.'));
    if (isNaN(doseNum) || doseNum <= 0) return;
    if (preset.useWeight && (isNaN(weightNum) || weightNum <= 0)) return;

    const totalBase = preset.syringeDrugAmount * toMcgFactor(preset.syringeDrugUnit);
    const concPerMl = totalBase / (nominalVol > 0 ? nominalVol : preset.nominalVolume);
    const weightMult = preset.useWeight ? weightNum : 1;
    const timeMult = preset.timeBase === 'min' ? 60 : 1;
    const rate = (doseNum * toMcgFactor(preset.doseUnit) * weightMult * timeMult) / concPerMl;
    const rounded = Math.round(rate * 100) / 100;
    if (rounded > 0 && isFinite(rounded)) {
      setRateInput(formatVolume(rounded));
    }
  };

  const applyPreset = (preset: DrugPreset) => {
    setSelectedPresetId(preset.id);
    setDrugName(preset.name);
    setConcentrationNote(`${preset.preparation} · ${preset.concentrationLabel}`);
    setNominalInput(preset.nominalVolume.toString());
    if (isCurrentSynced) {
      setCurrentInput(preset.nominalVolume.toString());
    } else if (!isNaN(parsedCurrentRaw) && parsedCurrentRaw > preset.nominalVolume) {
      setCurrentInput(preset.nominalVolume.toString());
    }
    setColor(preset.suggestedColor);
    setPresetDoseValue(preset.defaultDose.toString());
    setFormError(null);

    if (preset.flowMode === 'direct_ml_h') {
      setRateInput(preset.defaultRateMlH.toString());
    } else {
      computeRateFromPresetDose(
        preset,
        preset.defaultDose.toString(),
        presetWeightKg,
        preset.nominalVolume
      );
    }
  };

  const handlePresetSelectChange = (id: string) => {
    if (!id) {
      setSelectedPresetId('');
      setConcentrationNote('');
      setPresetDoseValue('');
      return;
    }
    const found = DRUG_PRESETS.find((p) => p.id === id);
    if (found) {
      applyPreset(found);
    }
  };

  const handleDrugNameChange = (val: string) => {
    setDrugName(val);
    setFormError(null);
    const matched = findDrugPresetByName(val);
    if (matched && matched.name.toLowerCase() === val.trim().toLowerCase()) {
      applyPreset(matched);
    }
  };

  const handleNominalChange = (val: string) => {
    setNominalInput(val);
    setFormError(null);
    const parsed = parseVolume(val);
    if (parsed !== null) {
      if (isCurrentSynced) {
        setCurrentInput(formatVolume(parsed));
      } else if (!isNaN(parsedCurrentRaw) && parsedCurrentRaw > parsed) {
        setCurrentInput(formatVolume(parsed));
      }
      if (activePreset && presetDoseValue) {
        computeRateFromPresetDose(activePreset, presetDoseValue, presetWeightKg, parsed);
      }
    }
  };

  const handleQuickNominal = (vol: number) => {
    handleNominalChange(vol.toString());
  };

  const handleCurrentChange = (val: string) => {
    setCurrentInput(val);
    setFormError(null);
    const parsed = parseFloat(val.replace(',', '.'));
    if (parsedNominal !== null && !isNaN(parsed)) {
      setIsCurrentSynced(Math.abs(parsed - parsedNominal) < 0.001);
    } else {
      setIsCurrentSynced(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDrug = drugName.trim();
    if (!cleanDrug) {
      setFormError('Inserisci il nome del farmaco in infusione.');
      return;
    }
    if (parsedNominal === null || parsedNominal <= 0) {
      setFormError('Inserisci un volume nominale valido maggiore di 0 ml.');
      return;
    }
    if (!isCurrentValid) {
      setFormError(
        `Il volume residuo deve essere compreso tra 0 e ${formatVolume(parsedNominal)} ml.`
      );
      return;
    }
    if (parsedRate === null || parsedRate <= 0) {
      setFormError('Inserisci una velocità di infusione valida maggiore di 0 ml/h.');
      return;
    }

    let doseConfig: DoseConfig | undefined;
    if (activePreset) {
      const parsedWeight = parseFloat(presetWeightKg.replace(',', '.'));
      doseConfig = {
        syringeDrugAmount: activePreset.syringeDrugAmount,
        syringeDrugUnit: activePreset.syringeDrugUnit,
        syringeVolumeMl:
          activePreset.flowMode === 'direct_ml_h' ? activePreset.nominalVolume : parsedNominal,
        doseUnit: activePreset.doseUnit,
        useWeight: activePreset.useWeight,
        patientWeightKg: !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : 70,
        timeBase: activePreset.timeBase,
        flowMode: activePreset.flowMode
      };
    }

    const newSyringe: SyringeData = {
      id: `syr-${Date.now()}`,
      name: `Pompa ${nextPumpNumber}`,
      drugName: cleanDrug,
      nominalVolume: parsedNominal,
      currentVolume: parsedCurrentRaw,
      infusionRate: parsedRate,
      concentration: concentrationNote || undefined,
      doseConfig,
      color,
      isRunning,
      alertMinutesBefore,
      soundEnabled: true
    };

    onConfirmAdd(newSyringe);
    onClose();
  };

  const presetFlowLabel = activePreset
    ? activePreset.flowMode === 'direct_ml_h'
      ? 'ml/h'
      : `${activePreset.doseUnit}${activePreset.useWeight ? '/kg' : ''}/${activePreset.timeBase === 'min' ? 'min' : 'ora'}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
              Nuova Pompa #{nextPumpNumber} · Dati Infusione
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
          {/* Drug Preset Picker */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-pump-preset"
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Preset Farmaco (opzionale)</span>
            </label>
            <select
              id="new-pump-preset"
              value={selectedPresetId}
              onChange={(e) => handlePresetSelectChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Inserimento manuale (nessun preset)</option>
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
          </div>

          {/* Drug Name */}
          <div className="space-y-1">
            <label
              htmlFor="new-pump-drug"
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 block"
            >
              Nome Farmaco
            </label>
            <input
              id="new-pump-drug"
              type="text"
              list="drug-presets-datalist"
              autoFocus
              value={drugName}
              onChange={(e) => handleDrugNameChange(e.target.value)}
              placeholder="Es. Noradrenalina, Propofol, Remifentanil..."
              className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="drug-presets-datalist">
              {DRUG_PRESETS.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          {/* Preset Reference & Quick Dose-to-Rate Calculator */}
          {activePreset && (
            <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-1 text-blue-950 dark:text-blue-100">
                <span className="font-semibold">
                  {activePreset.preparation} · {activePreset.concentrationLabel}
                </span>
                <span className="font-mono text-[11px] text-blue-700 dark:text-blue-300">
                  {activePreset.dosageRangeText}
                </span>
              </div>

              {activePreset.flowMode === 'dose' && (
                <div className={`grid gap-2 ${activePreset.useWeight ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {activePreset.useWeight && (
                    <div>
                      <label className="text-[11px] text-blue-800 dark:text-blue-300 block">
                        Peso paziente (kg):
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        value={presetWeightKg}
                        onChange={(e) => {
                          setPresetWeightKg(e.target.value);
                          if (parsedNominal) {
                            computeRateFromPresetDose(
                              activePreset,
                              presetDoseValue,
                              e.target.value,
                              parsedNominal
                            );
                          }
                        }}
                        className="w-full mt-0.5 px-2.5 py-1 text-xs font-mono font-bold rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] text-blue-800 dark:text-blue-300 block">
                      Dose ({presetFlowLabel}):
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={presetDoseValue}
                      onChange={(e) => {
                        setPresetDoseValue(e.target.value);
                        if (parsedNominal) {
                          computeRateFromPresetDose(
                            activePreset,
                            e.target.value,
                            presetWeightKg,
                            parsedNominal
                          );
                        }
                      }}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs font-mono font-bold rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nominal Syringe Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="new-pump-nominal"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Volume Nominale Siringa (ml)
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                Libero o tasti rapidi
              </span>
            </div>

            <div className="relative">
              <input
                id="new-pump-nominal"
                type="number"
                step="any"
                min="0.1"
                value={nominalInput}
                onChange={(e) => handleNominalChange(e.target.value)}
                placeholder="Es. 50, 40, 30, 20, 12.5..."
                className="w-full px-3 pr-10 py-1.5 text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                ml
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[20, 30, 40, 50].map((vol) => {
                const isActive = parsedNominal !== null && Math.abs(parsedNominal - vol) < 0.001;
                return (
                  <button
                    key={vol}
                    type="button"
                    onClick={() => handleQuickNominal(vol)}
                    className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-colors ${
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {vol} ml
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Residual Volume & Infusion Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="new-pump-current"
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Volume Residuo (ml)
                </label>
                {parsedNominal !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentInput(formatVolume(parsedNominal));
                      setIsCurrentSynced(true);
                    }}
                    className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Piena ({formatVolume(parsedNominal)})
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="new-pump-current"
                  type="number"
                  step="any"
                  min="0"
                  max={parsedNominal ?? undefined}
                  value={currentInput}
                  onChange={(e) => handleCurrentChange(e.target.value)}
                  className="w-full px-3 pr-9 py-1.5 text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                  ml
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="new-pump-rate"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 block"
              >
                Velocità Infusione (ml/h)
              </label>
              <div className="relative">
                <input
                  id="new-pump-rate"
                  type="number"
                  step="any"
                  min="0.01"
                  value={rateInput}
                  onChange={(e) => {
                    setRateInput(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full px-3 pr-11 py-1.5 text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                  ml/h
                </span>
              </div>
              {(() => {
                if (!activePreset || parsedRate === null || parsedNominal === null) return null;
                const parsedWeight = parseFloat(presetWeightKg.replace(',', '.'));
                const previewDose = computeDoseFlow({
                  id: 'preview',
                  name: 'Preview',
                  drugName: drugName || activePreset.name,
                  nominalVolume: parsedNominal,
                  currentVolume: parsedNominal,
                  infusionRate: parsedRate,
                  doseConfig: {
                    syringeDrugAmount: activePreset.syringeDrugAmount,
                    syringeDrugUnit: activePreset.syringeDrugUnit,
                    syringeVolumeMl:
                      activePreset.flowMode === 'direct_ml_h'
                        ? activePreset.nominalVolume
                        : parsedNominal,
                    doseUnit: activePreset.doseUnit,
                    useWeight: activePreset.useWeight,
                    patientWeightKg: !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : 70,
                    timeBase: activePreset.timeBase,
                    flowMode: activePreset.flowMode
                  },
                  color,
                  isRunning: true,
                  alertMinutesBefore: 15,
                  soundEnabled: true
                });
                if (!previewDose) return null;
                return (
                  <p className="text-[11px] font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400 pt-0.5">
                    Flusso/Dose: {previewDose.formatted}
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Quick Rate Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400">Velocità rapide:</span>
            {[1, 2, 4, 6, 8].map((r) => {
              const isActivePreset = parsedRate !== null && Math.abs(parsedRate - r) < 0.001;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRateInput(r.toString())}
                  className={`px-2.5 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                    isActivePreset
                      ? 'border-blue-600 bg-blue-600 text-white font-semibold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Color, Pre-alarm & Initial Running State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                Colore identificativo
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.label}
                    aria-label={opt.label}
                    onClick={() => setColor(opt.id)}
                    className={`w-6 h-6 rounded-full ${opt.dotClass} transition-transform ${
                      color === opt.id
                        ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="new-pump-prealarm"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 block"
              >
                Pre-allarme esaurimento
              </label>
              <select
                id="new-pump-prealarm"
                value={alertMinutesBefore}
                onChange={(e) => setAlertMinutesBefore(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value={5}>5 minuti prima</option>
                <option value={10}>10 minuti prima</option>
                <option value={15}>15 minuti prima</option>
                <option value={20}>20 minuti prima</option>
                <option value={30}>30 minuti prima</option>
                <option value={0}>Disattivato</option>
              </select>
            </div>
          </div>

          {/* Start State + Live Duration Preview */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase block">
                Durata stimata iniziale
              </span>
              <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                {previewDuration}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                isRunning
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Avvia subito</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Aggiungi in pausa</span>
                </>
              )}
            </button>
          </div>

          {/* Validation Error */}
          {formError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
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
            type="submit"
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Aggiungi Pompa
          </button>
        </div>
      </form>
    </div>
  );
};
