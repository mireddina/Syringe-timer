/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShiftType } from '../types';
import { Clock, Sun, Sunset, Moon, Sliders } from 'lucide-react';

interface ShiftManagerProps {
  shiftType: ShiftType;
  customEndTime: string;
  onSelectShiftType: (type: ShiftType) => void;
  onChangeCustomEndTime: (time: string) => void;
  hoursUntilShiftEnd: number;
  shiftEndDate: Date;
  currentTime: Date;
}

export const ShiftManager: React.FC<ShiftManagerProps> = ({
  shiftType,
  customEndTime,
  onSelectShiftType,
  onChangeCustomEndTime,
  hoursUntilShiftEnd,
  shiftEndDate,
  currentTime
}) => {
  const shifts: Array<{ type: ShiftType; label: string; time: string; icon: React.ReactNode }> = [
    {
      type: 'morning',
      label: 'Mattina',
      time: '06:45 - 13:25',
      icon: <Sun className="w-4 h-4 text-amber-500" />
    },
    {
      type: 'afternoon',
      label: 'Pomeriggio',
      time: '13:05 - 19:44',
      icon: <Sunset className="w-4 h-4 text-orange-500" />
    },
    {
      type: 'night',
      label: 'Notte',
      time: '19:25 - 07:04',
      icon: <Moon className="w-4 h-4 text-indigo-400" />
    },
    {
      type: 'custom',
      label: 'Personalizzato',
      time: customEndTime,
      icon: <Sliders className="w-4 h-4 text-slate-500" />
    }
  ];

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedCurrentTime = `${pad(currentTime.getHours())}:${pad(currentTime.getMinutes())}`;
  const formattedShiftEnd = `${pad(shiftEndDate.getHours())}:${pad(shiftEndDate.getMinutes())}`;

  const remainingHours = Math.floor(hoursUntilShiftEnd);
  const remainingMins = Math.floor((hoursUntilShiftEnd - remainingHours) * 60);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
            Pianificazione Turno Infermieristico
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
          <span>
            Ora Attuale:{' '}
            <strong className="font-bold text-slate-900 dark:text-slate-100">
              {formattedCurrentTime}
            </strong>
          </span>
          <span className="text-slate-400" aria-hidden="true">·</span>
          <span>
            Fine Turno:{' '}
            <strong className="font-bold text-slate-900 dark:text-slate-100">
              {formattedShiftEnd}
            </strong>
          </span>
          <span className="text-slate-400" aria-hidden="true">·</span>
          <span>
            Mancano:{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {remainingHours}h {remainingMins}m
            </strong>
          </span>
        </div>
      </div>

      {/* Shift Segmented Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {shifts.map((s) => {
          const isActive = shiftType === s.type;
          return (
            <button
              key={s.type}
              type="button"
              onClick={() => onSelectShiftType(s.type)}
              className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 w-full justify-between">
                <span className="text-xs font-semibold">{s.label}</span>
                {s.icon}
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                {s.type === 'custom' ? `Termina: ${customEndTime}` : s.time}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Time Selector if 'custom' is active */}
      {shiftType === 'custom' && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <label htmlFor="custom-shift-time" className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Imposta orario preciso di fine turno:
          </label>
          <input
            id="custom-shift-time"
            type="time"
            value={customEndTime}
            onChange={(e) => onChangeCustomEndTime(e.target.value)}
            className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
};
