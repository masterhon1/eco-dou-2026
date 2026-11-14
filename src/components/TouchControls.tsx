import React, { useRef } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Droplets,
  HeartHandshake,
  Utensils,
  Wrench,
} from 'lucide-react';
import { Vec2 } from '../game/types';

interface VirtualJoystickProps {
  accentClass: string;
  label: string;
  onMove: (vec: Vec2) => void;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  accentClass,
  label,
  onMove,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);

  const updateFromClient = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.34;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = dist > 5 ? (Math.cos(angle) * clampedDist) / maxR : 0;
    const ny = dist > 5 ? (Math.sin(angle) * clampedDist) / maxR : 0;

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${nx * maxR}px, ${ny * maxR}px)`;
    }
    onMove({ x: nx, y: ny });
  };

  const resetStick = () => {
    activePointerId.current = null;
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }
    onMove({ x: 0, y: 0 });
  };

  return (
    <div
      ref={padRef}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointerId.current = e.pointerId;
        updateFromClient(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (activePointerId.current === e.pointerId) {
          updateFromClient(e.clientX, e.clientY);
        }
      }}
      onPointerUp={(e) => {
        if (activePointerId.current === e.pointerId) {
          resetStick();
        }
      }}
      onPointerCancel={(e) => {
        if (activePointerId.current === e.pointerId) {
          resetStick();
        }
      }}
      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center shadow-inner cursor-pointer shrink-0 touch-game-surface"
      aria-label={label}
    >
      <ArrowUp className="w-4 h-4 text-slate-200 absolute top-1.5" />
      <ArrowDown className="w-4 h-4 text-slate-200 absolute bottom-1.5" />
      <ArrowLeft className="w-4 h-4 text-slate-200 absolute left-1.5" />
      <ArrowRight className="w-4 h-4 text-slate-200 absolute right-1.5" />
      <div
        ref={knobRef}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${accentClass} shadow-md border-2 border-white/60 pointer-events-none transition-transform duration-75`}
      />
    </div>
  );
};

interface TouchControlsDeckProps {
  isMobileMode: boolean;
  p1Name: string;
  p2Name: string;
  p1Hint: string | null;
  p2Hint: string | null;
  p1Health: number;
  p2Health: number;
  p1TapsFixed: number;
  p1CarryingLiters: number;
  p2CarryingFood: number;
  p1CanScoop?: boolean;
  p1CanFixTap?: boolean;
  p2CanGrab?: boolean;
  p2CanSend?: boolean;
  onP1Move: (vec: Vec2) => void;
  onP2Move: (vec: Vec2) => void;
  onP1CollectWater: () => void;
  onP1FixTap: () => void;
  onP2CollectFood: () => void;
  onP2ReuseFood: () => void;
}

export const TouchControlsDeck: React.FC<TouchControlsDeckProps> = ({
  isMobileMode,
  p1Name,
  p2Name,
  p1Hint,
  p2Hint,
  p1Health,
  p2Health,
  p1TapsFixed,
  p1CarryingLiters,
  p2CarryingFood,
  p1CanScoop = false,
  p1CanFixTap = false,
  p2CanGrab = false,
  p2CanSend = false,
  onP1Move,
  onP2Move,
  onP1CollectWater,
  onP1FixTap,
  onP2CollectFood,
  onP2ReuseFood,
}) => {
  return (
    <div className="w-full bg-slate-950/95 border-t border-slate-700 px-2 py-2 sm:px-4 sm:py-3 touch-game-surface shrink-0">
      <div className="max-w-7xl mx-auto grid grid-cols-2 gap-2 sm:gap-4">
        {/* Player 1 Controls (Water Guardian) */}
        <div className="flex items-center justify-between gap-2.5 rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-2 sm:px-3.5 sm:py-2.5">
          {isMobileMode ? (
            <VirtualJoystick
              accentClass="bg-sky-500"
              label="Player 1 movement pad"
              onMove={onP1Move}
            />
          ) : (
            <div className="hidden lg:flex flex-col min-w-0">
              <span className="text-sm font-bold text-sky-300 truncate">
                P1 · {p1Name} · <span className={p1Health <= 30 ? 'text-red-400' : 'text-emerald-300'}>{p1Health} HP</span>
              </span>
              <span className="text-xs sm:text-sm text-slate-200 whitespace-nowrap">
                WASD · Tank {p1CarryingLiters}L · Fixed {p1TapsFixed % 7}/7
              </span>
              {p1Hint && (
                <span className="text-xs sm:text-sm font-semibold text-sky-200 truncate">
                  {p1Hint}
                </span>
              )}
            </div>
          )}

          <div
            className={`flex ${
              isMobileMode ? 'flex-col sm:flex-row' : 'flex-row'
            } items-stretch sm:items-center gap-2 flex-1 justify-end`}
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onP1CollectWater();
              }}
              className={`min-h-[52px] sm:min-h-[56px] px-3 sm:px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                p1CanScoop ? 'ring-3 ring-white shadow-lg shadow-sky-400/35 scale-[1.02]' : ''
              }`}
            >
              <Droplets className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Scoop</span>
              {!isMobileMode && (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-sky-900 text-xs font-bold">
                  E
                </kbd>
              )}
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onP1FixTap();
              }}
              className={`min-h-[52px] sm:min-h-[56px] px-3 sm:px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                p1CanFixTap ? 'ring-3 ring-white shadow-lg shadow-teal-400/35 scale-[1.02]' : ''
              }`}
            >
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Fix Tap</span>
              {!isMobileMode && (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-teal-900 text-xs font-bold">
                  R
                </kbd>
              )}
            </button>
          </div>
        </div>

        {/* Player 2 Controls (Food Rescuer) */}
        <div className="flex items-center justify-between gap-2.5 rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-2 sm:px-3.5 sm:py-2.5">
          <div
            className={`flex ${
              isMobileMode ? 'flex-col sm:flex-row' : 'flex-row'
            } items-stretch sm:items-center gap-2 flex-1`}
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onP2CollectFood();
              }}
              className={`min-h-[52px] sm:min-h-[56px] px-3 sm:px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                p2CanGrab ? 'ring-3 ring-white shadow-lg shadow-amber-400/35 scale-[1.02]' : ''
              }`}
            >
              <Utensils className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Grab</span>
              {!isMobileMode && (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-amber-900 text-xs font-bold">
                  1
                </kbd>
              )}
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onP2ReuseFood();
              }}
              className={`min-h-[52px] sm:min-h-[56px] px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                p2CanSend ? 'ring-3 ring-white shadow-lg shadow-emerald-400/35 scale-[1.02]' : ''
              }`}
            >
              <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Send Meals</span>
              {!isMobileMode && (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-900 text-xs font-bold">
                  2
                </kbd>
              )}
            </button>
          </div>

          {isMobileMode ? (
            <VirtualJoystick
              accentClass="bg-amber-500"
              label="Player 2 movement pad"
              onMove={onP2Move}
            />
          ) : (
            <div className="hidden lg:flex flex-col items-end min-w-0 text-right">
              <span className="text-sm font-bold text-amber-300 truncate">
                P2 · {p2Name} · <span className={p2Health <= 30 ? 'text-red-400' : 'text-emerald-300'}>{p2Health} HP</span>
              </span>
              <span className="text-xs sm:text-sm text-slate-200 whitespace-nowrap">
                Arrows · Bag {p2CarryingFood}/5
              </span>
              {p2Hint && (
                <span className="text-xs sm:text-sm font-semibold text-amber-200 truncate">
                  {p2Hint}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
