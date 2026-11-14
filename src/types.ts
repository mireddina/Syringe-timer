/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DoseUnit = 'g' | 'mg' | 'mcg' | 'ng' | 'UI' | 'mEq';
export type DoseTimeBase = 'min' | 'hour';

export interface DoseConfig {
  syringeDrugAmount: number;
  syringeDrugUnit: DoseUnit;
  syringeVolumeMl: number;
  doseUnit: DoseUnit;
  useWeight: boolean;
  patientWeightKg: number;
  timeBase: DoseTimeBase;
  flowMode?: 'dose' | 'direct_ml_h';
}

export interface SyringeData {
  id: string;
  name: string;
  drugName: string;
  nominalVolume: number; // in ml, freely digitised, > 0, supports decimals (e.g. 50, 40, 30, 20, 35, 12.5)
  currentVolume: number; // in ml, remaining volume (0 <= currentVolume <= nominalVolume)
  infusionRate: number;  // in ml/h (> 0, e.g. 2.5)
  concentration?: string; // e.g. "4 mg/50 ml" or "2 mg/ml"
  doseConfig?: DoseConfig;
  color: string; // color of the fluid (e.g. emerald, amber, sky, violet)
  isRunning: boolean;
  alertMinutesBefore: number; // e.g. 15 min pre-alarm
  soundEnabled: boolean;
  alarmDismissed?: boolean; // true when user dismissed/cancelled current active alarm on this pump
  notes?: string;
  lastTickTimestamp?: number;
}

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'custom';

export interface ShiftInfo {
  type: ShiftType;
  label: string;
  defaultEndHour: number;
  defaultEndMinute: number;
  timeRangeLabel: string;
}

export interface ReplacementEvent {
  index: number;
  time: Date;
  volumeAdded: number; // uses custom nominal volume
  formattedTime: string;
  minutesFromNow: number;
}

export interface SyringeCalculations {
  durationHours: number;
  formattedDuration: string;
  estimatedEmptyTime: Date | null;
  percentRemaining: number;
  isFinished: boolean;
  // Shift related calculations
  shiftEnd: Date | null;
  hoursUntilShiftEnd: number;
  totalVolumeNeededForShift: number;
  syringesNeededForShift: number; // number of replacements required
  replacements: ReplacementEvent[];
  residualVolumeAtShiftEnd: number; // remaining in last syringe at handover
  residualMinutesAfterShiftEnd: number; // minutes remaining after shift end
  syringeEndsAtAfterShift: Date | null; // estimated empty time of active syringe after shift end
  advisePrepareForColleague: boolean; // true if syringe runs out within 1h from shift end
  coversFullShift: boolean;
  isPreAlarmActive: boolean;
  isUrgentAlarmActive: boolean;
}
