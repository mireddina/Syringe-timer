/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DoseConfig, DoseUnit, SyringeData } from '../types';
import { findDrugPresetByName } from '../data/drugPresets';

export type UnitFamily = 'mass' | 'UI' | 'mEq';

export function getUnitFamily(unit: DoseUnit): UnitFamily {
  if (unit === 'UI') return 'UI';
  if (unit === 'mEq') return 'mEq';
  return 'mass';
}

export function toBaseFactor(unit: DoseUnit): number {
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

export function formatDoseNumber(value: number): string {
  if (!isFinite(value) || isNaN(value) || value <= 0) return '0';
  const decimals = value < 0.1 ? 3 : value < 10 ? 2 : 1;
  return parseFloat(value.toFixed(decimals)).toString();
}

export function resolveSyringeDoseConfig(syringe: SyringeData): DoseConfig | null {
  if (
    syringe.doseConfig &&
    syringe.doseConfig.syringeDrugAmount > 0 &&
    syringe.doseConfig.syringeVolumeMl > 0
  ) {
    return syringe.doseConfig;
  }

  const preset = findDrugPresetByName(syringe.drugName);
  if (!preset) return null;

  return {
    syringeDrugAmount: preset.syringeDrugAmount,
    syringeDrugUnit: preset.syringeDrugUnit,
    syringeVolumeMl: preset.nominalVolume > 0 ? preset.nominalVolume : 50,
    doseUnit: preset.doseUnit,
    useWeight: preset.useWeight,
    patientWeightKg: 70,
    timeBase: preset.timeBase,
    flowMode: preset.flowMode
  };
}

export interface ComputedDoseFlow {
  value: number;
  unitLabel: string;
  formatted: string;
  useWeight: boolean;
  weightKg: number;
  isDefaultWeight: boolean;
}

/**
 * Computes the current prescribed flow/dose corresponding to syringe.infusionRate (ml/h).
 */
export function computeDoseFlow(syringe: SyringeData): ComputedDoseFlow | null {
  if (!syringe || syringe.infusionRate <= 0) return null;

  const config = resolveSyringeDoseConfig(syringe);
  if (!config) return null;

  if (getUnitFamily(config.syringeDrugUnit) !== getUnitFamily(config.doseUnit)) {
    return null;
  }

  if (config.useWeight && (!config.patientWeightKg || config.patientWeightKg <= 0)) {
    return null;
  }

  const totalBaseInSyringe = config.syringeDrugAmount * toBaseFactor(config.syringeDrugUnit);
  const concentrationPerMl = totalBaseInSyringe / config.syringeVolumeMl;
  if (!isFinite(concentrationPerMl) || concentrationPerMl <= 0) return null;

  const weightMultiplier = config.useWeight ? config.patientWeightKg : 1;
  const timeMultiplier = config.timeBase === 'min' ? 60 : 1;

  const doseBasePerHour = syringe.infusionRate * concentrationPerMl;
  const doseValue =
    doseBasePerHour / (toBaseFactor(config.doseUnit) * weightMultiplier * timeMultiplier);

  if (!isFinite(doseValue) || doseValue <= 0) return null;

  const timeLabel = config.timeBase === 'min' ? 'min' : 'ora';
  const unitLabel = `${config.doseUnit}${config.useWeight ? '/kg' : ''}/${timeLabel}`;

  return {
    value: doseValue,
    unitLabel,
    formatted: `${formatDoseNumber(doseValue)} ${unitLabel}`,
    useWeight: config.useWeight,
    weightKg: config.patientWeightKg,
    isDefaultWeight: !syringe.doseConfig && config.useWeight
  };
}
