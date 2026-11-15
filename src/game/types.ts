export type GameScreenState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'ROUND_SUMMARY'
  | 'MYSTERY_LOG'
  | 'MAZE_3D';

export type MysteryBoxPolarity = 'easier' | 'harder';

export interface MysteryBoxModifier {
  id: string;
  name: string;
  polarity: MysteryBoxPolarity;
  headline: string;
  description: string;
  effectsSummary: string[];
  speedMultiplier: number;
  reachMultiplier: number;
  tapLeakIntervalMultiplier: number;
  burstTimeMultiplier: number;
  foodSpoilDurationMultiplier: number;
  puddleEvapMultiplier: number;
  p1TankBonus: number;
  p2BagBonus: number;
  maxHealthBonus: number;
  hazardDamageMultiplier: number;
  nightDarknessBoost: number;
  scoreMultiplier: number;
}

export interface MysteryBoxActiveEntry {
  rollId: string;
  modifierId: string;
  polarity: MysteryBoxPolarity;
  openedAt: number;
  expiresAt: number;
  dayKey: string;
  expiredLogged?: boolean;
}

export interface MysteryBoxStorageState {
  lastOpenedDayKey: string | null;
  lastResetDayKey: string | null;
  activeEntry: MysteryBoxActiveEntry | null;
}

export type MysteryBoxLogEventType = 'OPENED' | 'EXPIRED' | 'DAILY_RESET';

export interface MysteryBoxLogEntry {
  id: string;
  eventType: MysteryBoxLogEventType;
  timestamp: number;
  dayKey: string;
  modifierId: string | null;
  modifierName: string;
  polarity: MysteryBoxPolarity | 'neutral';
  durationHours: number;
  expiresAt: number | null;
  summary: string;
}

export type DeviceMode = 'auto' | 'desktop' | 'mobile';
export type SplitOrientation = 'auto' | 'side-by-side' | 'top-bottom';
export type TimeCycleMode = 'cycle' | 'day' | 'night';
export type TimeOfDayPhase = 'day' | 'dusk' | 'night' | 'dawn';

export type AvatarOutfit = 'ranger' | 'plumber' | 'chef' | 'volunteer';
export type AvatarHat = 'none' | 'cap' | 'hardhat' | 'toque' | 'visor';

export interface PlayerCustomization {
  name: string;
  outfit: AvatarOutfit;
  hat: AvatarHat;
  primaryColor: string;
  accentColor: string;
  skinTone: string;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface WorldObstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'planter' | 'table' | 'counter' | 'wall' | 'stall' | 'fountain';
  label?: string;
}

export interface TapConfig {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface FoodStationConfig {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: 'bakery' | 'kitchen' | 'produce' | 'buffet';
}

export interface RectZone {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}
export type LevelTaskType =
  | 'fix_taps'
  | 'collect_puddles'
  | 'deliver_meals'
  | 'water_garden'
  | 'clean_spills'
  | 'restock_counter'
  | 'help_stalls'
  | 'collect_mystery_items'
  | 'restore_gardens'
  | 'teamwork';

export interface LevelTask {
  id: string;
  title: string;
  type: LevelTaskType;
  target: number;
}

export interface LevelConfig {
  id: string;
  number: number;
  mode?: 'standard' | 'tutorial' | 'boss' | 'seasonal';
  name: string;
  subtitle: string;
  description: string;
  goalSummary?: string;
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Expert';
  image: string;
  worldWidth: number;
  worldHeight: number;
  durationSeconds: number;
  tasks: LevelTask[];
  waterTargetLiters: number;
  mealsTarget: number;
  floorTheme: 'courtyard' | 'cafeteria' | 'market' | 'plaza';
  p1Spawn: Vec2;
  p2Spawn: Vec2;
  cisternZone: RectZone;
  orphanageZone: RectZone;
  taps: TapConfig[];
  foodStations: FoodStationConfig[];
  obstacles: WorldObstacle[];
  tapLeakIntervalSec: number;
  foodSpawnIntervalSec: number;
  foodSpoilDurationSec: number;
}

export interface BossState {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  attackCooldown: number;
  overloadCooldown: number;
  flashTimer: number;
  walkCycle: number;
}

export interface BossTelegraph {
  id: string;
  x: number;
  y: number;
  radius: number;
  elapsed: number;
  duration: number;
  kind: 'sludge' | 'steam';
}

export interface BossBeam {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  color: string;
  damage: number;
  label: string;
}

export interface TutorialStepStatus {
  p1Scoop: boolean;
  p1FixTap: boolean;
  p1BankTank: boolean;
  p2GrabFood: boolean;
  p2DeliverMeal: boolean;
  completed: boolean;
}

export interface TapRuntime {
  id: string;
  x: number;
  y: number;
  label: string;
  leaking: boolean;
  severity: number; // 1 = drip, 2 = burst
  leakTimer: number;
  nextLeakCooldown: number;
  puddleAccumulator: number;
  fixProgress: number; // 0..1 visual flash
  totalFixed: number;
}

export interface WaterPuddle {
  id: string;
  x: number;
  y: number;
  liters: number;
  radius: number;
  maxRadius: number;
  age: number;
  evaporating: boolean;
  sourceTapId?: string;
}

export type FoodKind = 'bread' | 'soup' | 'fruit' | 'mealbox';

export interface FoodItem {
  id: string;
  x: number;
  y: number;
  kind: FoodKind;
  stationId: string;
  freshness: number; // 1.0 -> 0.0
  maxFreshnessSec: number;
  portions: number;
  bobOffset: number;
}

export interface SpoilHazard {
  id: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
}

export interface CourierBox {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  portions: number;
  progress: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: 'drop' | 'spark' | 'steam' | 'heart';
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface PlayerRuntime {
  id: 1 | 2;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingAngle: number;
  walkCycle: number;
  radius: number;
  health: number;
  maxHealth: number;
  invulnTimer: number;
  damageFlashTimer: number;
  carryingCount: number;
  carryingMax: number;
  actionCooldown: number;
  actionAnimTimer: number;
  activeActionLabel: string;
  cameraX: number;
  cameraY: number;
}

export type MajorAlertTone = 'danger' | 'warning' | 'success' | 'info';

export interface MajorAlert {
  id: string;
  title: string;
  message: string;
  tone: MajorAlertTone;
}

export type MysteryPickupPolarity = 'good' | 'bad';

export type MysteryPickupEffectKind =
  | 'swift_boots'
  | 'eco_medkit'
  | 'valve_blessing'
  | 'harvest_jackpot'
  | 'sticky_tar'
  | 'pipe_gremlin'
  | 'box_trap'
  | 'heat_flash';

export interface MysteryPickupItem {
  id: string;
  x: number;
  y: number;
  bobOffset: number;
  spawnAge: number;
  lifetime: number;
  maxLifetime: number;
}

export interface ActivePickupEffect {
  id: string;
  kind: MysteryPickupEffectKind;
  name: string;
  polarity: MysteryPickupPolarity;
  summary: string;
  targetPlayer: 1 | 2 | 'all';
  remainingSec: number;
  durationSec: number;
}

export interface LastMysteryReveal {
  id: string;
  collectorId: 1 | 2;
  collectorName: string;
  effectName: string;
  polarity: MysteryPickupPolarity;
  summary: string;
}

export interface GameHudSnapshot {
  mode: 'standard' | 'tutorial' | 'boss';
  timeRemaining: number;
  timeOfDay: TimeOfDayPhase;
  daylightLevel: number;
  p1Health: number;
  p2Health: number;
  p1MaxHealth: number;
  p2MaxHealth: number;
  gameOverReason: 'time' | 'health' | 'boss_defeated' | 'tutorial_complete' | null;
  waterSavedLiters: number;
  waterWastedLiters: number;
  waterCarryingLiters: number;
  tapsFixed: number;
  activeLeaks: number;
  mealsDonated: number;
  foodCarryingCount: number;
  foodSpoiledCount: number;
  activeFoodCount: number;
  p1Score: number;
  p2Score: number;
  teamScore: number;
  p1NearbyHint: string | null;
  p2NearbyHint: string | null;
  p1CanScoop: boolean;
  p1CanFixTap: boolean;
  p2CanGrab: boolean;
  p2CanSend: boolean;
  orphanageBannerTimer: number;
  lastOrphanageDelivery: number;
  majorAlert: MajorAlert | null;
  mysteryBoxesCollected: number;
  activeMysteryPickupCount: number;
  activePickupEffects: ActivePickupEffect[];
  lastMysteryReveal: LastMysteryReveal | null;
  boss: {
    name: string;
    hp: number;
    maxHp: number;
    phase: 1 | 2;
  } | null;
  tutorial: TutorialStepStatus | null;
}

export interface LevelStatsRecord {
  bestScore: number;
  stars: number;
  bestWaterLiters: number;
  bestMealsDonated: number;
}

export interface InputState {
  p1Move: Vec2;
  p2Move: Vec2;
  p1Action1Pressed: boolean; // Collect Water
  p1Action2Pressed: boolean; // Fix Taps
  p2Action1Pressed: boolean; // Collect Food
  p2Action2Pressed: boolean; // Reuse / Auto-Send to Orphanage
}
