import {
  MysteryBoxLogEntry,
  MysteryBoxModifier,
  MysteryBoxStorageState,
} from './types';

export const MYSTERY_BOX_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
export const MYSTERY_BOX_DURATION_HOURS = 3;

const STORAGE_KEY_MYSTERY_STATE = 'ecosplit_mystery_box_state_v1';
const STORAGE_KEY_MYSTERY_LOG = 'ecosplit_mystery_box_log_v1';

export const MYSTERY_BOX_MODIFIERS: MysteryBoxModifier[] = [
  {
    id: 'turbo-boots',
    name: 'Swift Stride',
    polarity: 'easier',
    headline: '25% Faster Movement & Wider Reach',
    description:
      'Both players sprint across the arena with lightweight boots and extra action range for 3 hours.',
    effectsSummary: [
      '+25% player movement speed',
      '+15% scoop, grab, and tap-repair reach',
    ],
    speedMultiplier: 1.25,
    reachMultiplier: 1.15,
    tapLeakIntervalMultiplier: 1,
    burstTimeMultiplier: 1,
    foodSpoilDurationMultiplier: 1,
    puddleEvapMultiplier: 1,
    p1TankBonus: 0,
    p2BagBonus: 0,
    maxHealthBonus: 0,
    hazardDamageMultiplier: 1,
    nightDarknessBoost: 0,
    scoreMultiplier: 1,
  },
  {
    id: 'gentle-taps',
    name: 'Steady Valves',
    polarity: 'easier',
    headline: 'Slower Pipe Leaks & Delayed Bursts',
    description:
      'Reinforced brass gaskets keep taps from leaking as often and delay high-pressure pipe sprays.',
    effectsSummary: [
      '35% longer intervals between new tap leaks',
      '50% longer before dripping taps burst',
    ],
    speedMultiplier: 1,
    reachMultiplier: 1,
    tapLeakIntervalMultiplier: 1.35,
    burstTimeMultiplier: 1.5,
    foodSpoilDurationMultiplier: 1,
    puddleEvapMultiplier: 1,
    p1TankBonus: 0,
    p2BagBonus: 0,
    maxHealthBonus: 0,
    hazardDamageMultiplier: 1,
    nightDarknessBoost: 0,
    scoreMultiplier: 1,
  },
  {
    id: 'crisp-harvest',
    name: 'Fresh Reserve',
    polarity: 'easier',
    headline: 'Longer Freshness & Larger Food Bag',
    description:
      'Insulated crates keep surplus meals fresh far longer and let Player 2 carry 2 extra meals.',
    effectsSummary: [
      '+45% longer food freshness before spoiling',
      'Player 2 carries up to 7 meal crates (from 5)',
    ],
    speedMultiplier: 1,
    reachMultiplier: 1,
    tapLeakIntervalMultiplier: 1,
    burstTimeMultiplier: 1,
    foodSpoilDurationMultiplier: 1.45,
    puddleEvapMultiplier: 1,
    p1TankBonus: 0,
    p2BagBonus: 2,
    maxHealthBonus: 0,
    hazardDamageMultiplier: 1,
    nightDarknessBoost: 0,
    scoreMultiplier: 1,
  },
  {
    id: 'eco-shield',
    name: 'Guardian Aura',
    polarity: 'easier',
    headline: '125 Max HP, 40% Less Damage & +20% Score',
    description:
      'Protective eco-gear cushions splashes and spoilage clouds while boosting team points.',
    effectsSummary: [
      '125 starting Max Health for both players',
      '40% less hazard damage & +20% team score',
    ],
    speedMultiplier: 1,
    reachMultiplier: 1,
    tapLeakIntervalMultiplier: 1,
    burstTimeMultiplier: 1,
    foodSpoilDurationMultiplier: 1,
    puddleEvapMultiplier: 1,
    p1TankBonus: 0,
    p2BagBonus: 0,
    maxHealthBonus: 25,
    hazardDamageMultiplier: 0.6,
    nightDarknessBoost: 0,
    scoreMultiplier: 1.2,
  },
  {
    id: 'pressure-surge',
    name: 'Pressure Surge',
    polarity: 'harder',
    headline: 'Rapid Pipe Leaks & +25% Score Bonus',
    description:
      'Surging city water mains trigger leaks faster and burst sooner—rewarding skilled teamwork with +25% score.',
    effectsSummary: [
      '28% faster tap leak spawns & quicker bursts',
      '+25% team score multiplier for all actions',
    ],
    speedMultiplier: 1,
    reachMultiplier: 1,
    tapLeakIntervalMultiplier: 0.72,
    burstTimeMultiplier: 0.68,
    foodSpoilDurationMultiplier: 1,
    puddleEvapMultiplier: 1,
    p1TankBonus: 0,
    p2BagBonus: 0,
    maxHealthBonus: 0,
    hazardDamageMultiplier: 1,
    nightDarknessBoost: 0,
    scoreMultiplier: 1.25,
  },
  {
    id: 'heatwave',
    name: 'Midday Heatwave',
    polarity: 'harder',
    headline: 'Faster Evaporation & Spoilage (+25% Score)',
    description:
      'High temperatures dry puddles sooner and spoil unattended food faster. Quick pickups earn +25% score.',
    effectsSummary: [
      '25% faster food spoilage & earlier puddle drying',
      '+25% team score multiplier for quick saves',
    ],
    speedMultiplier: 1,
    reachMultiplier: 1,
    tapLeakIntervalMultiplier: 1,
    burstTimeMultiplier: 1,
    foodSpoilDurationMultiplier: 0.75,
    puddleEvapMultiplier: 0.72,
    p1TankBonus: 0,
    p2BagBonus: 0,
    maxHealthBonus: 0,
    hazardDamageMultiplier: 1,
    nightDarknessBoost: 0,
    scoreMultiplier: 1.25,
  },
  {
    id: 'twilight-fog',
    name: 'Heavy Twilight',
    polarity: 'harder',
    headline: 'Dimmer Dusk Lighting & +25% Hazard Damage',
    description:
      'Thick evening mist dims visibility and makes pipe sprays and mold clouds hit harder.',
    effectsSummary: [
      'Dimmer twilight & night lighting across the map',
      '+25% hazard damage from sprays and spoilage',
    ],
    speedMultiplier: 1,
    reachMultiplier: 1,
    tapLeakIntervalMultiplier: 1,
    burstTimeMultiplier: 1,
    foodSpoilDurationMultiplier: 1,
    puddleEvapMultiplier: 1,
    p1TankBonus: 0,
    p2BagBonus: 0,
    maxHealthBonus: 0,
    hazardDamageMultiplier: 1.25,
    nightDarknessBoost: 0.14,
    scoreMultiplier: 1,
  },
  {
    id: 'compact-pack',
    name: 'Light Packs',
    polarity: 'harder',
    headline: 'Smaller Carry Capacity, +10% Speed',
    description:
      'Compact gear limits P1 to 40L and P2 to 3 meals per trip, forcing brisk routes to the tank and orphanage.',
    effectsSummary: [
      'P1 Water Tank capped at 40L (from 60L), P2 Bag at 3 meals (from 5)',
      '+10% brisk movement speed compensation',
    ],
    speedMultiplier: 1.1,
    reachMultiplier: 1,
    tapLeakIntervalMultiplier: 1,
    burstTimeMultiplier: 1,
    foodSpoilDurationMultiplier: 1,
    puddleEvapMultiplier: 1,
    p1TankBonus: -20,
    p2BagBonus: -2,
    maxHealthBonus: 0,
    hazardDamageMultiplier: 1,
    nightDarknessBoost: 0,
    scoreMultiplier: 1,
  },
];

export function getModifierById(id: string | null | undefined): MysteryBoxModifier | null {
  if (!id) return null;
  return MYSTERY_BOX_MODIFIERS.find((m) => m.id === id) ?? null;
}

export function getLocalDayKey(ms: number = Date.now()): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getNextLocalMidnightMs(ms: number = Date.now()): number {
  const d = new Date(ms);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function loadMysteryBoxState(): MysteryBoxStorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MYSTERY_STATE);
    if (!raw) {
      return {
        lastOpenedDayKey: null,
        lastResetDayKey: null,
        activeEntry: null,
      };
    }
    const parsed = JSON.parse(raw) as Partial<MysteryBoxStorageState>;
    return {
      lastOpenedDayKey: parsed.lastOpenedDayKey ?? null,
      lastResetDayKey: parsed.lastResetDayKey ?? null,
      activeEntry: parsed.activeEntry ?? null,
    };
  } catch {
    return {
      lastOpenedDayKey: null,
      lastResetDayKey: null,
      activeEntry: null,
    };
  }
}

export function saveMysteryBoxState(state: MysteryBoxStorageState): void {
  try {
    localStorage.setItem(STORAGE_KEY_MYSTERY_STATE, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function loadMysteryBoxLog(): MysteryBoxLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MYSTERY_LOG);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMysteryBoxLog(entries: MysteryBoxLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MYSTERY_LOG, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

export type MysteryBoxPhase = 'READY' | 'ACTIVE' | 'COOLDOWN_TODAY';

export interface ResolvedMysteryBoxStatus {
  phase: MysteryBoxPhase;
  activeModifier: MysteryBoxModifier | null;
  activeRemainingMs: number;
  resetRemainingMs: number;
  openedAt: number | null;
  expiresAt: number | null;
  currentDayKey: string;
}

/**
 * Evaluates current state against current time, automatically recording EXPIRED
 * and DAILY_RESET events in the external log when transitions occur.
 */
export function syncMysteryBoxLifecycle(now: number = Date.now()): {
  state: MysteryBoxStorageState;
  log: MysteryBoxLogEntry[];
  status: ResolvedMysteryBoxStatus;
} {
  let state = loadMysteryBoxState();
  let log = loadMysteryBoxLog();
  let stateChanged = false;
  let logChanged = false;
  const currentDayKey = getLocalDayKey(now);

  // 1. Check if an active 3-hour window has expired
  if (state.activeEntry && now >= state.activeEntry.expiresAt) {
    if (!state.activeEntry.expiredLogged) {
      const mod = getModifierById(state.activeEntry.modifierId);
      log = [
        {
          id: `log-exp-${state.activeEntry.rollId}`,
          eventType: 'EXPIRED',
          timestamp: state.activeEntry.expiresAt,
          dayKey: getLocalDayKey(state.activeEntry.expiresAt),
          modifierId: state.activeEntry.modifierId,
          modifierName: mod?.name ?? state.activeEntry.modifierId,
          polarity: state.activeEntry.polarity,
          durationHours: MYSTERY_BOX_DURATION_HOURS,
          expiresAt: state.activeEntry.expiresAt,
          summary: `${mod?.name ?? 'Mystery Modifier'} 3-hour window completed.`,
        },
        ...log,
      ];
      state = {
        ...state,
        activeEntry: {
          ...state.activeEntry,
          expiredLogged: true,
        },
      };
      stateChanged = true;
      logChanged = true;
    }
  }

  // 2. Check if a new day has started since the last box opening (and no 3h window is still active)
  const stillRunningAcrossMidnight =
    state.activeEntry !== null && now < state.activeEntry.expiresAt;

  if (
    !stillRunningAcrossMidnight &&
    state.lastOpenedDayKey !== null &&
    state.lastOpenedDayKey !== currentDayKey &&
    state.lastResetDayKey !== currentDayKey
  ) {
    log = [
      {
        id: `log-rst-${currentDayKey}`,
        eventType: 'DAILY_RESET',
        timestamp: now,
        dayKey: currentDayKey,
        modifierId: null,
        modifierName: 'Daily Mystery Box Reset',
        polarity: 'neutral',
        durationHours: 0,
        expiresAt: null,
        summary: `New day (${currentDayKey}) started — Mystery Box reset and ready to open.`,
      },
      ...log,
    ];
    state = {
      ...state,
      lastResetDayKey: currentDayKey,
      activeEntry: null,
    };
    stateChanged = true;
    logChanged = true;
  }

  if (stateChanged) {
    saveMysteryBoxState(state);
  }
  if (logChanged) {
    saveMysteryBoxLog(log);
  }

  // 3. Derive resolved status
  const activeEntry = state.activeEntry;
  const activeMod = activeEntry ? getModifierById(activeEntry.modifierId) : null;
  const isActive = Boolean(activeEntry && activeMod && now < activeEntry.expiresAt);
  const resetRemainingMs = Math.max(0, getNextLocalMidnightMs(now) - now);

  if (isActive && activeEntry && activeMod) {
    return {
      state,
      log,
      status: {
        phase: 'ACTIVE',
        activeModifier: activeMod,
        activeRemainingMs: Math.max(0, activeEntry.expiresAt - now),
        resetRemainingMs,
        openedAt: activeEntry.openedAt,
        expiresAt: activeEntry.expiresAt,
        currentDayKey,
      },
    };
  }

  if (state.lastOpenedDayKey === currentDayKey) {
    return {
      state,
      log,
      status: {
        phase: 'COOLDOWN_TODAY',
        activeModifier: activeMod,
        activeRemainingMs: 0,
        resetRemainingMs,
        openedAt: activeEntry?.openedAt ?? null,
        expiresAt: activeEntry?.expiresAt ?? null,
        currentDayKey,
      },
    };
  }

  return {
    state,
    log,
    status: {
      phase: 'READY',
      activeModifier: null,
      activeRemainingMs: 0,
      resetRemainingMs,
      openedAt: null,
      expiresAt: null,
      currentDayKey,
    },
  };
}

export function openDailyMysteryBox(now: number = Date.now()): {
  opened: boolean;
  modifier: MysteryBoxModifier | null;
  state: MysteryBoxStorageState;
  log: MysteryBoxLogEntry[];
  status: ResolvedMysteryBoxStatus;
} {
  const current = syncMysteryBoxLifecycle(now);
  if (current.status.phase !== 'READY') {
    return {
      opened: false,
      modifier: current.status.activeModifier,
      state: current.state,
      log: current.log,
      status: current.status,
    };
  }

  // Pick a random modifier (avoiding repeating the exact last opened modifier if possible)
  const lastOpenedModId = current.log.find((e) => e.eventType === 'OPENED')?.modifierId;
  const candidates =
    MYSTERY_BOX_MODIFIERS.length > 1 && lastOpenedModId
      ? MYSTERY_BOX_MODIFIERS.filter((m) => m.id !== lastOpenedModId)
      : MYSTERY_BOX_MODIFIERS;
  const modifier = candidates[Math.floor(Math.random() * candidates.length)];

  const dayKey = getLocalDayKey(now);
  const rollId = `${now}-${Math.random().toString(36).slice(2, 7)}`;
  const expiresAt = now + MYSTERY_BOX_DURATION_MS;

  const nextState: MysteryBoxStorageState = {
    lastOpenedDayKey: dayKey,
    lastResetDayKey: current.state.lastResetDayKey,
    activeEntry: {
      rollId,
      modifierId: modifier.id,
      polarity: modifier.polarity,
      openedAt: now,
      expiresAt,
      dayKey,
      expiredLogged: false,
    },
  };

  const newEntry: MysteryBoxLogEntry = {
    id: `log-open-${rollId}`,
    eventType: 'OPENED',
    timestamp: now,
    dayKey,
    modifierId: modifier.id,
    modifierName: modifier.name,
    polarity: modifier.polarity,
    durationHours: MYSTERY_BOX_DURATION_HOURS,
    expiresAt,
    summary: `${modifier.headline} (${modifier.polarity === 'easier' ? 'Makes Game Easier' : 'Makes Game Harder'})`,
  };

  const nextLog = [newEntry, ...current.log];
  saveMysteryBoxState(nextState);
  saveMysteryBoxLog(nextLog);

  const synced = syncMysteryBoxLifecycle(now);
  return {
    opened: true,
    modifier,
    state: synced.state,
    log: synced.log,
    status: synced.status,
  };
}

export function clearMysteryBoxLog(): MysteryBoxLogEntry[] {
  saveMysteryBoxLog([]);
  return [];
}

export function formatLogAsPlainText(entries: MysteryBoxLogEntry[]): string {
  const header = [
    '====================================================================',
    'ECOSPLIT: WATER & HARVEST — EXTERNAL MYSTERY BOX AUDIT LOG',
    `Generated: ${new Date().toISOString()}`,
    `Total Entries: ${entries.length}`,
    '====================================================================',
    '',
  ];

  if (entries.length === 0) {
    return [...header, 'No mystery box events recorded yet.'].join('\n');
  }

  const lines = entries.map((entry) => {
    const iso = new Date(entry.timestamp).toLocaleString();
    const polarityTag =
      entry.polarity === 'easier'
        ? 'EASIER'
        : entry.polarity === 'harder'
        ? 'HARDER'
        : 'SYSTEM';
    const expiresStr = entry.expiresAt
      ? ` | Active Until: ${new Date(entry.expiresAt).toLocaleString()}`
      : '';
    return `[${iso}] [${entry.dayKey}] [${entry.eventType}] [${polarityTag}] ${entry.modifierName} — ${entry.summary}${expiresStr}`;
  });

  return [...header, ...lines].join('\n');
}

export function formatLogAsCsv(entries: MysteryBoxLogEntry[]): string {
  const escape = (val: string | number | null) => {
    const str = val === null ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const header = [
    'Event ID',
    'Event Type',
    'Timestamp (ISO)',
    'Day Key',
    'Modifier ID',
    'Modifier Name',
    'Polarity',
    'Duration Hours',
    'Expires At (ISO)',
    'Summary',
  ].join(',');

  const rows = entries.map((e) =>
    [
      escape(e.id),
      escape(e.eventType),
      escape(new Date(e.timestamp).toISOString()),
      escape(e.dayKey),
      escape(e.modifierId),
      escape(e.modifierName),
      escape(e.polarity),
      escape(e.durationHours),
      escape(e.expiresAt ? new Date(e.expiresAt).toISOString() : ''),
      escape(e.summary),
    ].join(',')
  );

  return '\uFEFF' + [header, ...rows].join('\n');
}
