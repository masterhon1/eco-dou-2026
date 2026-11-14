import React, { useEffect, useRef } from 'react';
import { drawPlayerSprite } from '../game/renderer';
import {
  P1_PRESET_COLORS,
  P2_PRESET_COLORS,
  SKIN_TONES,
} from '../game/levels';
import { AvatarHat, AvatarOutfit, PlayerCustomization } from '../game/types';
import { X } from 'lucide-react';

interface CharacterPreviewProps {
  customization: PlayerCustomization;
  roleId: 1 | 2;
  size?: number;
}

export const CharacterPreview: React.FC<CharacterPreviewProps> = ({
  customization,
  roleId,
  size = 96,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const start = performance.now();

    const render = (now: number) => {
      const t = (now - start) / 1000;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, size, size);

      // Subtle architectural plinth ring
      ctx.fillStyle = roleId === 1 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(251, 191, 36, 0.12)';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2 + 4, size * 0.36, 0, Math.PI * 2);
      ctx.fill();

      drawPlayerSprite(
        ctx,
        size / 2,
        size / 2 + 6,
        Math.sin(t * 1.4) * 0.5 + Math.PI / 2,
        t * 4.5,
        customization,
        roleId,
        0.65,
        0,
        size / 64
      );
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [customization, roleId, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-xl bg-slate-900/60 border border-slate-800"
      aria-label={`Player ${roleId} character preview`}
    />
  );
};

interface PlayerCustomizeModalProps {
  playerIndex: 1 | 2;
  value: PlayerCustomization;
  onChange: (next: PlayerCustomization) => void;
  onClose: () => void;
}

const OUTFIT_OPTIONS: { id: AvatarOutfit; label: string }[] = [
  { id: 'plumber', label: 'Plumber' },
  { id: 'chef', label: 'Chef' },
  { id: 'ranger', label: 'Ranger' },
  { id: 'volunteer', label: 'Helper' },
];

const HAT_OPTIONS: { id: AvatarHat; label: string }[] = [
  { id: 'hardhat', label: 'Hardhat' },
  { id: 'toque', label: 'Chef Hat' },
  { id: 'cap', label: 'Cap' },
  { id: 'visor', label: 'Visor' },
  { id: 'none', label: 'No Hat' },
];

export const PlayerCustomizeModal: React.FC<PlayerCustomizeModalProps> = ({
  playerIndex,
  value,
  onChange,
  onClose,
}) => {
  const palette = playerIndex === 1 ? P1_PRESET_COLORS : P2_PRESET_COLORS;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border-2 border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 id="customize-title" className="text-xl font-bold text-white">
              Edit Player {playerIndex}
            </h2>
            <p className="text-sm text-slate-200 mt-0.5">
              {playerIndex === 1
                ? 'Water Saver · WASD + Scoop [E] & Fix Tap [R]'
                : 'Food Helper · Arrows + Grab [1] & Send Meals [2]'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close customization"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center gap-5">
            <CharacterPreview customization={value} roleId={playerIndex} size={104} />
            <div className="flex-1 min-w-0">
              <label
                htmlFor={`player-${playerIndex}-name`}
                className="block text-sm font-semibold text-slate-200 mb-1.5"
              >
                Player Name
              </label>
              <input
                id={`player-${playerIndex}-name`}
                type="text"
                maxLength={16}
                value={value.name}
                onChange={(e) => onChange({ ...value, name: e.target.value })}
                placeholder={`Player ${playerIndex}`}
                className="w-full min-h-[48px] rounded-xl bg-slate-950 border-2 border-slate-700 px-3.5 py-2.5 text-base text-white focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-slate-200 mb-2">
              Outfit
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {OUTFIT_OPTIONS.map((opt) => {
                const selected = value.outfit === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ ...value, outfit: opt.id })}
                    className={`min-h-[48px] px-4 py-2 rounded-xl text-sm font-semibold text-left border-2 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-slate-800 border-sky-400 text-white'
                        : 'bg-slate-950/70 border-slate-700 text-slate-200 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-slate-200 mb-2">
              Hat
            </span>
            <div className="flex flex-wrap gap-2">
              {HAT_OPTIONS.map((opt) => {
                const selected = value.hat === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ ...value, hat: opt.id })}
                    className={`min-h-[48px] px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors whitespace-nowrap cursor-pointer ${
                      selected
                        ? 'bg-slate-800 border-sky-400 text-white'
                        : 'bg-slate-950/70 border-slate-700 text-slate-200 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-semibold text-slate-200 mb-2">
                Color
              </span>
              <div className="flex items-center gap-3">
                {palette.map((c) => {
                  const selected = value.primaryColor === c.primary;
                  return (
                    <button
                      key={c.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        onChange({
                          ...value,
                          primaryColor: c.primary,
                          accentColor: c.accent,
                        })
                      }
                      aria-label={c.label}
                      className={`w-11 h-11 rounded-full border-3 transition-transform cursor-pointer ${
                        selected ? 'border-white scale-110 ring-2 ring-amber-400' : 'border-slate-600'
                      }`}
                      style={{ backgroundColor: c.primary }}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-200 mb-2">
                Skin Tone
              </span>
              <div className="flex items-center gap-3">
                {SKIN_TONES.map((tone) => {
                  const selected = value.skinTone === tone;
                  return (
                    <button
                      key={tone}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange({ ...value, skinTone: tone })}
                      aria-label={`Skin tone ${tone}`}
                      className={`w-11 h-11 rounded-full border-3 transition-transform cursor-pointer ${
                        selected ? 'border-white scale-110 ring-2 ring-amber-400' : 'border-slate-600'
                      }`}
                      style={{ backgroundColor: tone }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[50px] px-7 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-base font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
