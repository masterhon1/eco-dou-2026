import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  FileText,
  Flame,
  Gift,
  Info,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import sealedChestImg from '../assets/images/mystery_box_sealed_1794694568807.jpg';
import openedChestImg from '../assets/images/mystery_box_opened_1794694569481.jpg';
import {
  formatCountdown,
  MYSTERY_BOX_DURATION_MS,
  MYSTERY_BOX_MODIFIERS,
  ResolvedMysteryBoxStatus,
} from '../game/mysteryBox';

interface MysteryBoxCardProps {
  status: ResolvedMysteryBoxStatus;
  logCount: number;
  onOpenBox: () => void;
  onOpenLog: () => void;
}

export const MysteryBoxCard: React.FC<MysteryBoxCardProps> = ({
  status,
  logCount,
  onOpenBox,
  onOpenLog,
}) => {
  const [isOpening, setIsOpening] = useState(false);
  const [showOddsModal, setShowOddsModal] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleOpenClick = () => {
    if (status.phase !== 'READY' || isOpening) return;
    setIsOpening(true);
    window.setTimeout(() => {
      onOpenBox();
      setIsOpening(false);
    }, 420);
  };

  const mod = status.activeModifier;
  const isActive = status.phase === 'ACTIVE' && mod !== null;
  const isCooldown = status.phase === 'COOLDOWN_TODAY';
  const isEasier = mod?.polarity === 'easier';

  const progressPct = isActive
    ? Math.max(0, Math.min(100, (status.activeRemainingMs / MYSTERY_BOX_DURATION_MS) * 100))
    : 0;

  const expiresLabel = status.expiresAt
    ? new Date(status.expiresAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <section
      id="mystery-box"
      aria-labelledby="mystery-box-heading"
      className="rounded-2xl bg-slate-900 border border-slate-700/90 overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Left Visual Crate Showcase */}
        <div className="lg:col-span-4 relative min-h-[220px] sm:min-h-[250px] bg-slate-950 overflow-hidden flex items-center justify-center">
          {!imgError ? (
            <img
              src={isActive ? openedChestImg : sealedChestImg}
              alt={
                isActive
                  ? 'Opened daily mystery chest glowing with active game modifier'
                  : 'Sealed daily mystery chest ready to open'
              }
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isOpening ? 'scale-105 rotate-1' : 'scale-100'
              }`}
            />
          ) : (
            <div className="w-full h-full min-h-[220px] bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Gift className="w-14 h-14 text-amber-300" />
              <span className="font-display text-lg font-bold text-white">
                Daily Mystery Chest
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-amber-300">
                3-Hour Modifier · Daily Reset
              </p>
              <h2
                id="mystery-box-heading"
                className="font-display text-2xl font-bold text-white [text-wrap:balance]"
              >
                Daily Mystery Box
              </h2>
            </div>
          </div>
        </div>

        {/* Right Interactive Status & Controls */}
        <div className="lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between gap-5">
          {status.phase === 'READY' && (
            <>
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Gift className="w-4 h-4 shrink-0" />
                  <span>Available Today</span>
                  <span aria-hidden="true" className="text-slate-500">
                    ·
                  </span>
                  <span className="text-slate-300 font-normal">
                    Lasts 3 hours, then resets tomorrow
                  </span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
                  Roll Today&apos;s Gameplay Twist
                </h3>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
                  Open today&apos;s Mystery Box for a 3-hour effect across all levels. You might
                  unlock an easier blessing—like faster movement or slower pipe leaks—or a harder
                  challenge with bonus score multipliers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-950/75 border border-slate-800 p-3.5 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-emerald-300">4 Easier Blessings</div>
                    <div className="text-slate-300 text-xs sm:text-sm mt-0.5">
                      Faster speed, slower leaks, extra food bag slots, or 125 Max HP.
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-950/75 border border-slate-800 p-3.5 flex items-start gap-3">
                  <Flame className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-300">4 Harder Challenges</div>
                    <div className="text-slate-300 text-xs sm:text-sm mt-0.5">
                      Surging pipes, heatwave spoilage, dimmer twilight, or compact packs.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {isActive && mod && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {isEasier ? (
                    <>
                      <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">Makes Game Easier</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-amber-300">Makes Game Harder</span>
                    </>
                  )}
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-slate-300 font-normal">
                    Active until {expiresLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono-tabular text-sm font-bold text-white">
                  <Clock className="w-4 h-4 text-sky-300 shrink-0" />
                  <span>{formatCountdown(status.activeRemainingMs)} left</span>
                </div>
              </div>

              <div>
                <h3 className="font-display text-2xl font-bold text-white">
                  {mod.name} — {mod.headline}
                </h3>
                <p className="text-sm text-slate-200 mt-1 leading-relaxed">{mod.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {mod.effectsSummary.map((line) => (
                  <div
                    key={line}
                    className="rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100"
                  >
                    {line}
                  </div>
                ))}
              </div>

              {/* 3-hour progress indicator */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300 font-mono-tabular">
                  <span>3-Hour Active Window</span>
                  <span>Resets tomorrow in {formatCountdown(status.resetRemainingMs)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isEasier ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {isCooldown && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <RotateCcw className="w-4 h-4 text-sky-300 shrink-0" />
                  <span>3-Hour Effect Completed Today</span>
                </div>
                <div className="font-mono-tabular text-sm font-bold text-sky-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Resets in {formatCountdown(status.resetRemainingMs)}</span>
                </div>
              </div>

              <div>
                <h3 className="font-display text-2xl font-bold text-white">
                  Daily Mystery Box Resets at Midnight
                </h3>
                <p className="text-sm sm:text-base text-slate-200 mt-1 leading-relaxed">
                  {mod
                    ? `Today's roll (${mod.name} · ${
                        mod.polarity === 'easier' ? 'Easier' : 'Harder'
                      }) finished its 3-hour run. Standard gameplay rules are now active until tomorrow's reset.`
                    : 'Your daily 3-hour modifier has finished. Come back tomorrow for a fresh roll.'}
                </p>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {status.phase === 'READY' ? (
                <button
                  type="button"
                  onClick={handleOpenClick}
                  disabled={isOpening}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-70 text-slate-950 font-bold text-sm sm:text-base flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Gift className="w-5 h-5 shrink-0" />
                  <span>{isOpening ? 'Opening Chest...' : 'Open Mystery Box'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-sm flex items-center gap-2 cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    {isActive
                      ? `Active · ${formatCountdown(status.activeRemainingMs)}`
                      : `Resets in ${formatCountdown(status.resetRemainingMs)}`}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenLog}
                className="min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4 text-sky-300 shrink-0" />
                <span>External Log ({logCount})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowOddsModal(true)}
              className="min-h-[44px] px-3 py-2 text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>View All 8 Modifiers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: All 8 Possible Modifiers */}
      {showOddsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mystery-catalog-title"
        >
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2
                  id="mystery-catalog-title"
                  className="font-display text-xl font-bold text-white"
                >
                  Daily Mystery Box Modifiers
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Each roll stays active for 3 hours, then resets once per calendar day.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOddsModal(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Close modifier catalog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MYSTERY_BOX_MODIFIERS.map((item) => {
                const easy = item.polarity === 'easier';
                return (
                  <div
                    key={item.id}
                    className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-bold text-white">
                        {item.name}
                      </span>
                      <span
                        className={`text-xs font-semibold flex items-center gap-1 ${
                          easy ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {easy ? (
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Flame className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{easy ? 'Easier' : 'Harder'}</span>
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                    <ul className="space-y-1 pt-1 border-t border-slate-800/80 text-xs text-slate-200">
                      {item.effectsSummary.map((eff) => (
                        <li key={eff}>· {eff}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowOddsModal(false)}
                className="min-h-[46px] px-6 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
