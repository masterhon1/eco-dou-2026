import React, { useEffect, useState } from 'react';
import {
  Clock,
  Compass,
  Droplets,
  Eye,
  FileText,
  Gift,
  GraduationCap,
  Monitor,
  Moon,
  Music,
  Navigation,
  Play,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Star,
  Sun,
  Swords,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import maze3dImg from '../assets/images/maze_3d_sanctuary_1794695583166.jpg';
import { BOSS_LEVEL, LEVELS, TUTORIAL_LEVEL } from '../game/levels';
import { ResolvedMysteryBoxStatus } from '../game/mysteryBox';
import {
  DeviceMode,
  LevelConfig,
  LevelStatsRecord,
  PlayerCustomization,
  SplitOrientation,
  TimeCycleMode,
} from '../game/types';
import { CharacterPreview } from './CharacterPreview';
import { MysteryBoxCard } from './MysteryBoxCard';
import { SustainabilityQuizSection } from './SustainabilityQuizSection';

interface LobbyScreenProps {
  selectedLevel: LevelConfig;
  onSelectLevel: (level: LevelConfig) => void;
  p1Custom: PlayerCustomization;
  p2Custom: PlayerCustomization;
  onEditPlayer: (playerIndex: 1 | 2) => void;
  deviceMode: DeviceMode;
  onChangeDeviceMode: (mode: DeviceMode) => void;
  splitOrientation: SplitOrientation;
  onChangeSplitOrientation: (orient: SplitOrientation) => void;
  timeCycleMode: TimeCycleMode;
  onChangeTimeCycleMode: (mode: TimeCycleMode) => void;
  seniorMode: boolean;
  onToggleSeniorMode: () => void;
  muted: boolean;
  onToggleMute: () => void;
  lofiEnabled: boolean;
  onToggleLofi: () => void;
  levelRecords: Record<string, LevelStatsRecord>;
  mysteryStatus: ResolvedMysteryBoxStatus;
  mysteryLogCount: number;
  mazeBestTimeSec: number | null;
  mazeBestStars: number;
  onOpenMysteryBox: () => void;
  onOpenMysteryLog: () => void;
  onLaunchLevel: (level: LevelConfig) => void;
  onLaunchMaze3D: () => void;
  onStartGame: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  selectedLevel,
  onSelectLevel,
  p1Custom,
  p2Custom,
  onEditPlayer,
  deviceMode,
  onChangeDeviceMode,
  splitOrientation,
  onChangeSplitOrientation,
  timeCycleMode,
  onChangeTimeCycleMode,
  seniorMode,
  onToggleSeniorMode,
  muted,
  onToggleMute,
  lofiEnabled,
  onToggleLofi,
  levelRecords,
  mysteryStatus,
  mysteryLogCount,
  mazeBestTimeSec,
  mazeBestStars,
  onOpenMysteryBox,
  onOpenMysteryLog,
  onLaunchLevel,
  onLaunchMaze3D,
  onStartGame,
}) => {
  const [showGuide, setShowGuide] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!showGuide) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowGuide(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGuide]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar: 3-zone contract */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[68px] py-2 flex items-center justify-between gap-6">
          <a
            href="#top"
            className="font-display text-2xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            EcoSplit
          </a>

          <nav className="hidden md:flex items-center gap-6 text-base font-medium text-slate-200">
            <a
              href="#maze-3d"
              className="min-h-[44px] flex items-center hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              3D Maze
            </a>
            <a
              href="#modes"
              className="min-h-[44px] flex items-center hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Modes
            </a>
            <a
              href="#levels"
              className="min-h-[44px] flex items-center hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Stages
            </a>
            <a
              href="#eco-quiz"
              className="min-h-[44px] flex items-center hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Eco Quiz
            </a>
            <button
              type="button"
              onClick={onOpenMysteryLog}
              className="min-h-[44px] flex items-center hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Mystery Log
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onStartGame}
              className="min-h-[48px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-md"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Play Now</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Hero Split Overview */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
            <p className="text-sm font-semibold text-sky-300 tracking-wide">
              Split-Screen Co-Op &amp; First-Player 3D Maze
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white [text-wrap:balance]">
              Save Every Drop. Rescue Every Harvest.
            </h1>
            <p className="text-slate-200 text-base sm:text-lg leading-relaxed max-w-2xl">
              Team up on one screen or explore our new 3D Sanctuary Maze solo. Repair leaking taps
              and rescue fresh meals for the orphanage—with clearer goals and smoother pacing across
              every stage.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onStartGame}
                className="min-h-[52px] px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap shadow-md"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {selectedLevel.mode === 'tutorial'
                    ? 'Play Tutorial'
                    : selectedLevel.mode === 'boss'
                    ? 'Fight Boss'
                    : `Play Level ${selectedLevel.number}: ${selectedLevel.name}`}
                </span>
              </button>
              <button
                type="button"
                onClick={onLaunchMaze3D}
                className="min-h-[52px] px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm sm:text-base flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shadow-md"
              >
                <Compass className="w-5 h-5 shrink-0" />
                <span>Try 3D Maze (1P)</span>
              </button>
              <button
                type="button"
                onClick={() => onLaunchLevel(TUTORIAL_LEVEL)}
                className="min-h-[52px] px-5 py-3 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 border-2 border-emerald-500 text-emerald-200 font-semibold text-sm sm:text-base flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <GraduationCap className="w-5 h-5 shrink-0" />
                <span>Tutorial Mode</span>
              </button>
              <button
                type="button"
                onClick={() => onLaunchLevel(BOSS_LEVEL)}
                className="min-h-[52px] px-5 py-3 rounded-xl bg-red-950/70 hover:bg-red-900/70 border-2 border-red-500 text-red-200 font-semibold text-sm sm:text-base flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Swords className="w-5 h-5 shrink-0" />
                <span>Boss Mode</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mysteryStatus.phase === 'READY') {
                    onOpenMysteryBox();
                  } else {
                    document
                      .getElementById('mystery-box')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className={`min-h-[52px] px-5 py-3 rounded-xl border-2 font-semibold text-sm sm:text-base flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  mysteryStatus.phase === 'READY'
                    ? 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-200'
                }`}
              >
                <Gift className="w-5 h-5 shrink-0" />
                <span>
                  {mysteryStatus.phase === 'READY'
                    ? 'Open Mystery Box'
                    : mysteryStatus.phase === 'ACTIVE' && mysteryStatus.activeModifier
                    ? `Box: ${mysteryStatus.activeModifier.name}`
                    : 'Mystery Box'}
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenMysteryLog}
                className="min-h-[52px] px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-slate-100 font-semibold text-sm sm:text-base flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-5 h-5 text-sky-300 shrink-0" />
                <span>External Log ({mysteryLogCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="min-h-[52px] px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-slate-100 font-semibold text-sm sm:text-base transition-colors cursor-pointer whitespace-nowrap"
              >
                How to Play
              </button>
              <button
                type="button"
                onClick={onToggleSeniorMode}
                aria-pressed={seniorMode}
                className={`min-h-[52px] px-4 py-3 rounded-xl border-2 text-sm sm:text-base font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  seniorMode
                    ? 'bg-amber-950/80 hover:bg-amber-900/80 border-amber-400 text-amber-200'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <Eye className="w-5 h-5 shrink-0" />
                <span>Easy Mode: {seniorMode ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={onToggleLofi}
                aria-pressed={lofiEnabled}
                aria-label={lofiEnabled ? 'Turn off Lo-Fi music' : 'Turn on Lo-Fi music'}
                className={`min-h-[52px] px-4 py-3 rounded-xl border-2 text-sm sm:text-base font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  lofiEnabled && !muted
                    ? 'bg-emerald-950/70 hover:bg-emerald-900/70 border-emerald-500 text-emerald-200'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <Music className="w-5 h-5 shrink-0" />
                <span>Music {lofiEnabled ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                aria-pressed={muted}
                aria-label={muted ? 'Unmute all sound' : 'Mute all sound'}
                className={`min-h-[52px] px-4 py-3 rounded-xl border-2 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  muted
                    ? 'bg-red-950/70 hover:bg-red-900/70 border-red-500 text-red-200'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100'
                }`}
              >
                {muted ? <VolumeX className="w-5 h-5 shrink-0" /> : <Volume2 className="w-5 h-5 shrink-0" />}
                <span>{muted ? 'Muted' : 'Sound On'}</span>
              </button>
            </div>
          </div>

          {/* Active Level Spotlight Card */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
            <div className="relative h-52 sm:h-60 bg-slate-800 overflow-hidden">
              {!failedImages[selectedLevel.id] ? (
                <img
                  src={selectedLevel.image}
                  alt={selectedLevel.name}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, [selectedLevel.id]: true }))
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sky-900/60 to-amber-900/60 flex items-center justify-center">
                  <span className="font-display text-lg font-bold text-slate-200">
                    {selectedLevel.name}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs text-slate-300">
                  {selectedLevel.mode === 'tutorial'
                    ? 'Tutorial Mode'
                    : selectedLevel.mode === 'boss'
                    ? 'Boss Battle'
                    : `Level ${selectedLevel.number}`}{' '}
                  · {selectedLevel.difficulty}
                </p>
                <h2 className="font-display text-xl font-bold text-white">
                  {selectedLevel.name}
                </h2>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                  {selectedLevel.description}
                </p>
                {selectedLevel.goalSummary && (
                  <p className="text-sm font-semibold text-emerald-300">
                    Clear Goal: {selectedLevel.goalSummary}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-center">
                <div>
                  <div className="text-xs font-medium text-slate-300">Water Goal</div>
                  <div className="font-mono-tabular text-base font-bold text-sky-300">
                    {selectedLevel.waterTargetLiters} L
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-300">Meals Goal</div>
                  <div className="font-mono-tabular text-base font-bold text-amber-300">
                    {selectedLevel.mealsTarget} Meals
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-300">Time</div>
                  <div className="font-mono-tabular text-base font-bold text-white">
                    {selectedLevel.durationSeconds}s
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* New First-Player 3D Sanctuary Maze Spotlight */}
        <section
          id="maze-3d"
          aria-labelledby="maze-3d-heading"
          className="rounded-2xl bg-slate-900 border border-slate-700/90 overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-5 relative min-h-[240px] bg-slate-950 overflow-hidden">
              {!failedImages['maze3d'] ? (
                <img
                  src={maze3dImg}
                  alt="3D Sanctuary Maze showing glowing resources and floating center light beacon"
                  referrerPolicy="no-referrer"
                  onError={() => setFailedImages((prev) => ({ ...prev, maze3d: true }))}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-[240px] bg-gradient-to-br from-slate-900 via-sky-950 to-amber-950 flex flex-col items-center justify-center gap-2 p-6 text-center">
                  <Compass className="w-12 h-12 text-amber-300" />
                  <span className="font-display text-xl font-bold text-white">
                    3D Sanctuary Maze
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-amber-300">
                    New Single-Player 3D Mode · 3/4 View
                  </p>
                  <h2
                    id="maze-3d-heading"
                    className="font-display text-2xl font-bold text-white"
                  >
                    Sanctuary 3D Maze
                  </h2>
                </div>
                {mazeBestStars > 0 && (
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= mazeBestStars ? 'fill-amber-400' : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between gap-5">
              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-sky-300">
                  First-Player 3D Challenge · Real-Time WebGL Labyrinth
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
                  Try Our New First-Player 3D Maze
                </h3>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                  Navigate a 3D stone labyrinth from an elevated three-quarter camera that reveals
                  75% of the maze at once. Track every glowing resource beam, gather all 10 eco
                  collectibles, and reach the Floating Beacon of Light at the center.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
                  <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 shrink-0" />
                    <span>3/4 Maze Visibility</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    See three-quarters of the corridors and rotate angles smoothly with Q / E.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>10 Visible Resources</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Spot luminous Aqua Crystals and Harvest Pods rising above the walls.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 shrink-0" />
                    <span>Floating Light Beacon</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Collect everything to unlock the central beacon spire and win.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onLaunchMaze3D}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm sm:text-base flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>Enter 3D Maze Mode</span>
                </button>
                <span className="text-xs sm:text-sm text-slate-300 font-mono-tabular">
                  {mazeBestTimeSec !== null
                    ? `Best Clear: ${Math.floor(mazeBestTimeSec / 60)}:${Math.floor(
                        mazeBestTimeSec % 60
                      )
                        .toString()
                        .padStart(2, '0')}`
                    : 'Fresh procedural maze every run'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Daily Mystery Box Showcase */}
        <MysteryBoxCard
          status={mysteryStatus}
          logCount={mysteryLogCount}
          onOpenBox={onOpenMysteryBox}
          onOpenLog={onOpenMysteryLog}
        />

        {/* Player Customization & Device Mode Row */}
        <section id="players" className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-sky-300 tracking-wide">
              Team Customization &amp; Comfort
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5 [text-wrap:balance]">
              Customize Your Eco Team &amp; Controls
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Player 1 Card */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-900 border border-slate-700/80 p-5 flex items-center gap-4">
            <CharacterPreview customization={p1Custom} roleId={1} size={92} />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
                <Droplets className="w-4 h-4 shrink-0" />
                <span>Player 1 · Water Saver</span>
              </div>
              <h3 className="font-display text-xl font-bold text-white truncate">
                {p1Custom.name}
              </h3>
              <p className="text-sm text-slate-200 leading-snug">
                WASD to move · [E] Scoop · [R] Fix Tap
              </p>
              <button
                type="button"
                onClick={() => onEditPlayer(1)}
                className="mt-1 min-h-[46px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Edit Player 1</span>
              </button>
            </div>
          </div>

          {/* Player 2 Card */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-900 border border-slate-700/80 p-5 flex items-center gap-4">
            <CharacterPreview customization={p2Custom} roleId={2} size={92} />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                <Utensils className="w-4 h-4 shrink-0" />
                <span>Player 2 · Food Helper</span>
              </div>
              <h3 className="font-display text-xl font-bold text-white truncate">
                {p2Custom.name}
              </h3>
              <p className="text-sm text-slate-200 leading-snug">
                Arrows to move · [1] Grab · [2] Send Meals
              </p>
              <button
                type="button"
                onClick={() => onEditPlayer(2)}
                className="mt-1 min-h-[46px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Edit Player 2</span>
              </button>
            </div>
          </div>

          {/* Device & Split-Screen Option Card */}
          <div
            id="display"
            className="lg:col-span-4 rounded-2xl bg-slate-900 border border-slate-700/80 p-5 flex flex-col justify-between gap-3.5"
          >
            <div>
              <span className="block text-sm font-semibold text-slate-200 mb-2">
                Controls Mode
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                {(
                  [
                    { id: 'auto', label: 'Auto' },
                    { id: 'desktop', label: 'Keyboard', icon: Monitor },
                    { id: 'mobile', label: 'Touch', icon: Smartphone },
                  ] as const
                ).map((item) => {
                  const Icon = 'icon' in item ? item.icon : null;
                  const active = deviceMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChangeDeviceMode(item.id)}
                      className={`min-h-[46px] px-2 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-200 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4 shrink-0" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-200 mb-2">
                Split Screen
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                {(
                  [
                    { id: 'auto', label: 'Auto' },
                    { id: 'side-by-side', label: 'Side', icon: SplitSquareHorizontal },
                    { id: 'top-bottom', label: 'Stacked', icon: SplitSquareVertical },
                  ] as const
                ).map((item) => {
                  const Icon = 'icon' in item ? item.icon : null;
                  const active = splitOrientation === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChangeSplitOrientation(item.id)}
                      className={`min-h-[46px] px-2 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-200 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4 shrink-0" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-200 mb-2">
                Time of Day
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                {(
                  [
                    { id: 'cycle', label: 'Day/Night', icon: Clock },
                    { id: 'day', label: 'Day', icon: Sun },
                    { id: 'night', label: 'Night', icon: Moon },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = timeCycleMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChangeTimeCycleMode(item.id)}
                      className={`min-h-[46px] px-2 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-200 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* Training & Boss Modes Section */}
        <section id="modes" className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-emerald-300 tracking-wide">
              Guided Training &amp; Co-Op Showdown
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5 [text-wrap:balance]">
              Master the Basics or Face the Wastelord
            </h2>
            <p className="text-sm sm:text-base text-slate-200 mt-1">
              Learn every action step-by-step in Tutorial Mode or team up against Mega-Wastelord MK-II (140 HP) in Boss Mode.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[TUTORIAL_LEVEL, BOSS_LEVEL].map((special) => {
              const isBoss = special.mode === 'boss';
              const rec = levelRecords[special.id];
              const isSelected = selectedLevel.id === special.id;
              return (
                <div
                  key={special.id}
                  className={`rounded-2xl overflow-hidden border-2 bg-slate-900 flex flex-col sm:flex-row ${
                    isSelected
                      ? 'border-sky-400 ring-2 ring-sky-500/40'
                      : 'border-slate-700/90'
                  }`}
                >
                  <div className="relative sm:w-56 h-44 sm:h-auto shrink-0 bg-slate-800 overflow-hidden">
                    {!failedImages[special.id] ? (
                      <img
                        src={special.image}
                        alt={special.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [special.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center p-4">
                        <span className="font-display font-bold text-white">{special.name}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        {isBoss ? 'Boss Encounter' : 'Guided Training'}
                      </span>
                      {rec && (
                        <span className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= rec.stars ? 'fill-amber-400' : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        {isBoss ? (
                          <Swords className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span className={isBoss ? 'text-red-300' : 'text-emerald-300'}>
                          {isBoss ? 'Boss Mode · 140 HP Titan' : 'Tutorial Mode · 5 Co-Op Steps'}
                        </span>
                      </div>
                      <h3 className="font-display text-xl font-bold text-white">
                        {special.name}
                      </h3>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {special.description}
                      </p>
                      {special.goalSummary && (
                        <p className="text-xs font-semibold text-sky-300">
                          Goal: {special.goalSummary}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => onLaunchLevel(special)}
                        className={`min-h-[46px] px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                          isBoss
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current shrink-0" />
                        <span>{isBoss ? 'Fight Boss' : 'Start Tutorial'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectLevel(special)}
                        className="min-h-[46px] px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold cursor-pointer whitespace-nowrap"
                      >
                        {isSelected ? 'Selected' : 'Preview'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Selectable Levels Section */}
        <section id="levels" className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-amber-300 tracking-wide">
                4 Balanced Co-Op Maps
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5 [text-wrap:balance]">
                Co-Op Stages &amp; Clear Goals
              </h2>
              <p className="text-sm sm:text-base text-slate-200 mt-1">
                Every stage has gentler pacing and a clear goal: hit both the Water and Meals targets before time expires.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {LEVELS.map((lvl) => {
              const isSelected = selectedLevel.id === lvl.id;
              const rec = levelRecords[lvl.id];
              return (
                <button
                  key={lvl.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectLevel(lvl)}
                  className={`group text-left rounded-2xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col ${
                    isSelected
                      ? 'bg-slate-900 border-sky-400 ring-2 ring-sky-500/40'
                      : 'bg-slate-900/80 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="relative h-36 bg-slate-800 overflow-hidden">
                    {!failedImages[lvl.id] ? (
                      <img
                        src={lvl.image}
                        alt={lvl.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [lvl.id]: true }))
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <span className="font-display font-bold text-slate-200">
                          {lvl.name}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        Level {lvl.number}
                      </span>
                      {rec && (
                        <span className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= rec.stars ? 'fill-amber-400' : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">
                        {lvl.name}
                      </h3>
                      <p className="text-sm text-slate-200 mt-0.5">{lvl.subtitle}</p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-800 space-y-1 text-sm text-slate-200 font-mono-tabular">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold font-sans">{lvl.difficulty}</span>
                        <span>{lvl.durationSeconds}s Round</span>
                      </div>
                      <div className="text-xs text-emerald-300 font-sans font-semibold">
                        Goal: {lvl.waterTargetLiters} L Water · {lvl.mealsTarget} Meals
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Interactive Sustainability Quiz */}
        <SustainabilityQuizSection />
      </main>

      {/* How to Play Modal */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border-2 border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 id="guide-title" className="font-display text-xl font-bold text-white">
                How to Play EcoSplit
              </h2>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Close guide"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm sm:text-base text-slate-200 max-h-[75vh] overflow-y-auto">
              <div className="space-y-2.5">
                <h3 className="font-display font-bold text-sky-300 text-lg">
                  Player 1 · Water Saver
                </h3>
                <ul className="space-y-2 text-sm leading-relaxed">
                  <li>
                    <strong>Move:</strong> W, A, S, D keys (Keyboard) or Left Pad (Touch).
                  </li>
                  <li>
                    <strong>Scoop Water [E]:</strong> Pick up spilled water puddles before they dry
                    up.
                  </li>
                  <li>
                    <strong>Fix Tap [R]:</strong> Stand next to a leaking tap and fix it so it stops
                    leaking.
                  </li>
                  <li>
                    <strong>Bonus:</strong> Walk into the Water Tank to empty your tank and get +50%
                    extra water!
                  </li>
                </ul>
              </div>
              <div className="space-y-2.5">
                <h3 className="font-display font-bold text-amber-300 text-lg">
                  Player 2 · Food Helper
                </h3>
                <ul className="space-y-2 text-sm leading-relaxed">
                  <li>
                    <strong>Move:</strong> Arrow keys (Keyboard) or Right Pad (Touch).
                  </li>
                  <li>
                    <strong>Grab Food [1]:</strong> Pick up bread, soup, fruit, and meal boxes
                    before they go bad.
                  </li>
                  <li>
                    <strong>Drop Off Meals:</strong> Walk into the Orphanage zone and your food is
                    given right away!
                  </li>
                  <li>
                    <strong>Send Meals [2]:</strong> Pack your food (or food next to you) into a
                    box that flies straight to the Orphanage.
                  </li>
                </ul>
              </div>
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-sm leading-relaxed">
                <div>
                  <strong className="text-emerald-300">Health (HP):</strong> Stay away from
                  spraying big leaks and spoiled green food clouds—they hurt you! Fix 7 taps (+25
                  HP), empty water at the Tank, grab fresh food, or give meals to heal.
                </div>
                <div>
                  <strong className="text-purple-300">Mystery Boxes [?]:</strong> Walk over glowing{' '}
                  <strong>[?]</strong> pickups in the arena or 3D Maze to reveal a hidden Good
                  boost or Bad trap!
                </div>
                <div>
                  <strong className="text-amber-300">Easy Mode &amp; Highlights:</strong> Turn on
                  Easy Mode for larger text, slower leaks, easier reach, and brighter night mode.
                  Dashed rings show what is ready to grab or fix!
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[50px] px-7 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-base font-bold cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
