/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SyringeData, SyringeCalculations, ReplacementEvent } from '../types';

/**
 * Validates a syringe volume input.
 * Accepts numbers > 0, including decimals.
 */
export function isValidVolume(value: number | string): boolean {
  if (value === '' || value === null || value === undefined) return false;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  return !isNaN(num) && isFinite(num) && num > 0;
}

/**
 * Parses a volume string or number safely into a positive float.
 * Returns null if invalid or <= 0.
 */
export function parseVolume(value: string | number): number | null {
  if (typeof value === 'number') {
    return value > 0 && isFinite(value) ? value : null;
  }
  const cleanStr = value.trim().replace(',', '.');
  const parsed = parseFloat(cleanStr);
  if (isNaN(parsed) || !isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

/**
 * Format duration into hours, minutes and seconds
 */
export function formatHoursToHms(hoursDecimal: number): string {
  if (isNaN(hoursDecimal) || hoursDecimal <= 0 || !isFinite(hoursDecimal)) {
    return '00h 00m 00s';
  }
  const totalSeconds = Math.round(hoursDecimal * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Format clock time (HH:mm)
 */
export function formatClockTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatClockTimeWithSeconds(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Formats a volume number cleanly, showing up to 2 decimals if present,
 * omitting decimals if it is an integer.
 */
export function formatVolume(vol: number): string {
  if (isNaN(vol)) return '0';
  const rounded = Math.round(vol * 100) / 100;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
}

/**
 * Calculate all parameters for a syringe given the current time and shift end time.
 */
export function computeSyringeCalculations(
  syringe: SyringeData,
  now: Date,
  shiftEndDate: Date
): SyringeCalculations {
  const { nominalVolume, currentVolume, infusionRate, alertMinutesBefore } = syringe;

  // Safeguards
  const safeNominal = nominalVolume > 0 ? nominalVolume : 50;
  const safeCurrent = Math.max(0, Math.min(safeNominal, currentVolume));
  const safeRate = infusionRate > 0 ? infusionRate : 1;

  // Duration for current remaining volume
  const durationHours = safeCurrent / safeRate;
  const formattedDuration = formatHoursToHms(durationHours);

  // Estimated empty timestamp
  const emptyTimestamp = now.getTime() + durationHours * 3600 * 1000;
  const estimatedEmptyTime = safeCurrent > 0 ? new Date(emptyTimestamp) : now;
  const isFinished = safeCurrent <= 0.001;

  // Percent remaining
  const percentRemaining = Math.max(0, Math.min(100, (safeCurrent / safeNominal) * 100));

  // Shift calculations
  const nowMs = now.getTime();
  const shiftEndMs = shiftEndDate.getTime();
  const msUntilShiftEnd = Math.max(0, shiftEndMs - nowMs);
  const hoursUntilShiftEnd = msUntilShiftEnd / (3600 * 1000);

  // Total volume required to sustain rate until end of shift
  const totalVolumeNeededForShift = safeRate * hoursUntilShiftEnd;

  let coversFullShift = false;
  let syringesNeededForShift = 0;
  const replacements: ReplacementEvent[] = [];
  let residualVolumeAtShiftEnd = 0;

  if (safeCurrent >= totalVolumeNeededForShift) {
    // Current syringe is enough to cover the rest of the shift
    coversFullShift = true;
    syringesNeededForShift = 0;
    residualVolumeAtShiftEnd = safeCurrent - totalVolumeNeededForShift;
  } else {
    // Current syringe will finish before shift ends
    coversFullShift = false;
    const missingVolume = totalVolumeNeededForShift - safeCurrent;

    // Number of new syringes needed (EACH using custom nominalVolume)
    syringesNeededForShift = Math.ceil(missingVolume / safeNominal);

    // Calculate when each replacement is scheduled
    let cumulativeVolumeProvided = safeCurrent;
    let nextEmptyTimeMs = emptyTimestamp;

    for (let i = 1; i <= syringesNeededForShift; i++) {
      if (nextEmptyTimeMs < shiftEndMs) {
        const replacementDate = new Date(nextEmptyTimeMs);
        const minutesFromNow = Math.max(0, Math.round((nextEmptyTimeMs - nowMs) / 60000));
        replacements.push({
          index: i,
          time: replacementDate,
          volumeAdded: safeNominal,
          formattedTime: formatClockTime(replacementDate),
          minutesFromNow
        });
      }

      // Next syringe lasts nominalVolume / rate
      const nextDurationMs = (safeNominal / safeRate) * 3600 * 1000;
      nextEmptyTimeMs += nextDurationMs;
      cumulativeVolumeProvided += safeNominal;
    }

    // Residual in the last active syringe at shift end
    residualVolumeAtShiftEnd = Math.max(0, cumulativeVolumeProvided - totalVolumeNeededForShift);
  }

  // Residual duration after shift end
  const residualHoursAfterShiftEnd = residualVolumeAtShiftEnd / safeRate;
  const residualMinutesAfterShiftEnd = Math.max(0, Math.round(residualHoursAfterShiftEnd * 60));
  const syringeEndsAtAfterShift = new Date(
    shiftEndMs + residualHoursAfterShiftEnd * 3600 * 1000
  );
  const advisePrepareForColleague = residualHoursAfterShiftEnd <= 1 + 1e-6;

  // Pre-alarm check (e.g. 15 minutes before empty), unless dismissed by user
  const minutesUntilEmpty = durationHours * 60;
  const isDismissed = Boolean(syringe.alarmDismissed);
  const isPreAlarmActive =
    !isDismissed &&
    !isFinished &&
    alertMinutesBefore > 0 &&
    minutesUntilEmpty <= alertMinutesBefore &&
    minutesUntilEmpty > 0;

  const isUrgentAlarmActive = !isDismissed && (isFinished || minutesUntilEmpty <= 2);

  return {
    durationHours,
    formattedDuration,
    estimatedEmptyTime,
    percentRemaining,
    isFinished,
    shiftEnd: shiftEndDate,
    hoursUntilShiftEnd,
    totalVolumeNeededForShift,
    syringesNeededForShift,
    replacements,
    residualVolumeAtShiftEnd,
    residualMinutesAfterShiftEnd,
    syringeEndsAtAfterShift,
    advisePrepareForColleague,
    coversFullShift,
    isPreAlarmActive,
    isUrgentAlarmActive
  };
}

/**
 * Generate intelligent tick marks for any custom nominal volume.
 * For example:
 * - 50 ml: ticks every 5 or 10 ml
 * - 20 ml: ticks every 2 or 5 ml
 * - 30 ml: ticks every 5 ml
 * - 40 ml: ticks every 5 or 10 ml
 * - 12.5 ml: ticks every 2.5 ml
 * - 35 ml: ticks every 5 ml
 */
export function getSyringeGraduationTicks(nominalVolume: number): {
  majorTicks: number[];
  minorTicks: number[];
} {
  const vol = Math.max(1, nominalVolume);

  let majorStep = 10;
  let minorStep = 2;

  if (vol <= 5) {
    majorStep = 1;
    minorStep = 0.2;
  } else if (vol <= 10) {
    majorStep = 2;
    minorStep = 0.5;
  } else if (vol <= 25) {
    majorStep = 5;
    minorStep = 1;
  } else if (vol <= 60) {
    majorStep = 10;
    minorStep = 2;
    if (vol % 5 === 0 && vol < 40) {
      majorStep = 5;
      minorStep = 1;
    }
  } else if (vol <= 100) {
    majorStep = 20;
    minorStep = 5;
  } else {
    majorStep = Math.pow(10, Math.floor(Math.log10(vol)));
    minorStep = majorStep / 5;
  }

  const majorTicks: number[] = [];
  const minorTicks: number[] = [];

  // Always include 0
  majorTicks.push(0);

  // Generate minor ticks
  for (let t = minorStep; t < vol; t += minorStep) {
    const rounded = Math.round(t * 1000) / 1000;
    minorTicks.push(rounded);
  }

  // Generate major ticks
  for (let t = majorStep; t < vol; t += majorStep) {
    const rounded = Math.round(t * 1000) / 1000;
    if (!majorTicks.includes(rounded)) {
      majorTicks.push(rounded);
    }
  }

  // Always include the custom nominal max
  if (!majorTicks.includes(vol)) {
    majorTicks.push(vol);
  }

  majorTicks.sort((a, b) => a - b);
  minorTicks.sort((a, b) => a - b);

  return { majorTicks, minorTicks };
}
