/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PumpColorStyle {
  id: string;
  label: string;
  swatchClass: string;
  borderLeftClass: string;
  highlightClass: string;
}

export const PUMP_COLOR_OPTIONS: PumpColorStyle[] = [
  {
    id: 'sky',
    label: 'Azzurro',
    swatchClass: 'bg-sky-500',
    borderLeftClass: 'border-l-4 border-l-sky-500',
    highlightClass:
      'bg-sky-50 dark:bg-sky-950/55 text-sky-950 dark:text-sky-100 border border-sky-200/90 dark:border-sky-800/80'
  },
  {
    id: 'emerald',
    label: 'Verde',
    swatchClass: 'bg-emerald-500',
    borderLeftClass: 'border-l-4 border-l-emerald-500',
    highlightClass:
      'bg-emerald-50 dark:bg-emerald-950/55 text-emerald-950 dark:text-emerald-100 border border-emerald-200/90 dark:border-emerald-800/80'
  },
  {
    id: 'amber',
    label: 'Ambra',
    swatchClass: 'bg-amber-500',
    borderLeftClass: 'border-l-4 border-l-amber-500',
    highlightClass:
      'bg-amber-50 dark:bg-amber-950/55 text-amber-950 dark:text-amber-100 border border-amber-200/90 dark:border-amber-800/80'
  },
  {
    id: 'violet',
    label: 'Viola',
    swatchClass: 'bg-violet-500',
    borderLeftClass: 'border-l-4 border-l-violet-500',
    highlightClass:
      'bg-violet-50 dark:bg-violet-950/55 text-violet-950 dark:text-violet-100 border border-violet-200/90 dark:border-violet-800/80'
  },
  {
    id: 'rose',
    label: 'Rosa',
    swatchClass: 'bg-rose-500',
    borderLeftClass: 'border-l-4 border-l-rose-500',
    highlightClass:
      'bg-rose-50 dark:bg-rose-950/55 text-rose-950 dark:text-rose-100 border border-rose-200/90 dark:border-rose-800/80'
  },
  {
    id: 'blue',
    label: 'Blu',
    swatchClass: 'bg-blue-500',
    borderLeftClass: 'border-l-4 border-l-blue-500',
    highlightClass:
      'bg-blue-50 dark:bg-blue-950/55 text-blue-950 dark:text-blue-100 border border-blue-200/90 dark:border-blue-800/80'
  }
];

export function getPumpColorStyle(colorId?: string): PumpColorStyle {
  return (
    PUMP_COLOR_OPTIONS.find((c) => c.id === colorId) || PUMP_COLOR_OPTIONS[0]
  );
}
