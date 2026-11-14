import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Droplets,
  Eye,
  Flame,
  Gift,
  GraduationCap,
  Heart,
  Info,
  Monitor,
  Moon,
  Music,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Swords,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundFx } from '../game/audio';
import { EcoSplitEngine } from '../game/engine';
import { formatCountdown } from '../game/mysteryBox';
import {
  DeviceMode,
  GameHudSnapshot,
  InputState,
  LevelConfig,
  MysteryBoxModifier,
  PlayerCustomization,
  SplitOrientation,
  TimeCycleMode,
  Vec2,
} from '../game/types';
import { TouchControlsDeck } from './TouchControls';

interface GameViewProps {
  level: LevelConfig;
  hasNextLevel: boolean;
  p1Custom: PlayerCustomization;
  p2Custom: PlayerCustomization;
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
  activeMysteryModifier: MysteryBoxModifier | null;
  mysteryRemainingMs: number;
  onExitToLobby: () => void;
  onNextLevel: () => void;
  onLevelComplete: (levelId: string, score: number, stars: number, waterL: number, meals: number) => void;
}

export const GameView: React.FC<GameViewProps> = ({
  level,
  hasNextLevel,
  p1Custom,
  p2Custom,
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
  activeMysteryModifier,
  mysteryRemainingMs,
  onExitToLobby,
  onNextLevel,
  onLevelComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [showBriefing, setShowBriefing] = useState(true);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [runSeed, setRunSeed] = useState(0);
  const [isTouchViewport, setIsTouchViewport] = useState(false);
  const [isPortraitViewport, setIsPortraitViewport] = useState(false);

  const engineRef = useRef<EcoSplitEngine | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const touchMoveP1Ref = useRef<Vec2>({ x: 0, y: 0 });
  const touchMoveP2Ref = useRef<Vec2>({ x: 0, y: 0 });
  const pendingActionsRef = useRef({
    p1Action1: false,
    p1Action2: false,
    p2Action1: false,
    p2Action2: false,
  });

  const [hud, setHud] = useState<GameHudSnapshot>({
    mode: level.mode ?? 'standard',
    timeRemaining: level.durationSeconds,
    timeOfDay: timeCycleMode === 'night' ? 'night' : 'day',
    daylightLevel: timeCycleMode === 'night' ? (seniorMode ? 0.52 : 0.14) : 1,
    p1Health: 100 + (activeMysteryModifier?.maxHealthBonus ?? 0),
    p2Health: 100 + (activeMysteryModifier?.maxHealthBonus ?? 0),
    p1MaxHealth: 100 + (activeMysteryModifier?.maxHealthBonus ?? 0),
    p2MaxHealth: 100 + (activeMysteryModifier?.maxHealthBonus ?? 0),
    gameOverReason: null,
    waterSavedLiters: 0,
    waterWastedLiters: 0,
    waterCarryingLiters: 0,
    tapsFixed: 0,
    activeLeaks: 1,
    mealsDonated: 0,
    foodCarryingCount: 0,
    foodSpoiledCount: 0,
    activeFoodCount: 2,
    p1Score: 0,
    p2Score: 0,
    teamScore: 0,
    p1NearbyHint: null,
    p2NearbyHint: null,
    p1CanScoop: false,
    p1CanFixTap: false,
    p2CanGrab: false,
    p2CanSend: false,
    orphanageBannerTimer: 0,
    lastOrphanageDelivery: 0,
    majorAlert: null,
    mysteryBoxesCollected: 0,
    activeMysteryPickupCount: 0,
    activePickupEffects: [],
    lastMysteryReveal: null,
    boss: null,
    tutorial: null,
  });

  // Detect screen/touch capabilities for Auto mode
  useEffect(() => {
    const updateViewportInfo = () => {
      const coarse =
        typeof window !== 'undefined' &&
        (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900);
      setIsTouchViewport(coarse);
      setIsPortraitViewport(window.innerHeight > window.innerWidth);
    };
    updateViewportInfo();
    window.addEventListener('resize', updateViewportInfo);
    return () => window.removeEventListener('resize', updateViewportInfo);
  }, []);

  const effectiveMobile = useMemo(() => {
    if (deviceMode === 'mobile') return true;
    if (deviceMode === 'desktop') return false;
    return isTouchViewport;
  }, [deviceMode, isTouchViewport]);

  const effectiveOrientation: Exclude<SplitOrientation, 'auto'> = useMemo(() => {
    if (splitOrientation !== 'auto') return splitOrientation;
    return isPortraitViewport ? 'top-bottom' : 'side-by-side';
  }, [splitOrientation, isPortraitViewport]);

  // Initialize / Restart Engine
  useEffect(() => {
    engineRef.current = new EcoSplitEngine(
      level,
      p1Custom,
      p2Custom,
      timeCycleMode,
      seniorMode,
      activeMysteryModifier
    );
    setFinished(false);
    setPaused(false);
    setShowBriefing(true);
    setHud(engineRef.current.getHudSnapshot());
  }, [level, p1Custom, p2Custom, runSeed]);

  // Live sync timeCycleMode, seniorMode, and activeMysteryModifier without resetting level progress
  useEffect(() => {
    engineRef.current?.setTimeCycleMode(timeCycleMode);
  }, [timeCycleMode]);

  useEffect(() => {
    engineRef.current?.setSeniorMode(seniorMode);
  }, [seniorMode]);

  useEffect(() => {
    engineRef.current?.setMysteryModifier(activeMysteryModifier);
  }, [activeMysteryModifier]);

  // Gently duck Lo-Fi music while mission is paused
  useEffect(() => {
    soundFx.setMusicDucked(paused);
    return () => {
      soundFx.setMusicDucked(false);
    };
  }, [paused]);

  // Keyboard Listeners (WASD + E/R for P1, Arrows + 1/2 for P2)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();

      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)
      ) {
        e.preventDefault();
      }

      if (showBriefing) {
        if (code === 'Enter' || code === 'Space') {
          soundFx.playTapFix();
          setShowBriefing(false);
        }
        return;
      }

      if (code === 'Escape' || key === 'p') {
        if (!finished) setPaused((prev) => !prev);
        return;
      }

      keysRef.current.add(code);

      if (!paused && !finished) {
        if (key === 'e' || key === 'f') {
          pendingActionsRef.current.p1Action1 = true;
        }
        if (key === 'r' || key === 'q') {
          pendingActionsRef.current.p1Action2 = true;
        }
        if (key === '1' || code === 'Numpad1') {
          pendingActionsRef.current.p2Action1 = true;
        }
        if (key === '2' || code === 'Numpad2') {
          pendingActionsRef.current.p2Action2 = true;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    const onBlur = () => {
      keysRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [paused, finished, showBriefing]);

  // Compute stars for completion
  const computeStars = useCallback(
    (snap: GameHudSnapshot) => {
      if (snap.gameOverReason === 'health') return 0;
      if (snap.mode === 'tutorial') {
        return snap.gameOverReason === 'tutorial_complete' ? 3 : 1;
      }
      if (snap.mode === 'boss') {
        if (snap.gameOverReason !== 'boss_defeated') return 0;
        if (snap.p1Health >= 55 && snap.p2Health >= 55 && snap.timeRemaining >= 20) return 3;
        return 2;
      }
      const waterRatio = snap.waterSavedLiters / level.waterTargetLiters;
      const mealRatio = snap.mealsDonated / level.mealsTarget;
      const avg = (waterRatio + mealRatio) / 2;
      if (waterRatio >= 1 && mealRatio >= 1 && avg >= 1.15) return 3;
      if (avg >= 0.85) return 2;
      return 1;
    },
    [level.mealsTarget, level.waterTargetLiters]
  );

  // Main 60fps Game Loop + Responsive Canvas Sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    const resize = () => {
      if (!container || !canvas) return;
      width = Math.max(300, container.clientWidth);
      height = Math.max(220, container.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let lastTime = performance.now();
    let hudTimer = 0;
    let animId = 0;
    let reportedFinish = false;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const engine = engineRef.current;
      if (engine) {
        if (!paused && !finished && !showBriefing) {
          const keys = keysRef.current;
          const p1KeyX = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
          const p1KeyY = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0);
          const p2KeyX =
            (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
          const p2KeyY =
            (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);

          const input: InputState = {
            p1Move: {
              x: p1KeyX !== 0 ? p1KeyX : touchMoveP1Ref.current.x,
              y: p1KeyY !== 0 ? p1KeyY : touchMoveP1Ref.current.y,
            },
            p2Move: {
              x: p2KeyX !== 0 ? p2KeyX : touchMoveP2Ref.current.x,
              y: p2KeyY !== 0 ? p2KeyY : touchMoveP2Ref.current.y,
            },
            p1Action1Pressed: pendingActionsRef.current.p1Action1,
            p1Action2Pressed: pendingActionsRef.current.p1Action2,
            p2Action1Pressed: pendingActionsRef.current.p2Action1,
            p2Action2Pressed: pendingActionsRef.current.p2Action2,
          };

          pendingActionsRef.current.p1Action1 = false;
          pendingActionsRef.current.p1Action2 = false;
          pendingActionsRef.current.p2Action1 = false;
          pendingActionsRef.current.p2Action2 = false;

          const isDone = engine.update(dt, input);
          if (isDone && !reportedFinish) {
            reportedFinish = true;
            const snap = engine.getHudSnapshot();
            setHud(snap);
            setFinished(true);
            const stars = computeStars(snap);
            onLevelComplete(
              level.id,
              snap.teamScore,
              stars,
              snap.waterSavedLiters,
              snap.mealsDonated
            );
          }
        }

        engine.renderSplitScreen(ctx, width, height, effectiveOrientation);

        hudTimer += dt;
        if (hudTimer >= 0.1) {
          hudTimer = 0;
          setHud(engine.getHudSnapshot());
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [
    paused,
    finished,
    showBriefing,
    effectiveOrientation,
    computeStars,
    level.id,
    onLevelComplete,
  ]);

  const handleRestart = () => {
    soundFx.playTapFix();
    setRunSeed((s) => s + 1);
  };

  const formattedTime = useMemo(() => {
    const secs = Math.ceil(hud.timeRemaining);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [hud.timeRemaining]);

  const earnedStars = computeStars(hud);

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Accessible Top HUD */}
      <header className="min-h-[54px] sm:min-h-[60px] py-1.5 shrink-0 bg-slate-950 border-b border-slate-700 px-2.5 sm:px-5 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onExitToLobby}
            className="min-h-[44px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center gap-1.5 text-sm font-semibold cursor-pointer shrink-0"
            aria-label="Back to Menu"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Menu</span>
          </button>
          <div className="hidden sm:block min-w-0">
            <div className="text-sm font-bold text-white truncate">
              {level.mode === 'tutorial'
                ? 'Tutorial · Training Courtyard'
                : level.mode === 'boss'
                ? `Boss · ${level.name}`
                : `L${level.number} · ${level.name}`}
            </div>
            {activeMysteryModifier && level.mode !== 'tutorial' && (
              <div
                className={`text-xs font-semibold flex items-center gap-1 truncate ${
                  activeMysteryModifier.polarity === 'easier'
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                }`}
              >
                {activeMysteryModifier.polarity === 'easier' ? (
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">
                  {activeMysteryModifier.name} · {formatCountdown(mysteryRemainingMs)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center Metrics Strip: P1 Health + Water · Day/Night Timer · Meals + P2 Health */}
        <div className="flex items-center gap-2.5 sm:gap-5 font-mono-tabular text-sm sm:text-base">
          <div
            className={`hidden md:flex items-center gap-1 ${
              hud.p1Health <= 30 ? 'text-red-400' : 'text-emerald-300'
            }`}
            title="Player 1 Health"
          >
            <Heart className="w-4 h-4 fill-current shrink-0" />
            <span className="font-bold">{hud.p1Health}</span>
          </div>

          <div className="flex items-center gap-1.5 text-sky-300">
            <Droplets className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="font-bold">
              {hud.waterSavedLiters}
              <span className="text-slate-300 font-normal">/{level.waterTargetLiters}L</span>
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 ${
              hud.timeRemaining <= 15
                ? 'bg-red-600/30 text-red-200 border border-red-400/60'
                : hud.timeOfDay === 'night'
                ? 'bg-indigo-950 text-indigo-100 border border-indigo-600'
                : hud.timeOfDay === 'dusk' || hud.timeOfDay === 'dawn'
                ? 'bg-amber-950/70 text-amber-100 border border-amber-500/60'
                : 'bg-slate-900 text-white border border-slate-700'
            }`}
          >
            {hud.timeOfDay === 'day' && <Sun className="w-4 h-4 text-amber-300 shrink-0" />}
            {hud.timeOfDay === 'dusk' && <Sunset className="w-4 h-4 text-orange-300 shrink-0" />}
            {hud.timeOfDay === 'night' && <Moon className="w-4 h-4 text-sky-200 shrink-0" />}
            {hud.timeOfDay === 'dawn' && <Sunrise className="w-4 h-4 text-amber-200 shrink-0" />}
            <span className="hidden sm:inline text-xs font-sans font-semibold capitalize">
              {hud.timeOfDay}
            </span>
            <span>{formattedTime}</span>
          </div>

          <div className="flex items-center gap-1.5 text-amber-300">
            <Utensils className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="font-bold">
              {hud.mealsDonated}
              <span className="text-slate-300 font-normal">/{level.mealsTarget}</span>
            </span>
          </div>

          <div
            className={`hidden md:flex items-center gap-1 ${
              hud.p2Health <= 30 ? 'text-red-400' : 'text-emerald-300'
            }`}
            title="Player 2 Health"
          >
            <Heart className="w-4 h-4 fill-current shrink-0" />
            <span className="font-bold">{hud.p2Health}</span>
          </div>
        </div>

        {/* Right Quick Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleSeniorMode}
            aria-pressed={seniorMode}
            title={seniorMode ? 'Turn off Easy Mode' : 'Turn on Easy Mode (larger text, slower pace)'}
            className={`min-h-[44px] px-2.5 rounded-xl border flex items-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer ${
              seniorMode
                ? 'bg-amber-950/80 hover:bg-amber-900/80 border-amber-400 text-amber-200'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
            aria-label={seniorMode ? 'Easy Mode On' : 'Easy Mode Off'}
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">Easy</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const order: TimeCycleMode[] = ['cycle', 'day', 'night'];
              const next = order[(order.indexOf(timeCycleMode) + 1) % order.length];
              onChangeTimeCycleMode(next);
            }}
            title={`Time mode: ${timeCycleMode} (click to switch)`}
            aria-label={`Time of day: ${timeCycleMode}`}
            className="min-h-[44px] px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            {timeCycleMode === 'cycle' && <Clock className="w-4 h-4 text-amber-300 shrink-0" />}
            {timeCycleMode === 'day' && <Sun className="w-4 h-4 text-amber-300 shrink-0" />}
            {timeCycleMode === 'night' && <Moon className="w-4 h-4 text-sky-300 shrink-0" />}
            <span className="hidden xl:inline capitalize">{timeCycleMode}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onChangeDeviceMode(effectiveMobile ? 'desktop' : 'mobile')
            }
            title={`Switch to ${effectiveMobile ? 'Keyboard' : 'Touch'} controls`}
            aria-label={`Controls: ${effectiveMobile ? 'Touch' : 'Keyboard'}`}
            className="min-h-[44px] px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            {effectiveMobile ? (
              <Smartphone className="w-4 h-4 text-sky-300 shrink-0" />
            ) : (
              <Monitor className="w-4 h-4 text-sky-300 shrink-0" />
            )}
            <span className="hidden lg:inline">
              {effectiveMobile ? 'Touch' : 'Keys'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onChangeSplitOrientation(
                effectiveOrientation === 'side-by-side' ? 'top-bottom' : 'side-by-side'
              )
            }
            title="Switch split-screen layout"
            className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer"
            aria-label="Switch split-screen layout"
          >
            {effectiveOrientation === 'side-by-side' ? (
              <SplitSquareHorizontal className="w-4 h-4 shrink-0" />
            ) : (
              <SplitSquareVertical className="w-4 h-4 shrink-0" />
            )}
            <span className="hidden xl:inline">Split</span>
          </button>

          <button
            type="button"
            onClick={onToggleLofi}
            aria-pressed={lofiEnabled}
            title={lofiEnabled ? 'Turn off music' : 'Turn on music'}
            className={`min-h-[44px] px-2.5 rounded-xl border flex items-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer ${
              lofiEnabled && !muted
                ? 'bg-emerald-950/70 hover:bg-emerald-900/70 border-emerald-500 text-emerald-200'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
            aria-label={lofiEnabled ? 'Turn off music' : 'Turn on music'}
          >
            <Music className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline">Music</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={muted}
            className={`min-h-[44px] px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer ${
              muted
                ? 'bg-red-950/70 hover:bg-red-900/70 border-red-500 text-red-200'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100'
            }`}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          >
            {muted ? <VolumeX className="w-4 h-4 shrink-0" /> : <Volume2 className="w-4 h-4 shrink-0" />}
            <span className="hidden lg:inline">{muted ? 'Muted' : 'Sound'}</span>
          </button>

          <button
            type="button"
            onClick={() => !finished && setShowBriefing(true)}
            aria-pressed={showBriefing}
            className="min-h-[44px] px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer"
            aria-label="Show round instructions"
          >
            <BookOpen className="w-4 h-4 text-sky-300 shrink-0" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          <button
            type="button"
            onClick={() => !finished && !showBriefing && setPaused((p) => !p)}
            aria-pressed={paused}
            disabled={showBriefing}
            className="min-h-[44px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-600 text-white flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer"
            aria-label={paused ? 'Resume game' : 'Pause game'}
          >
            {paused ? <Play className="w-4 h-4 shrink-0" /> : <Pause className="w-4 h-4 shrink-0" />}
            <span className="hidden sm:inline">{paused ? 'Play' : 'Pause'}</span>
          </button>
        </div>
      </header>

      {/* Standard Level Clear Goal Progress Strip */}
      {hud.mode === 'standard' && (
        <div className="shrink-0 bg-slate-900 border-b border-slate-700 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-display font-bold text-white whitespace-nowrap">
            {hud.waterSavedLiters >= level.waterTargetLiters &&
            hud.mealsDonated >= level.mealsTarget ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300">Goal Complete — Keep Scoring for 3 Stars!</span>
              </>
            ) : (
              <>
                <Star className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Goal: Save {level.waterTargetLiters} L &amp; Deliver {level.mealsTarget} Meals
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 flex-1 justify-end">
            <div className="flex items-center gap-2 min-w-[155px]">
              <span className="text-sky-300 font-semibold whitespace-nowrap">Water</span>
              <div className="flex-1 h-2 min-w-[72px] rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-200"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((hud.waterSavedLiters / Math.max(1, level.waterTargetLiters)) * 100)
                    )}%`,
                  }}
                />
              </div>
              <span className="font-mono-tabular font-bold text-slate-100 whitespace-nowrap">
                {hud.waterSavedLiters}/{level.waterTargetLiters}L
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-[155px]">
              <span className="text-amber-300 font-semibold whitespace-nowrap">Meals</span>
              <div className="flex-1 h-2 min-w-[72px] rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-200"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((hud.mealsDonated / Math.max(1, level.mealsTarget)) * 100)
                    )}%`,
                  }}
                />
              </div>
              <span className="font-mono-tabular font-bold text-slate-100 whitespace-nowrap">
                {hud.mealsDonated}/{level.mealsTarget}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Boss Mode HP Bar Strip */}
      {hud.mode === 'boss' && hud.boss && (
        <div className="shrink-0 bg-slate-900 border-b border-slate-700 px-3 sm:px-6 py-2 flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2 shrink-0">
            <Swords
              className={`w-4 h-4 shrink-0 ${
                hud.boss.phase === 2 ? 'text-red-400' : 'text-amber-300'
              }`}
            />
            <span className="font-display text-xs sm:text-sm font-bold text-white whitespace-nowrap">
              {hud.boss.name}
            </span>
            <span className="text-xs font-semibold text-slate-300 whitespace-nowrap hidden sm:inline">
              · {hud.boss.phase === 2 ? 'Phase 2: Overdrive' : 'Phase 1'}
            </span>
          </div>
          <div className="flex-1 h-3 rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                hud.boss.phase === 2 ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, (hud.boss.hp / hud.boss.maxHp) * 100))}%`,
              }}
            />
          </div>
          <span className="font-mono-tabular text-xs sm:text-sm font-bold text-white whitespace-nowrap shrink-0">
            {hud.boss.hp} / {hud.boss.maxHp} HP
          </span>
        </div>
      )}

      {/* Tutorial Mode 5-Step Co-Op Checklist Strip */}
      {hud.mode === 'tutorial' && hud.tutorial && (
        <div className="shrink-0 bg-slate-900 border-b border-slate-700 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs sm:text-sm">
          <span className="font-display font-bold text-sky-300 flex items-center gap-1.5 whitespace-nowrap">
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>Training Steps:</span>
          </span>
          {(
            [
              { done: hud.tutorial.p1Scoop, label: 'P1 Scoop Water [E]' },
              { done: hud.tutorial.p1FixTap, label: 'P1 Fix Tap [R]' },
              { done: hud.tutorial.p1BankTank, label: 'P1 Water Tank' },
              { done: hud.tutorial.p2GrabFood, label: 'P2 Grab Food [1]' },
              { done: hud.tutorial.p2DeliverMeal, label: 'P2 Orphanage / Send [2]' },
            ] as const
          ).map((step) => (
            <span
              key={step.label}
              className={`flex items-center gap-1 whitespace-nowrap font-medium ${
                step.done ? 'text-emerald-300 line-through opacity-80' : 'text-slate-100'
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span>{step.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Main Split-Screen Canvas Arena */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full bg-slate-900 overflow-hidden touch-game-surface"
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Major Event Pop-Up Alert */}
        {hud.majorAlert && !showBriefing && !paused && !finished && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute top-3 left-3 right-3 z-20 flex justify-center"
          >
            <div
              className={`pointer-events-auto max-w-xl w-full sm:w-auto rounded-2xl border-2 px-4 py-3 shadow-2xl flex items-center gap-3 backdrop-blur-md ${
                hud.majorAlert.tone === 'danger'
                  ? 'bg-red-950/95 border-red-400 text-red-50'
                  : hud.majorAlert.tone === 'warning'
                  ? 'bg-amber-950/95 border-amber-400 text-amber-50'
                  : hud.majorAlert.tone === 'success'
                  ? 'bg-emerald-950/95 border-emerald-400 text-emerald-50'
                  : 'bg-slate-900/95 border-sky-400 text-sky-50'
              }`}
            >
              <div className="shrink-0">
                {(hud.majorAlert.tone === 'danger' || hud.majorAlert.tone === 'warning') && (
                  <AlertTriangle
                    className={`w-6 h-6 ${
                      hud.majorAlert.tone === 'danger' ? 'text-red-300' : 'text-amber-300'
                    }`}
                  />
                )}
                {hud.majorAlert.tone === 'success' && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                )}
                {hud.majorAlert.tone === 'info' && (
                  <Info className="w-6 h-6 text-sky-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-base sm:text-lg font-extrabold leading-tight">
                  {hud.majorAlert.title}
                </div>
                <div className="text-sm font-medium opacity-95 leading-snug">
                  {hud.majorAlert.message}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.dismissMajorAlert();
                  if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
                }}
                aria-label="Close alert"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-black/25 hover:bg-black/45 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Active Mystery Pickup Effects Strip */}
        {hud.activePickupEffects.length > 0 && !showBriefing && !paused && !finished && (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex flex-wrap justify-center gap-2">
            {hud.activePickupEffects.map((eff) => (
              <div
                key={eff.id}
                className={`rounded-xl border px-3 py-1.5 shadow-lg backdrop-blur-md flex items-center gap-2 text-xs sm:text-sm font-bold ${
                  eff.polarity === 'good'
                    ? 'bg-emerald-950/92 border-emerald-400 text-emerald-100'
                    : 'bg-rose-950/92 border-rose-400 text-rose-100'
                }`}
              >
                <Gift className="w-4 h-4 shrink-0" />
                <span>
                  {eff.targetPlayer === 'all' ? 'All' : `P${eff.targetPlayer}`} · {eff.name}
                </span>
                <span className="font-mono-tabular opacity-90">
                  {Math.ceil(eff.remainingSec)}s
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pre-Round Level & Instructions Briefing Modal */}
        {showBriefing && !finished && (
          <div
            className="absolute inset-0 z-30 bg-slate-950/88 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="briefing-title"
          >
            <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border-2 border-slate-600 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Header: Which level you are on */}
              <div className="px-5 py-4 sm:px-6 border-b border-slate-700 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-sky-300">
                    <span>
                      {level.mode === 'tutorial'
                        ? 'Interactive Co-Op Tutorial'
                        : level.mode === 'boss'
                        ? 'Special Boss Battle'
                        : `Level ${level.number} of 4`}
                    </span>
                    <span>·</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-600 text-white">
                      {level.difficulty}
                    </span>
                  </div>
                  <h2 id="briefing-title" className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
                    {level.name}
                  </h2>
                  <p className="text-sm sm:text-base text-slate-200 mt-0.5">
                    {level.description}
                  </p>
                </div>
              </div>

              {/* Scrollable Body: Goals, Controls, and Important Stuff */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
                {/* Round Goals */}
                {level.mode === 'boss' ? (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3">
                      <div className="text-xs sm:text-sm font-semibold text-slate-200">Boss Target</div>
                      <div className="font-mono-tabular text-lg sm:text-xl font-bold text-red-300 mt-0.5">
                        140 HP
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3">
                      <div className="text-xs sm:text-sm font-semibold text-slate-200">How to Strike</div>
                      <div className="font-mono-tabular text-sm sm:text-base font-bold text-amber-300 mt-1">
                        Fix, Tank &amp; Meals
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3">
                      <div className="text-xs sm:text-sm font-semibold text-slate-200">Time Limit</div>
                      <div className="font-mono-tabular text-lg sm:text-xl font-bold text-white mt-0.5">
                        {level.durationSeconds}s
                      </div>
                    </div>
                  </div>
                ) : level.mode === 'tutorial' ? (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3">
                      <div className="text-xs sm:text-sm font-semibold text-slate-200">P1 Tasks</div>
                      <div className="font-mono-tabular text-base sm:text-lg font-bold text-sky-300 mt-0.5">
                        Scoop · Fix · Tank
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3">
                      <div className="text-xs sm:text-sm font-semibold text-slate-200">P2 Tasks</div>
                      <div className="font-mono-tabular text-base sm:text-lg font-bold text-amber-300 mt-0.5">
                        Grab · Orphanage
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3">
                      <div className="text-xs sm:text-sm font-semibold text-slate-200">Safe Practice</div>
                      <div className="font-mono-tabular text-base sm:text-lg font-bold text-emerald-300 mt-0.5">
                        No KO Risk
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3">
                      <div className="text-xs sm:text-sm font-semibold text-slate-200">Water Goal</div>
                      <div className="font-mono-tabular text-lg sm:text-xl font-bold text-sky-300 mt-0.5">
                        {level.waterTargetLiters} L
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3">
                      <div className="text-xs sm:text-sm font-semibold text-slate-200">Meals Goal</div>
                      <div className="font-mono-tabular text-lg sm:text-xl font-bold text-amber-300 mt-0.5">
                        {level.mealsTarget} Meals
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3">
                      <div className="text-xs sm:text-sm font-semibold text-slate-200">Round Time</div>
                      <div className="font-mono-tabular text-lg sm:text-xl font-bold text-white mt-0.5">
                        {level.durationSeconds}s
                      </div>
                    </div>
                  </div>
                )}

                {/* Controls for Both Players */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-sky-950/35 border border-sky-700/70 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-display text-lg font-bold text-sky-300">
                      <Droplets className="w-5 h-5 shrink-0" />
                      <span>P1 · {p1Custom.name} (Water)</span>
                    </div>
                    <ul className="space-y-1.5 text-sm text-slate-100 leading-snug">
                      <li>
                        <strong>Move:</strong>{' '}
                        {effectiveMobile ? 'Left Touch Pad' : 'W, A, S, D keys'}
                      </li>
                      <li>
                        <strong>Scoop {effectiveMobile ? 'Button' : '[E]'}:</strong> Pick up spilled water puddles
                      </li>
                      <li>
                        <strong>Fix Tap {effectiveMobile ? 'Button' : '[R]'}:</strong> Stop leaking taps (7 fixed = +25 HP)
                      </li>
                      <li>
                        <strong>Water Tank:</strong> Walk inside to get +50% extra water &amp; +14 HP
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-xl bg-amber-950/35 border border-amber-700/70 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-display text-lg font-bold text-amber-300">
                      <Utensils className="w-5 h-5 shrink-0" />
                      <span>P2 · {p2Custom.name} (Food)</span>
                    </div>
                    <ul className="space-y-1.5 text-sm text-slate-100 leading-snug">
                      <li>
                        <strong>Move:</strong>{' '}
                        {effectiveMobile ? 'Right Touch Pad' : 'Arrow keys (↑ ↓ ← →)'}
                      </li>
                      <li>
                        <strong>Grab {effectiveMobile ? 'Button' : '[1]'}:</strong> Pick up fresh food before it spoils
                      </li>
                      <li>
                        <strong>Send Meals {effectiveMobile ? 'Button' : '[2]'}:</strong> Fly food straight to the Orphanage
                      </li>
                      <li>
                        <strong>Orphanage Zone:</strong> Walk inside to give carried meals (+14 HP)
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Active Mystery Box Effect in Briefing */}
                {activeMysteryModifier && level.mode !== 'tutorial' && (
                  <div className="rounded-xl bg-slate-950/90 border border-slate-700 p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-display text-base font-bold text-white">
                        {activeMysteryModifier.polarity === 'easier' ? (
                          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <Flame className="w-5 h-5 text-amber-400 shrink-0" />
                        )}
                        <span>
                          Mystery Box Active: {activeMysteryModifier.name} (
                          {activeMysteryModifier.polarity === 'easier' ? 'Easier' : 'Harder'})
                        </span>
                      </div>
                      <span className="font-mono-tabular text-xs font-semibold text-sky-300">
                        {formatCountdown(mysteryRemainingMs)} remaining
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">{activeMysteryModifier.headline}</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300">
                      {activeMysteryModifier.effectsSummary.map((eff) => (
                        <li key={eff}>· {eff}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Important Safety & Tips */}
                <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-4 space-y-2 text-sm text-slate-100 leading-relaxed">
                  <div className="font-display text-base font-bold text-amber-300">
                    Important Things to Know
                  </div>
                  <p>
                    <strong className="text-red-300">Stay Safe:</strong> Keep away from spraying{' '}
                    <strong>Big Leaks</strong> and <strong>green spoiled food clouds</strong>—they hurt your health!
                  </p>
                  <p>
                    <strong className="text-purple-300">Mystery Boxes [?]:</strong> Walk over glowing{' '}
                    <strong>[?]</strong> crates in the arena to reveal a hidden random{' '}
                    <strong>Good</strong> boost or <strong>Bad</strong> trap!
                  </p>
                  <p>
                    <strong className="text-emerald-300">Helpful Guides:</strong> Dashed rings glow around items you can grab or fix, and important alerts will pop up at the top of the screen.
                  </p>
                </div>

                {/* Quick Comfort & Controls Toggles */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onToggleSeniorMode}
                    aria-pressed={seniorMode}
                    className={`min-h-[46px] px-4 py-2 rounded-xl border-2 text-sm font-semibold flex items-center gap-2 cursor-pointer ${
                      seniorMode
                        ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                        : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <Eye className="w-4 h-4 shrink-0" />
                    <span>Easy Mode: {seniorMode ? 'On' : 'Off'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onChangeDeviceMode(effectiveMobile ? 'desktop' : 'mobile')
                    }
                    className="min-h-[46px] px-4 py-2 rounded-xl bg-slate-950 border-2 border-slate-700 hover:border-slate-500 text-slate-200 text-sm font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    {effectiveMobile ? (
                      <Smartphone className="w-4 h-4 text-sky-300 shrink-0" />
                    ) : (
                      <Monitor className="w-4 h-4 text-sky-300 shrink-0" />
                    )}
                    <span>Controls: {effectiveMobile ? 'Touch Pads' : 'Keyboard'}</span>
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-4 sm:px-6 border-t border-slate-700 bg-slate-950/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onExitToLobby}
                  className="min-h-[50px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-semibold text-base cursor-pointer"
                >
                  Back to Menu
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    soundFx.playTapFix();
                    setShowBriefing(false);
                  }}
                  className="min-h-[54px] px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg flex items-center justify-center gap-2.5 shadow-lg cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    {level.mode === 'tutorial'
                      ? 'Start Training'
                      : level.mode === 'boss'
                      ? 'Fight Boss'
                      : `Start Level ${level.number}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pause Modal */}
        {paused && !finished && !showBriefing && (
          <div
            className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Game Paused"
          >
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border-2 border-slate-700 p-6 text-center space-y-5 shadow-2xl">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  Game Paused
                </h2>
                <p className="text-sm text-slate-200 mt-1">
                  {level.mode === 'tutorial'
                    ? `Tutorial · ${level.name}`
                    : level.mode === 'boss'
                    ? `Boss Mode · ${level.name}`
                    : `Level ${level.number} · ${level.name}`}
                </p>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPaused(false)}
                  className="w-full min-h-[52px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Keep Playing</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaused(false);
                    setShowBriefing(true);
                  }}
                  className="w-full min-h-[52px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-5 h-5" />
                  <span>View Instructions</span>
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full min-h-[52px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Restart Level</span>
                </button>
                <button
                  type="button"
                  onClick={onExitToLobby}
                  className="w-full min-h-[52px] rounded-xl bg-slate-950 hover:bg-slate-800 border-2 border-slate-700 text-slate-100 font-semibold text-base cursor-pointer"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Round Summary / Completion Modal */}
        {finished && (
          <div
            className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Round Summary"
          >
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border-2 border-slate-700 p-6 space-y-5 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-9 h-9 ${
                        s <= earnedStars
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  {hud.gameOverReason === 'boss_defeated'
                    ? 'Boss Defeated!'
                    : hud.gameOverReason === 'tutorial_complete'
                    ? 'Training Complete!'
                    : hud.gameOverReason === 'health'
                    ? 'Out of Health'
                    : hud.mode === 'boss'
                    ? 'Boss Escaped!'
                    : earnedStars >= 2
                    ? 'Great Teamwork!'
                    : "Time's Up!"}
                </h2>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {hud.gameOverReason === 'boss_defeated'
                    ? 'You shut down Mega-Wastelord MK-II with combined water & food teamwork!'
                    : hud.gameOverReason === 'tutorial_complete'
                    ? 'Both players mastered every EcoSplit skill. Ready for Level 1!'
                    : hud.gameOverReason === 'health'
                    ? 'Stay away from big pipe splashes, boss slams, and bad food clouds!'
                    : hud.mode === 'boss'
                    ? `Mega-Wastelord had ${hud.boss?.hp ?? 0} HP remaining. Try again!`
                    : `Level ${level.number} · ${level.name}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3.5">
                  <div className="text-sm text-sky-300 font-semibold">
                    P1 · {p1Custom.name} · {hud.p1Health} HP
                  </div>
                  <div className="font-mono-tabular text-xl font-bold text-white mt-1">
                    {hud.waterSavedLiters} L Saved
                  </div>
                  <div className="text-sm text-slate-200 mt-0.5">
                    {hud.tapsFixed} taps fixed · {hud.p1Score} pts
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950/80 border border-slate-700 p-3.5">
                  <div className="text-sm text-amber-300 font-semibold">
                    P2 · {p2Custom.name} · {hud.p2Health} HP
                  </div>
                  <div className="font-mono-tabular text-xl font-bold text-white mt-1">
                    {hud.mealsDonated} Meals
                  </div>
                  <div className="text-sm text-slate-200 mt-0.5">
                    Given to Orphanage · {hud.p2Score} pts
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/70 border border-slate-700 px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="text-slate-200 font-medium">Team Score</span>
                  {hud.mysteryBoxesCollected > 0 && (
                    <span className="ml-2 text-xs text-purple-300 font-semibold">
                      · {hud.mysteryBoxesCollected} Mystery Box{hud.mysteryBoxesCollected > 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
                <span className="font-mono-tabular text-lg font-bold text-emerald-300">
                  {hud.teamScore} pts
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex-1 min-h-[50px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Play Again</span>
                </button>
                {hasNextLevel ? (
                  <button
                    type="button"
                    onClick={onNextLevel}
                    className="flex-1 min-h-[50px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Next Level</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onExitToLobby}
                    className="flex-1 min-h-[50px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base cursor-pointer"
                  >
                    Back to Menu
                  </button>
                )}
              </div>
              {hasNextLevel && (
                <button
                  type="button"
                  onClick={onExitToLobby}
                  className="w-full min-h-[46px] py-2 text-sm font-semibold text-slate-200 hover:text-white cursor-pointer"
                >
                  Back to Menu
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Deck (Mobile Touch Joysticks + Buttons OR Desktop Hybrid Deck) */}
      <TouchControlsDeck
        isMobileMode={effectiveMobile}
        p1Name={p1Custom.name}
        p2Name={p2Custom.name}
        p1Hint={hud.p1NearbyHint}
        p2Hint={hud.p2NearbyHint}
        p1Health={hud.p1Health}
        p2Health={hud.p2Health}
        p1TapsFixed={hud.tapsFixed}
        p1CarryingLiters={hud.waterCarryingLiters}
        p2CarryingFood={hud.foodCarryingCount}
        p1CanScoop={hud.p1CanScoop}
        p1CanFixTap={hud.p1CanFixTap}
        p2CanGrab={hud.p2CanGrab}
        p2CanSend={hud.p2CanSend}
        onP1Move={(v) => {
          touchMoveP1Ref.current = v;
        }}
        onP2Move={(v) => {
          touchMoveP2Ref.current = v;
        }}
        onP1CollectWater={() => {
          pendingActionsRef.current.p1Action1 = true;
        }}
        onP1FixTap={() => {
          pendingActionsRef.current.p1Action2 = true;
        }}
        onP2CollectFood={() => {
          pendingActionsRef.current.p2Action1 = true;
        }}
        onP2ReuseFood={() => {
          pendingActionsRef.current.p2Action2 = true;
        }}
      />
    </div>
  );
};
