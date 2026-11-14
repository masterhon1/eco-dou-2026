import { useCallback, useEffect, useState } from 'react';
import { PlayerCustomizeModal } from './components/CharacterPreview';
import { GameView } from './components/GameView';
import { LobbyScreen } from './components/LobbyScreen';
import { Maze3DView } from './components/Maze3DView';
import { MysteryLogView } from './components/MysteryLogView';
import { soundFx } from './game/audio';
import {
  DEFAULT_P1_CUSTOM,
  DEFAULT_P2_CUSTOM,
  LEVELS,
} from './game/levels';
import {
  clearMysteryBoxLog,
  openDailyMysteryBox,
  ResolvedMysteryBoxStatus,
  syncMysteryBoxLifecycle,
} from './game/mysteryBox';
import {
  DeviceMode,
  GameScreenState,
  LevelConfig,
  LevelStatsRecord,
  MysteryBoxLogEntry,
  PlayerCustomization,
  SplitOrientation,
  TimeCycleMode,
} from './game/types';

const STORAGE_KEY_P1 = 'ecosplit_p1_custom_v1';
const STORAGE_KEY_P2 = 'ecosplit_p2_custom_v1';
const STORAGE_KEY_RECORDS = 'ecosplit_level_records_v1';
const STORAGE_KEY_PREFS = 'ecosplit_display_prefs_v1';
const STORAGE_KEY_MAZE3D = 'ecosplit_maze3d_record_v1';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export default function App() {
  const [screen, setScreen] = useState<GameScreenState>(() =>
    typeof window !== 'undefined' && window.location.hash === '#mystery-log'
      ? 'MYSTERY_LOG'
      : 'TITLE_MENU'
  );
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig>(LEVELS[0]);
  const [editingPlayer, setEditingPlayer] = useState<1 | 2 | null>(null);

  const [mysteryData, setMysteryData] = useState<{
    status: ResolvedMysteryBoxStatus;
    log: MysteryBoxLogEntry[];
  }>(() => {
    const synced = syncMysteryBoxLifecycle();
    return { status: synced.status, log: synced.log };
  });

  const [p1Custom, setP1Custom] = useState<PlayerCustomization>(() =>
    loadJson(STORAGE_KEY_P1, DEFAULT_P1_CUSTOM)
  );
  const [p2Custom, setP2Custom] = useState<PlayerCustomization>(() =>
    loadJson(STORAGE_KEY_P2, DEFAULT_P2_CUSTOM)
  );

  const [prefs, setPrefs] = useState<{
    deviceMode: DeviceMode;
    splitOrientation: SplitOrientation;
    timeCycleMode: TimeCycleMode;
    muted: boolean;
    lofiMusic: boolean;
    seniorMode: boolean;
  }>(() =>
    loadJson(STORAGE_KEY_PREFS, {
      deviceMode: 'auto',
      splitOrientation: 'auto',
      timeCycleMode: 'cycle',
      muted: false,
      lofiMusic: true,
      seniorMode: false,
    })
  );

  const [levelRecords, setLevelRecords] = useState<
    Record<string, LevelStatsRecord>
  >(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [maze3dRecord, setMaze3dRecord] = useState<{
    bestTimeSec: number | null;
    bestStars: number;
  }>(() =>
    loadJson(STORAGE_KEY_MAZE3D, {
      bestTimeSec: null,
      bestStars: 0,
    })
  );

  // Live 1s heartbeat for Mystery Box 3-hour countdown, expiration, and daily reset
  useEffect(() => {
    const refresh = () => {
      const synced = syncMysteryBoxLifecycle();
      setMysteryData({ status: synced.status, log: synced.log });
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Sync URL hash for direct access to the external log view
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#mystery-log') {
        setScreen((prev) => (prev === 'PLAYING' ? prev : 'MYSTERY_LOG'));
      } else if (screen === 'MYSTERY_LOG') {
        setScreen('TITLE_MENU');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [screen]);

  const navigateToExternalLog = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.hash !== '#mystery-log') {
      window.history.replaceState(null, '', '#mystery-log');
    }
    setScreen('MYSTERY_LOG');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const navigateToHome = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#mystery-log') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setScreen('TITLE_MENU');
  }, []);

  const handleOpenMysteryBox = useCallback(() => {
    soundFx.unlockAndStartMusic();
    const res = openDailyMysteryBox();
    if (res.opened && res.modifier) {
      soundFx.playMysteryBoxOpen(res.modifier.polarity);
    }
    setMysteryData({ status: res.status, log: res.log });
  }, []);

  const handleClearMysteryLog = useCallback(() => {
    const nextLog = clearMysteryBoxLog();
    setMysteryData((prev) => ({ ...prev, log: nextLog }));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_P1, JSON.stringify(p1Custom));
    } catch {
      // ignore storage errors
    }
  }, [p1Custom]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_P2, JSON.stringify(p2Custom));
    } catch {
      // ignore storage errors
    }
  }, [p2Custom]);

  useEffect(() => {
    soundFx.setMuted(prefs.muted);
    soundFx.setMusicEnabled(prefs.lofiMusic);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('senior-mode', prefs.seniorMode);
    }
    try {
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
    } catch {
      // ignore storage errors
    }
  }, [prefs]);

  useEffect(() => {
    const unlockAudio = () => {
      if (prefs.lofiMusic && !prefs.muted) {
        soundFx.unlockAndStartMusic();
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [prefs.lofiMusic, prefs.muted]);

  const handleLevelComplete = useCallback(
    (
      levelId: string,
      score: number,
      stars: number,
      waterL: number,
      meals: number
    ) => {
      setLevelRecords((prev) => {
        const current = prev[levelId];
        const updated: Record<string, LevelStatsRecord> = {
          ...prev,
          [levelId]: {
            bestScore: Math.max(current?.bestScore ?? 0, score),
            stars: Math.max(current?.stars ?? 0, stars),
            bestWaterLiters: Math.max(current?.bestWaterLiters ?? 0, waterL),
            bestMealsDonated: Math.max(current?.bestMealsDonated ?? 0, meals),
          },
        };
        try {
          localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updated));
        } catch {
          // ignore storage errors
        }
        return updated;
      });
    },
    []
  );

  const currentIdx = LEVELS.findIndex((l) => l.id === selectedLevel.id);
  const hasNextLevel =
    selectedLevel.mode === 'tutorial' ||
    (currentIdx >= 0 && currentIdx < LEVELS.length - 1);

  const handleNextLevel = () => {
    if (selectedLevel.mode === 'tutorial') {
      setSelectedLevel(LEVELS[0]);
      return;
    }
    if (currentIdx >= 0 && currentIdx < LEVELS.length - 1) {
      setSelectedLevel(LEVELS[currentIdx + 1]);
    }
  };

  const handleLaunchLevel = useCallback((lvl: LevelConfig) => {
    setSelectedLevel(lvl);
    soundFx.unlockAndStartMusic();
    setScreen('PLAYING');
  }, []);

  const handleLaunchMaze3D = useCallback(() => {
    soundFx.unlockAndStartMusic();
    setScreen('MAZE_3D');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleMaze3DComplete = useCallback(
    (elapsedSec: number, _resourcesCollected: number, stars: number) => {
      setMaze3dRecord((prev) => {
        const nextBestTime =
          prev.bestTimeSec === null ? elapsedSec : Math.min(prev.bestTimeSec, elapsedSec);
        const updated = {
          bestTimeSec: nextBestTime,
          bestStars: Math.max(prev.bestStars, stars),
        };
        try {
          localStorage.setItem(STORAGE_KEY_MAZE3D, JSON.stringify(updated));
        } catch {
          // ignore storage errors
        }
        return updated;
      });
    },
    []
  );

  const activeModifier =
    mysteryData.status.phase === 'ACTIVE' ? mysteryData.status.activeModifier : null;

  return (
    <>
      {screen === 'TITLE_MENU' ? (
        <LobbyScreen
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          p1Custom={p1Custom}
          p2Custom={p2Custom}
          onEditPlayer={(idx) => setEditingPlayer(idx)}
          deviceMode={prefs.deviceMode}
          onChangeDeviceMode={(deviceMode) =>
            setPrefs((p) => ({ ...p, deviceMode }))
          }
          splitOrientation={prefs.splitOrientation}
          onChangeSplitOrientation={(splitOrientation) =>
            setPrefs((p) => ({ ...p, splitOrientation }))
          }
          timeCycleMode={prefs.timeCycleMode}
          onChangeTimeCycleMode={(timeCycleMode) =>
            setPrefs((p) => ({ ...p, timeCycleMode }))
          }
          muted={prefs.muted}
          onToggleMute={() => setPrefs((p) => ({ ...p, muted: !p.muted }))}
          lofiEnabled={prefs.lofiMusic}
          onToggleLofi={() => setPrefs((p) => ({ ...p, lofiMusic: !p.lofiMusic }))}
          seniorMode={prefs.seniorMode}
          onToggleSeniorMode={() =>
            setPrefs((p) => ({ ...p, seniorMode: !p.seniorMode }))
          }
          levelRecords={levelRecords}
          mysteryStatus={mysteryData.status}
          mysteryLogCount={mysteryData.log.length}
          mazeBestTimeSec={maze3dRecord.bestTimeSec}
          mazeBestStars={maze3dRecord.bestStars}
          onOpenMysteryBox={handleOpenMysteryBox}
          onOpenMysteryLog={navigateToExternalLog}
          onLaunchLevel={handleLaunchLevel}
          onLaunchMaze3D={handleLaunchMaze3D}
          onStartGame={() => {
            soundFx.unlockAndStartMusic();
            setScreen('PLAYING');
          }}
        />
      ) : screen === 'MYSTERY_LOG' ? (
        <MysteryLogView
          entries={mysteryData.log}
          status={mysteryData.status}
          onBackHome={navigateToHome}
          onClearLog={handleClearMysteryLog}
        />
      ) : screen === 'MAZE_3D' ? (
        <Maze3DView
          p1Custom={p1Custom}
          deviceMode={prefs.deviceMode}
          muted={prefs.muted}
          onToggleMute={() => setPrefs((p) => ({ ...p, muted: !p.muted }))}
          onExitToLobby={navigateToHome}
          onMazeComplete={handleMaze3DComplete}
        />
      ) : (
        <GameView
          key={selectedLevel.id}
          level={selectedLevel}
          hasNextLevel={hasNextLevel}
          p1Custom={p1Custom}
          p2Custom={p2Custom}
          deviceMode={prefs.deviceMode}
          onChangeDeviceMode={(deviceMode) =>
            setPrefs((p) => ({ ...p, deviceMode }))
          }
          splitOrientation={prefs.splitOrientation}
          onChangeSplitOrientation={(splitOrientation) =>
            setPrefs((p) => ({ ...p, splitOrientation }))
          }
          timeCycleMode={prefs.timeCycleMode}
          onChangeTimeCycleMode={(timeCycleMode) =>
            setPrefs((p) => ({ ...p, timeCycleMode }))
          }
          muted={prefs.muted}
          onToggleMute={() => setPrefs((p) => ({ ...p, muted: !p.muted }))}
          lofiEnabled={prefs.lofiMusic}
          onToggleLofi={() => setPrefs((p) => ({ ...p, lofiMusic: !p.lofiMusic }))}
          seniorMode={prefs.seniorMode}
          onToggleSeniorMode={() =>
            setPrefs((p) => ({ ...p, seniorMode: !p.seniorMode }))
          }
          activeMysteryModifier={activeModifier}
          mysteryRemainingMs={mysteryData.status.activeRemainingMs}
          onExitToLobby={navigateToHome}
          onNextLevel={handleNextLevel}
          onLevelComplete={handleLevelComplete}
        />
      )}

      {editingPlayer !== null && (
        <PlayerCustomizeModal
          playerIndex={editingPlayer}
          value={editingPlayer === 1 ? p1Custom : p2Custom}
          onChange={(next) => {
            if (editingPlayer === 1) setP1Custom(next);
            else setP2Custom(next);
          }}
          onClose={() => setEditingPlayer(null)}
        />
      )}
    </>
  );
}
