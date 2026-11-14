/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Calculator,
  AlertCircle,
  Bell,
  BellOff,
  Sun,
  Moon,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  ListChecks,
  LayoutGrid,
  Plus,
  Syringe
} from 'lucide-react';
import { SyringeData, ShiftType } from './types';
import {
  computeSyringeCalculations,
  formatVolume,
  formatClockTime,
  parseVolume
} from './utils/calculations';
import { computeDoseFlow } from './utils/dose';
import { getPumpColorStyle, PUMP_COLOR_OPTIONS } from './utils/pumpColors';
import { soundManager } from './utils/audio';
import { ShiftManager } from './components/ShiftManager';
import { ReplacementsTimeline } from './components/ReplacementsTimeline';
import { RateCalculatorModal } from './components/RateCalculatorModal';
import { PumpsOverview } from './components/PumpsOverview';
import { AddPumpModal } from './components/AddPumpModal';
import { StartupSessionModal } from './components/StartupSessionModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DRUG_PRESETS, findDrugPresetByName } from './data/drugPresets';

type AppView = 'summary' | 'list' | 'detail';
const VIEW_ORDER: AppView[] = ['summary', 'list', 'detail'];

function detectCurrentShift(date: Date): ShiftType {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  // Mattina: 06:45 - 13:25, Pomeriggio: 13:05 - 19:44, Notte: 19:25 - 07:04
  if (totalMinutes >= 6 * 60 + 45 && totalMinutes < 13 * 60 + 5) {
    return 'morning';
  }
  if (totalMinutes >= 13 * 60 + 5 && totalMinutes < 19 * 60 + 25) {
    return 'afternoon';
  }
  return 'night';
}

// Initial default syringes
const DEFAULT_SYRINGES: SyringeData[] = [
  {
    id: 'syr-1',
    name: 'Pompa 1',
    drugName: 'Noradrenalina',
    nominalVolume: 50, // default nominal, but freely editable!
    currentVolume: 42,
    infusionRate: 3.5, // ml/h
    concentration: '5 fl (10 mg) in 50 ml S.G. · 0,2 mg/ml',
    color: 'rose',
    isRunning: true,
    alertMinutesBefore: 15,
    soundEnabled: true,
    notes: 'Accesso CVC lume distale'
  },
  {
    id: 'syr-2',
    name: 'Pompa 2',
    drugName: 'Fentanil',
    nominalVolume: 50,
    currentVolume: 25,
    infusionRate: 2.0, // ml/h
    concentration: '5 fl (500 µg) in 50 ml · 10 µg/ml',
    color: 'amber',
    isRunning: true,
    alertMinutesBefore: 20,
    soundEnabled: true,
    notes: 'Sedazione continua'
  }
];

function loadSavedSyringes(): SyringeData[] {
  try {
    const saved = localStorage.getItem('syringe_data');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('syringe_theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    return false;
  });

  // Sound muted state
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  // Active Syringes (starts empty on first open; preserves [] if cleared)
  const [syringes, setSyringes] = useState<SyringeData[]>(() => loadSavedSyringes());

  const [activeSyringeId, setActiveSyringeId] = useState<string>(() => {
    const saved = loadSavedSyringes();
    return saved[0]?.id ?? '';
  });

  // Ask user at app startup whether to keep saved pumps or start from 0
  const [isStartupPromptOpen, setIsStartupPromptOpen] = useState<boolean>(
    () => loadSavedSyringes().length > 0
  );

  // Shift configuration (automatically initialized based on current time)
  const [shiftType, setShiftType] = useState<ShiftType>(() => detectCurrentShift(new Date()));
  const [customEndTime, setCustomEndTime] = useState<string>('13:25');

  // View, Swipe & Modals
  const [activeView, setActiveView] = useState<AppView>('summary');
  const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [isRateCalcOpen, setIsRateCalcOpen] = useState(false);
  const [isAddPumpOpen, setIsAddPumpOpen] = useState(false);

  // Input states for active syringe volume & rate to allow smooth typing (including decimals)
  const [nominalVolumeInput, setNominalVolumeInput] = useState<string>('50');
  const [currentVolumeInput, setCurrentVolumeInput] = useState<string>('42');
  const [rateInput, setRateInput] = useState<string>('3.5');

  // Input error state
  const [volumeError, setVolumeError] = useState<string | null>(null);

  // Time reference ticking every 1 second
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('syringe_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('syringe_theme', 'light');
    }
  }, [isDarkMode]);

  // Keep audio manager in sync with mute state
  useEffect(() => {
    soundManager.setMuted(isSoundMuted);
  }, [isSoundMuted]);

  // Save syringes state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('syringe_data', JSON.stringify(syringes));
    } catch {
      // ignore
    }
  }, [syringes]);

  // Get active syringe (may be undefined when list is empty)
  const activeSyringe = useMemo<SyringeData | undefined>(() => {
    if (syringes.length === 0) return undefined;
    return syringes.find((s) => s.id === activeSyringeId) || syringes[0];
  }, [syringes, activeSyringeId]);

  // Keep input fields in sync when active syringe changes
  useEffect(() => {
    if (activeSyringe) {
      setNominalVolumeInput(formatVolume(activeSyringe.nominalVolume));
      setCurrentVolumeInput(formatVolume(activeSyringe.currentVolume));
      setRateInput(formatVolume(activeSyringe.infusionRate));
      setVolumeError(null);
    }
  }, [activeSyringe?.id]);

  // Compute shift end date
  const shiftEndDate = useMemo(() => {
    const end = new Date(currentTime);
    if (shiftType === 'morning') {
      end.setHours(13, 25, 0, 0);
      if (end.getTime() <= currentTime.getTime()) {
        end.setDate(end.getDate() + 1);
      }
    } else if (shiftType === 'afternoon') {
      end.setHours(19, 44, 0, 0);
      if (end.getTime() <= currentTime.getTime()) {
        end.setDate(end.getDate() + 1);
      }
    } else if (shiftType === 'night') {
      end.setHours(7, 4, 0, 0);
      // Night ends next morning if current time is already at or past 07:04
      if (end.getTime() <= currentTime.getTime()) {
        end.setDate(end.getDate() + 1);
      }
    } else {
      // Custom
      const [h, m] = customEndTime.split(':').map((v) => parseInt(v, 10));
      end.setHours(isNaN(h) ? 13 : h, isNaN(m) ? 25 : m, 0, 0);
      if (end.getTime() <= currentTime.getTime()) {
        end.setDate(end.getDate() + 1);
      }
    }
    return end;
  }, [shiftType, customEndTime, currentTime]);

  const hoursUntilShiftEnd = useMemo(() => {
    return Math.max(0, (shiftEndDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60));
  }, [shiftEndDate, currentTime]);

  // Main countdown timer ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Decrement volume for running syringes
      setSyringes((prevList) =>
        prevList.map((syr) => {
          if (!syr.isRunning || syr.currentVolume <= 0) {
            return syr;
          }

          // In 1 second: volume consumed = rate (ml/h) / 3600
          const consumedPerSecond = syr.infusionRate / 3600;
          const newVol = Math.max(0, syr.currentVolume - consumedPerSecond);

          // Trigger alarms if threshold crossed
          const durationHours = newVol / (syr.infusionRate > 0 ? syr.infusionRate : 1);
          const minutesRemaining = durationHours * 60;

          if (syr.soundEnabled && !syr.alarmDismissed && !isSoundMuted) {
            if (newVol <= 0.001) {
              soundManager.playUrgentAlarm();
            } else if (
              syr.alertMinutesBefore > 0 &&
              Math.abs(minutesRemaining - syr.alertMinutesBefore) < 0.02
            ) {
              soundManager.playPreAlarm();
            }
          }

          return {
            ...syr,
            currentVolume: newVol
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isSoundMuted]);

  // Update currentVolumeInput periodically to match live decay
  useEffect(() => {
    if (activeSyringe && activeSyringe.isRunning) {
      setCurrentVolumeInput(formatVolume(activeSyringe.currentVolume));
    }
  }, [activeSyringe?.currentVolume, activeSyringe?.isRunning]);

  // Compute live flow/dose for active syringe
  const activeDoseFlow = useMemo(() => {
    if (!activeSyringe) return null;
    return computeDoseFlow(activeSyringe);
  }, [activeSyringe]);

  // Compute earliest upcoming empty pump across all pumps (prefer running pumps)
  const nextExpiringPump = useMemo(() => {
    const entries = syringes.map((syringe, idx) => ({
      index: idx + 1,
      syringe,
      calcs: computeSyringeCalculations(syringe, currentTime, shiftEndDate)
    }));

    const runningUpcoming = entries
      .filter(
        (e) =>
          e.syringe.isRunning &&
          !e.calcs.isFinished &&
          e.calcs.estimatedEmptyTime !== null
      )
      .sort((a, b) => a.calcs.durationHours - b.calcs.durationHours);

    if (runningUpcoming.length > 0) return runningUpcoming[0];

    const anyUpcoming = entries
      .filter((e) => !e.calcs.isFinished && e.calcs.estimatedEmptyTime !== null)
      .sort((a, b) => a.calcs.durationHours - b.calcs.durationHours);

    return anyUpcoming[0] ?? null;
  }, [syringes, currentTime, shiftEndDate]);

  // Quick volume selection handler for 20, 30, 40, 50 ml
  const handleQuickVolumeSelect = (vol: number) => {
    if (!activeSyringe) return;
    soundManager.playClick();
    setNominalVolumeInput(vol.toString());
    setVolumeError(null);

    setSyringes((prev) =>
      prev.map((s) => {
        if (s.id !== activeSyringe.id) return s;
        // When nominal volume changes, if current volume was full or exceeds new nominal, adjust accordingly
        const wasFull = Math.abs(s.currentVolume - s.nominalVolume) < 0.1;
        const newCurrent = wasFull ? vol : Math.min(vol, s.currentVolume);
        setCurrentVolumeInput(formatVolume(newCurrent));
        return {
          ...s,
          nominalVolume: vol,
          currentVolume: newCurrent
        };
      })
    );
  };

  // Free typing handler for nominal volume
  const handleNominalVolumeChange = (valueStr: string) => {
    if (!activeSyringe) return;
    setNominalVolumeInput(valueStr);

    const parsed = parseVolume(valueStr);
    if (parsed === null) {
      setVolumeError('Inserire un valore numerico maggiore di 0 ml');
      return;
    }

    if (parsed <= 0) {
      setVolumeError('Il volume deve essere maggiore di 0 ml');
      return;
    }

    setVolumeError(null);

    // Apply valid custom volume immediately to syringe state
    setSyringes((prev) =>
      prev.map((s) => {
        if (s.id !== activeSyringe.id) return s;
        const wasFull = Math.abs(s.currentVolume - s.nominalVolume) < 0.1;
        const newCurrent = wasFull ? parsed : Math.min(parsed, s.currentVolume);
        setCurrentVolumeInput(formatVolume(newCurrent));
        return {
          ...s,
          nominalVolume: parsed,
          currentVolume: newCurrent
        };
      })
    );
  };

  // Current residual volume input handler
  const handleCurrentVolumeChange = (valStr: string) => {
    if (!activeSyringe) return;
    setCurrentVolumeInput(valStr);
    const parsed = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      const bounded = Math.min(activeSyringe.nominalVolume, parsed);
      setSyringes((prev) =>
        prev.map((s) => (s.id === activeSyringe.id ? { ...s, currentVolume: bounded } : s))
      );
    }
  };

  // Reset to full syringe (nominal volume)
  const handleFillSyringe = () => {
    if (!activeSyringe) return;
    soundManager.playClick();
    const fullVol = activeSyringe.nominalVolume;
    setCurrentVolumeInput(formatVolume(fullVol));
    setSyringes((prev) =>
      prev.map((s) =>
        s.id === activeSyringe.id ? { ...s, currentVolume: fullVol, alarmDismissed: false } : s
      )
    );
  };

  // Infusion rate change handler
  const handleRateChange = (valStr: string) => {
    if (!activeSyringe) return;
    setRateInput(valStr);
    const parsed = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      setSyringes((prev) =>
        prev.map((s) => (s.id === activeSyringe.id ? { ...s, infusionRate: parsed } : s))
      );
    }
  };

  // Infusion rate nudge
  const handleRateNudge = (delta: number) => {
    if (!activeSyringe) return;
    soundManager.playClick();
    const newRate = Math.max(0.1, Math.round((activeSyringe.infusionRate + delta) * 10) / 10);
    setRateInput(formatVolume(newRate));
    setSyringes((prev) =>
      prev.map((s) => (s.id === activeSyringe.id ? { ...s, infusionRate: newRate } : s))
    );
  };

  // Play / Pause toggle
  const togglePlayPause = () => {
    if (!activeSyringe) return;
    soundManager.playClick();
    setSyringes((prev) =>
      prev.map((s) => (s.id === activeSyringe.id ? { ...s, isRunning: !s.isRunning } : s))
    );
  };

  // Open modal to ask new infusion details before adding a pump
  const handleAddSyringe = () => {
    soundManager.playClick();
    setIsAddPumpOpen(true);
  };

  // Confirm adding new syringe from AddPumpModal
  const handleConfirmAddSyringe = (newSyringe: SyringeData) => {
    soundManager.playClick();
    setSyringes((prev) => [...prev, newSyringe]);
    setActiveSyringeId(newSyringe.id);
  };

  // Delete single syringe (can delete down to 0 pumps)
  const handleDeleteSyringe = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundManager.playClick();
    setSyringes((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (activeSyringeId === id) {
        setActiveSyringeId(remaining[0]?.id ?? '');
      }
      return remaining;
    });
  };

  // Clear all syringes (start from 0)
  const handleClearAllSyringes = () => {
    soundManager.playClick();
    setSyringes([]);
    setActiveSyringeId('');
  };

  // Load sample pumps on request from empty state
  const handleLoadSampleSyringes = () => {
    soundManager.playClick();
    setSyringes(DEFAULT_SYRINGES);
    setActiveSyringeId(DEFAULT_SYRINGES[0].id);
  };

  // Per-pump handlers for PumpsOverview list screen
  const handleTogglePumpRunningById = (id: string) => {
    soundManager.playClick();
    setSyringes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isRunning: !s.isRunning } : s))
    );
  };

  const handleRefillPumpById = (id: string) => {
    soundManager.playClick();
    setSyringes((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (s.id === activeSyringe?.id) {
          setCurrentVolumeInput(formatVolume(s.nominalVolume));
        }
        return { ...s, currentVolume: s.nominalVolume, alarmDismissed: false };
      })
    );
  };

  const handleTogglePumpAlarmById = (id: string) => {
    soundManager.playClick();
    setSyringes((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const calcs = computeSyringeCalculations(s, currentTime, shiftEndDate);
        const isAlarmActiveNow =
          !s.alarmDismissed && (calcs.isPreAlarmActive || calcs.isUrgentAlarmActive);
        if (isAlarmActiveNow) {
          return { ...s, alarmDismissed: true };
        }
        if (!s.soundEnabled || s.alarmDismissed) {
          return { ...s, soundEnabled: true, alarmDismissed: false };
        }
        return { ...s, soundEnabled: false };
      })
    );
  };

  const navigateToView = (nextView: AppView) => {
    const currIdx = VIEW_ORDER.indexOf(activeView);
    const nextIdx = VIEW_ORDER.indexOf(nextView);
    setSwipeDirection(nextIdx >= currIdx ? 1 : -1);
    setActiveView(nextView);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (isRateCalcOpen || isAddPumpOpen || isStartupPromptOpen || e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }

    const target = e.target as HTMLElement | null;
    if (target?.closest('input, select, textarea, [data-no-swipe="true"]')) {
      touchStartRef.current = null;
      return;
    }

    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || e.changedTouches.length === 0) return;

    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    const dt = Date.now() - start.time;

    if (dt > 700 || Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) {
      return;
    }

    const currIdx = VIEW_ORDER.indexOf(activeView);
    if (dx < 0 && currIdx < VIEW_ORDER.length - 1) {
      soundManager.playClick();
      navigateToView(VIEW_ORDER[currIdx + 1]);
    } else if (dx > 0 && currIdx > 0) {
      soundManager.playClick();
      navigateToView(VIEW_ORDER[currIdx - 1]);
    }
  };

  const handleSelectPumpFromList = (id: string) => {
    soundManager.playClick();
    setActiveSyringeId(id);
    navigateToView('detail');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Top Bar Contract: Mobile-optimized 2-row compact header on < md, single-row 3-zone header on >= md */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-12 md:h-14 gap-2 md:gap-4">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0">
              ST
            </span>
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              Syringe Timer
            </span>
            <span className="text-xs text-slate-400 hidden lg:inline font-mono">
              v2.5 · Infusion & Shift Replacements
            </span>
          </div>

          {/* Zone 2: Desktop Navigation / Quick Tools (1: Riepilogo, 2: Elenco, 3: Dettaglio) */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => navigateToView('summary')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'summary'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Riepilogo</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToView('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'list'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Elenco Pompe ({syringes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToView('detail')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'detail'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Dettaglio</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRateCalcOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Velocità da Dose</span>
            </button>
          </nav>

          {/* Zone 3: Install CTA + Utility Toggles */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              title={isSoundMuted ? 'Riattiva allarmi sonori' : 'Silenzia allarmi'}
              aria-label={isSoundMuted ? 'Riattiva allarmi sonori' : 'Silenzia allarmi'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Modalità Notturna / Diurna"
              aria-label="Modalità Notturna / Diurna"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Quick-Action Navigation Bar (visible on < md; 1: Riepilogo, 2: Elenco, 3: Dettaglio) */}
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 px-2.5 py-1.5 flex items-center gap-1 bg-slate-50/80 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={() => navigateToView('summary')}
            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'summary'
                ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>Riepilogo</span>
          </button>
          <button
            type="button"
            onClick={() => navigateToView('list')}
            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'list'
                ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5 shrink-0" />
            <span>Elenco ({syringes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => navigateToView('detail')}
            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'detail'
                ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>Dettaglio</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRateCalcOpen(true)}
            className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-200 active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
          >
            <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="sm:hidden">Velocità</span>
            <span className="hidden sm:inline">Velocità da Dose</span>
          </button>
        </div>
      </header>

      {/* Main Container with Horizontal Swipe Navigation */}
      <main
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 touch-pan-y overflow-x-hidden min-h-[calc(100vh-5rem)]"
      >
        <AnimatePresence mode="wait" initial={false} custom={swipeDirection}>
          <motion.div
            key={activeView}
            custom={swipeDirection}
            initial={{ opacity: 0, x: swipeDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: swipeDirection * -24 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
        {activeView === 'list' ? (
          <PumpsOverview
            syringes={syringes}
            activeSyringeId={activeSyringe?.id ?? ''}
            currentTime={currentTime}
            shiftEndDate={shiftEndDate}
            onSelectPump={handleSelectPumpFromList}
            onToggleRunning={handleTogglePumpRunningById}
            onRefillPump={handleRefillPumpById}
            onAddPump={handleAddSyringe}
            onDeletePump={(id) => handleDeleteSyringe(id)}
            onClearAllPumps={handleClearAllSyringes}
            onLoadSamplePumps={handleLoadSampleSyringes}
            onTogglePumpAlarm={handleTogglePumpAlarmById}
          />
        ) : activeView === 'detail' ? (
          !activeSyringe ? (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-center mx-auto">
                <Syringe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Nessuna pompa attiva
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aggiungi una pompa per impostarne volume, velocità e pre-allarme.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddSyringe}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi Pompa</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateToView('list')}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Vai a Elenco Pompe
                </button>
              </div>
            </div>
          ) : (
          <div className="max-w-3xl mx-auto">
            {/* Primary Control Card (Schermata Dettaglio) */}
            <div
              className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-5 ${
                getPumpColorStyle(activeSyringe.color).borderLeftClass
              }`}
            >
              {/* Syringe Identity row */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="drug-name-input"
                      className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5"
                    >
                      <span
                        aria-hidden="true"
                        className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${
                          getPumpColorStyle(activeSyringe.color).swatchClass
                        }`}
                      />
                      {activeSyringe.name} · Farmaco in infusione:
                    </label>
                    <div className="flex items-center gap-1">
                      {PUMP_COLOR_OPTIONS.slice(0, 5).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setSyringes((prev) =>
                              prev.map((s) =>
                                s.id === activeSyringe.id ? { ...s, color: opt.id } : s
                              )
                            );
                          }}
                          title={`Colore: ${opt.label}`}
                          aria-label={`Imposta colore ${opt.label}`}
                          className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                            opt.swatchClass
                          } ${
                            activeSyringe.color === opt.id
                              ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110'
                              : 'opacity-55 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <input
                    id="drug-name-input"
                    type="text"
                    list="detail-drug-presets"
                    value={activeSyringe.drugName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = findDrugPresetByName(val);
                      const isExact = matched && matched.name.toLowerCase() === val.trim().toLowerCase();
                      setSyringes((prev) =>
                        prev.map((s) =>
                          s.id === activeSyringe.id
                            ? {
                                ...s,
                                drugName: val,
                                concentration: isExact
                                  ? `${matched.preparation} · ${matched.concentrationLabel}`
                                  : s.concentration,
                                doseConfig: isExact ? undefined : s.doseConfig,
                                color: isExact ? matched.suggestedColor : s.color
                              }
                            : s
                        )
                      );
                    }}
                    className="font-bold text-base text-slate-900 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none w-full"
                    placeholder="Nome farmaco"
                  />
                  <datalist id="detail-drug-presets">
                    {DRUG_PRESETS.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                  {(() => {
                    const matchedPreset = findDrugPresetByName(activeSyringe.drugName);
                    if (matchedPreset) {
                      return (
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5 truncate">
                          {matchedPreset.concentrationLabel} · {matchedPreset.dosageRangeText}
                        </div>
                      );
                    }
                    if (activeSyringe.concentration) {
                      return (
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5 truncate">
                          {activeSyringe.concentration}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    type="button"
                    onClick={togglePlayPause}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    aria-pressed={activeSyringe.isRunning}
                    title={activeSyringe.isRunning ? 'Clicca per mettere in pausa' : 'Clicca per avviare l’infusione'}
                    className={`relative overflow-hidden flex items-center justify-center px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeSyringe.isRunning
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {activeSyringe.isRunning ? (
                        <motion.span
                          key="running"
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="flex items-center gap-1.5"
                        >
                          <Pause className="w-3.5 h-3.5 shrink-0" />
                          <span>In esecuzione · Pausa</span>
                        </motion.span>
                      ) : (
                        <motion.span
                          key="paused"
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 shrink-0" />
                          <span>In pausa · Avvia</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>

              {/* SECTION: Volume Nominale Siringa (Richiesta Utente) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="nominal-volume-input" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                    <span>Volume Nominale Siringa</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Digitazione libera o tasti rapidi
                  </span>
                </div>

                {/* Free Numeric Input Field */}
                <div className="relative">
                  <input
                    id="nominal-volume-input"
                    type="number"
                    step="any"
                    min="0.1"
                    value={nominalVolumeInput}
                    onChange={(e) => handleNominalVolumeChange(e.target.value)}
                    className={`w-full px-3.5 py-2 text-base font-bold font-mono rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                      volumeError
                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                    }`}
                    placeholder="Es. 50, 40, 30, 20, 35, 12.5..."
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    ml
                  </div>
                </div>

                {/* Validation message if invalid or <= 0 */}
                {volumeError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{volumeError}</span>
                  </div>
                )}

                {/* Pulsanti rapidi obbligatori: 20, 30, 40 e 50 ml */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Pulsanti rapidi standard:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[20, 30, 40, 50].map((vol) => {
                      const isCurrentlyActive =
                        Math.abs(activeSyringe.nominalVolume - vol) < 0.001;
                      return (
                        <button
                          key={vol}
                          type="button"
                          onClick={() => handleQuickVolumeSelect(vol)}
                          className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                            isCurrentlyActive
                              ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {vol} ml
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  Puoi inserire qualsiasi volume personalizzato (es.{' '}
                  <span className="font-mono underline">10 ml</span>,{' '}
                  <span className="font-mono underline">12.5 ml</span>,{' '}
                  <span className="font-mono underline">35 ml</span>,{' '}
                  <span className="font-mono underline">60 ml</span>). Tutti i calcoli di durata, residuo e ricambi si adatteranno automaticamente.
                </p>
              </div>

              {/* SECTION: Volume Residuo Attuale nella siringa */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label htmlFor="current-volume-input" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Volume Residuo Attuale in Siringa
                  </label>
                  <button
                    type="button"
                    onClick={handleFillSyringe}
                    className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Imposta a Piena ({formatVolume(activeSyringe.nominalVolume)} ml)
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-32 shrink-0">
                    <input
                      id="current-volume-input"
                      type="number"
                      step="any"
                      min="0"
                      max={activeSyringe.nominalVolume}
                      value={currentVolumeInput}
                      onChange={(e) => handleCurrentVolumeChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                      ml
                    </span>
                  </div>

                  {/* Slider tied to custom nominalVolume */}
                  <input
                    type="range"
                    min="0"
                    max={activeSyringe.nominalVolume}
                    step="0.1"
                    value={activeSyringe.currentVolume}
                    onChange={(e) => handleCurrentVolumeChange(e.target.value)}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* SECTION: Velocità di Infusione (ml/h) */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <label htmlFor="rate-input" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Velocità di Infusione Pompa
                    </label>
                    {activeDoseFlow && (
                      <span className="text-xs font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                        · {activeDoseFlow.formatted}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRateCalcOpen(true)}
                    className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Calculator className="w-3 h-3" />
                    Calcolatore Dose
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRateNudge(-1)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-mono text-xs font-bold"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRateNudge(-0.1)}
                    className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-mono text-xs font-bold"
                  >
                    -0.1
                  </button>

                  <div className="relative flex-1">
                    <input
                      id="rate-input"
                      type="number"
                      step="any"
                      min="0.01"
                      value={rateInput}
                      onChange={(e) => handleRateChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-center text-lg font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                      ml/h
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRateNudge(0.1)}
                    className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-mono text-xs font-bold"
                  >
                    +0.1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRateNudge(1)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-mono text-xs font-bold"
                  >
                    +1
                  </button>
                </div>

                {activeDoseFlow && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Flusso / Dose equivalente
                      {activeDoseFlow.useWeight ? ` (peso ${activeDoseFlow.weightKg} kg)` : ''}:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRateCalcOpen(true)}
                      className="font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {activeDoseFlow.formatted}
                    </button>
                  </div>
                )}

                {/* Quick Speed presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-mono text-slate-400">Preimpostati:</span>
                  {[1, 2, 4, 6, 8].map((r) => {
                    const isActivePreset = Math.abs(activeSyringe.infusionRate - r) < 0.001;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          handleRateChange(r.toString());
                        }}
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
              </div>

              {/* Pre-alarm setting & per-pump alarm silence */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  Pre-allarme esaurimento siringa:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={activeSyringe.alertMinutesBefore}
                    onChange={(e) =>
                      setSyringes((prev) =>
                        prev.map((s) =>
                          s.id === activeSyringe.id
                            ? {
                                ...s,
                                alertMinutesBefore: parseInt(e.target.value, 10),
                                alarmDismissed: false
                              }
                            : s
                        )
                      )
                    }
                    className="px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value={5}>5 minuti prima</option>
                    <option value={10}>10 minuti prima</option>
                    <option value={15}>15 minuti prima</option>
                    <option value={20}>20 minuti prima</option>
                    <option value={30}>30 minuti prima</option>
                    <option value={0}>Disattivato</option>
                  </select>

                  {(() => {
                    const activeCalcs = computeSyringeCalculations(
                      activeSyringe,
                      currentTime,
                      shiftEndDate
                    );
                    const isAlarmActiveNow =
                      !activeSyringe.alarmDismissed &&
                      (activeCalcs.isPreAlarmActive || activeCalcs.isUrgentAlarmActive);
                    const isAlarmSilenced =
                      !activeSyringe.soundEnabled || Boolean(activeSyringe.alarmDismissed);
                    return (
                      <button
                        type="button"
                        onClick={() => handleTogglePumpAlarmById(activeSyringe.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          isAlarmActiveNow
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold'
                            : isAlarmSilenced
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {isAlarmSilenced || isAlarmActiveNow ? (
                          <BellOff className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Bell className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                        <span>
                          {isAlarmActiveNow
                            ? 'Annulla allarme'
                            : isAlarmSilenced
                            ? 'Allarme silenziato'
                            : 'Silenzia pompa'}
                        </span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
          )
        ) : (
        <>
          {/* Top Shift Management Panel */}
          <ShiftManager
            shiftType={shiftType}
            customEndTime={customEndTime}
            onSelectShiftType={setShiftType}
            onChangeCustomEndTime={setCustomEndTime}
            hoursUntilShiftEnd={hoursUntilShiftEnd}
            shiftEndDate={shiftEndDate}
            currentTime={currentTime}
          />

          {/* Prossimo Esaurimento Card */}
          <div
            className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm ${
              nextExpiringPump ? getPumpColorStyle(nextExpiringPump.syringe.color).borderLeftClass : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                  Prossimo Esaurimento
                </h2>
              </div>

              {nextExpiringPump && (
                <span
                  className={`text-xs font-medium ${
                    nextExpiringPump.calcs.isPreAlarmActive
                      ? 'text-amber-600 dark:text-amber-400'
                      : nextExpiringPump.syringe.isRunning
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {nextExpiringPump.calcs.isPreAlarmActive
                    ? 'Pre-allarme attivo'
                    : !nextExpiringPump.syringe.soundEnabled || nextExpiringPump.syringe.alarmDismissed
                    ? nextExpiringPump.syringe.isRunning
                      ? 'In esecuzione · Silenziato'
                      : 'In pausa · Silenziato'
                    : nextExpiringPump.syringe.isRunning
                    ? 'In esecuzione'
                    : 'In pausa'}
                </span>
              )}
            </div>

            {nextExpiringPump ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`w-3 h-3 rounded-[3px] shrink-0 ${
                        getPumpColorStyle(nextExpiringPump.syringe.color).swatchClass
                      }`}
                    />
                    <span className="text-xs font-mono font-bold text-slate-400">
                      #{nextExpiringPump.index}
                    </span>
                    <span
                      className={`text-base sm:text-lg font-bold px-2.5 py-0.5 rounded-md truncate max-w-full ${
                        getPumpColorStyle(nextExpiringPump.syringe.color).highlightClass
                      }`}
                    >
                      {nextExpiringPump.syringe.drugName || 'Farmaco'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    <span>
                      Residuo {formatVolume(nextExpiringPump.syringe.currentVolume)} /{' '}
                      {formatVolume(nextExpiringPump.syringe.nominalVolume)} ml
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatVolume(nextExpiringPump.syringe.infusionRate)} ml/h</span>
                    {(() => {
                      const nextDoseFlow = computeDoseFlow(nextExpiringPump.syringe);
                      if (!nextDoseFlow) return null;
                      return (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {nextDoseFlow.formatted}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="sm:text-right">
                    <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 block leading-tight">
                      ore{' '}
                      {nextExpiringPump.calcs.estimatedEmptyTime
                        ? formatClockTime(nextExpiringPump.calcs.estimatedEmptyTime)
                        : '--:--'}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      tra {nextExpiringPump.calcs.formattedDuration}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {(() => {
                      const syr = nextExpiringPump.syringe;
                      const isAlarmActiveNow =
                        !syr.alarmDismissed &&
                        (nextExpiringPump.calcs.isPreAlarmActive ||
                          nextExpiringPump.calcs.isUrgentAlarmActive);
                      const isAlarmSilenced =
                        !syr.soundEnabled || Boolean(syr.alarmDismissed);
                      return (
                        <button
                          type="button"
                          onClick={() => handleTogglePumpAlarmById(syr.id)}
                          title={
                            isAlarmActiveNow
                              ? 'Annulla allarme attivo su questa pompa'
                              : isAlarmSilenced
                              ? 'Riattiva allarme sonoro su questa pompa'
                              : 'Silenzia allarme su questa pompa'
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isAlarmActiveNow
                              ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold'
                              : isAlarmSilenced
                              ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {isAlarmSilenced || isAlarmActiveNow ? (
                            <BellOff className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Bell className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                          <span>
                            {isAlarmActiveNow
                              ? 'Annulla allarme'
                              : isAlarmSilenced
                              ? 'Silenziato'
                              : 'Silenzia'}
                          </span>
                        </button>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => handleRefillPumpById(nextExpiringPump.syringe.id)}
                      title={`Ricarica a ${formatVolume(nextExpiringPump.syringe.nominalVolume)} ml`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-semibold text-blue-700 dark:text-blue-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ricarica</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setActiveSyringeId(nextExpiringPump.syringe.id);
                        navigateToView('detail');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Dettaglio</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {syringes.length === 0
                    ? 'Nessuna pompa impostata (inizio turno). Aggiungi la prima pompa per iniziare.'
                    : 'Nessuna infusione attiva con volume residuo disponibile.'}
                </p>
                {syringes.length === 0 && (
                  <button
                    type="button"
                    onClick={handleAddSyringe}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aggiungi Pompa</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Multi-Pump Shift Replacement List */}
          <ReplacementsTimeline
            syringes={syringes}
            currentTime={currentTime}
            shiftEndDate={shiftEndDate}
            onOpenPumpDetail={(id) => {
              soundManager.playClick();
              setActiveSyringeId(id);
              navigateToView('detail');
            }}
            onTogglePumpAlarm={handleTogglePumpAlarmById}
          />
        </>
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Rate Calculator Modal */}
      <RateCalculatorModal
        isOpen={isRateCalcOpen}
        onClose={() => setIsRateCalcOpen(false)}
        nominalVolume={activeSyringe?.nominalVolume ?? 50}
        activeDrugName={activeSyringe?.drugName}
        currentDoseConfig={activeSyringe?.doseConfig}
        onApplyRate={(rate, notes, doseConfig) => {
          setRateInput(formatVolume(rate));
          if (!activeSyringe) {
            const newId = `syr-${Date.now()}`;
            const newSyringe: SyringeData = {
              id: newId,
              name: 'Pompa 1',
              drugName: 'Nuova Infusione',
              nominalVolume: 50,
              currentVolume: 50,
              infusionRate: rate,
              concentration: notes || '',
              doseConfig,
              color: 'blue',
              isRunning: true,
              alertMinutesBefore: 15,
              soundEnabled: true
            };
            setSyringes([newSyringe]);
            setActiveSyringeId(newId);
            navigateToView('detail');
            return;
          }
          setSyringes((prev) =>
            prev.map((s) =>
              s.id === activeSyringe.id
                ? {
                    ...s,
                    infusionRate: rate,
                    doseConfig: doseConfig ?? s.doseConfig
                  }
                : s
            )
          );
        }}
      />

      {/* Add New Pump Modal */}
      <AddPumpModal
        isOpen={isAddPumpOpen}
        onClose={() => setIsAddPumpOpen(false)}
        nextPumpNumber={syringes.length + 1}
        onConfirmAdd={handleConfirmAddSyringe}
      />

      {/* Startup Prompt: Keep Saved Pumps or Start From Zero */}
      <StartupSessionModal
        isOpen={isStartupPromptOpen}
        syringes={syringes}
        onKeepSaved={() => {
          soundManager.playClick();
          setIsStartupPromptOpen(false);
        }}
        onStartFromZero={() => {
          handleClearAllSyringes();
          setIsStartupPromptOpen(false);
          navigateToView('list');
        }}
      />

      <OfflineIndicator />
    </div>
  );
}
