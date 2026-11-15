import { soundFx } from './audio';
import { LevelTaskType,
  drawBossBeam,
  drawBossEntity,
  drawBossTelegraph,
  drawCourierBox,
  drawDayNightAtmosphere,
  drawFloatingText,
  drawFoodItem,
  drawFoodStation,
  drawFoodStationMat,
  drawMysteryPickup,
  drawObstacle,
  drawParticle,
  drawPlayerLabel,
  drawPlayerPickupAura,
  drawPlayerSprite,
  drawPuddle,
  drawSpoilHazard,
  drawTap,
  drawTargetHighlight,
  drawWorldFloor,
  drawZones,
} from './renderer';
import {
  ActivePickupEffect,
  BossBeam,
  BossState,
  BossTelegraph,
  CourierBox,
  FloatingText,
  FoodItem,
  FoodKind,
  GameHudSnapshot,
  InputState,
  LastMysteryReveal,
  LevelConfig,
  MajorAlert,
  MajorAlertTone,
  MysteryBoxModifier,
  MysteryPickupEffectKind,
  MysteryPickupItem,
  MysteryPickupPolarity,
  Particle,
  PlayerCustomization,
  PlayerRuntime,
  RectZone,
  SplitOrientation,
  SpoilHazard,
  TapRuntime,
  TimeCycleMode,
  TimeOfDayPhase,
  TutorialStepStatus,
  WaterPuddle,
  WorldObstacle,
} from './types';

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function rectContainsCircle(rect: RectZone, cx: number, cy: number) {
  return cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h;
}

interface SolidRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FOOD_STATION_HITBOX = {
  offsetX: -36,
  offsetY: -22,
  w: 72,
  h: 24,
};

function resolveCircleRectCollision(
  cx: number,
  cy: number,
  r: number,
  rect: SolidRect
): { x: number; y: number } {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  const d = Math.hypot(dx, dy);
  if (d < r && d > 0.0001) {
    const overlap = r - d;
    return {
      x: cx + (dx / d) * overlap,
      y: cy + (dy / d) * overlap,
    };
  }
  if (d <= 0.0001) {
    // Center is inside the rectangle: push out to the closest edge
    const distLeft = cx - rect.x;
    const distRight = rect.x + rect.w - cx;
    const distTop = cy - rect.y;
    const distBottom = rect.y + rect.h - cy;
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);
    if (minDist === distLeft) return { x: rect.x - r, y: cy };
    if (minDist === distRight) return { x: rect.x + rect.w + r, y: cy };
    if (minDist === distTop) return { x: cx, y: rect.y - r };
    return { x: cx, y: rect.y + rect.h + r };
  }
  return { x: cx, y: cy };
}

function resolveCircleObstacleCollision(
  cx: number,
  cy: number,
  r: number,
  obs: WorldObstacle
): { x: number; y: number } {
  if (obs.kind === 'fountain') {
    const fx = obs.x + obs.w / 2;
    const fy = obs.y + obs.h / 2;
    const fr = Math.min(obs.w, obs.h) / 2;
    const dx = cx - fx;
    const dy = cy - fy;
    const d = Math.hypot(dx, dy);
    const minDist = r + fr;
    if (d < minDist) {
      if (d > 0.0001) {
        return {
          x: fx + (dx / d) * minDist,
          y: fy + (dy / d) * minDist,
        };
      }
      return { x: fx, y: fy - minDist };
    }
    return { x: cx, y: cy };
  }
  return resolveCircleRectCollision(cx, cy, r, obs);
}

export class EcoSplitEngine {
  public level: LevelConfig;
  public p1Custom: PlayerCustomization;
  public p2Custom: PlayerCustomization;

  public p1: PlayerRuntime;
  public p2: PlayerRuntime;
  public taps: TapRuntime[] = [];
  public puddles: WaterPuddle[] = [];
  public foodItems: FoodItem[] = [];
  public spoilHazards: SpoilHazard[] = [];
  public couriers: CourierBox[] = [];
  public mysteryPickups: MysteryPickupItem[] = [];
  public activePickupEffects: ActivePickupEffect[] = [];
  public lastMysteryReveal: LastMysteryReveal | null = null;
  public mysteryBoxesCollected = 0;
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  public elapsedTime = 0;
  public timeRemaining: number;
  public timeCycleMode: TimeCycleMode = 'cycle';
  public seniorMode = false;
  public mysteryModifier: MysteryBoxModifier | null = null;
  public mode: 'standard' | 'tutorial' | 'boss';
  public boss: BossState | null = null;
  public bossTelegraphs: BossTelegraph[] = [];
  public bossBeams: BossBeam[] = [];
  public tutorial: TutorialStepStatus | null = null;
  private tutorialFinishDelay = 0;

  public gameOverReason: 'time' | 'health' | 'boss_defeated' | 'tutorial_complete' | null = null;
  public waterSavedLiters = 0;
  public waterWastedLiters = 0;
  public waterCarryingLiters = 0;
  public tapsFixed = 0;
  private taskProgress: Record<string, number> = {};
  public mealsDonated = 0;
  public foodSpoiledCount = 0;
  public p1Score = 0;
  public p2Score = 0;
  public orphanageBannerTimer = 0;
  public lastOrphanageDelivery = 0;
  public majorAlert: MajorAlert | null = null;

  private tapSpawnClock = 1.2;
  private foodSpawnClock = 1.0;
  private mysterySpawnClock = 3.2;
  private lastMysteryEffectKind: MysteryPickupEffectKind | null = null;
  private lastMysteryRevealTimer = 0;
  private footprintClock = 0;
  private uidCounter = 1;
  private finished = false;
  private majorAlertTimer = 0;
  private majorAlertPriority = 0;
  private alertCooldowns: Record<string, number> = {};
  private warned30s = false;
  private warned15s = false;
  private waterGoalAnnounced = false;
  private mealsGoalAnnounced = false;
  private nightAnnounced = false;
  private p1LowHealthWarned = false;
  private p2LowHealthWarned = false;
  private manyLeaksWarned = false;

  constructor(
    level: LevelConfig,
    p1Custom: PlayerCustomization,
    p2Custom: PlayerCustomization,
    timeCycleMode: TimeCycleMode = 'cycle',
    seniorMode = false,
    mysteryModifier: MysteryBoxModifier | null = null
  ) {
    this.level = level;
    this.mode = level.mode ?? 'standard';
    this.p1Custom = p1Custom;
    this.p2Custom = p2Custom;
    this.timeCycleMode = timeCycleMode;
    this.seniorMode = seniorMode;
    // Tutorial always uses clean standard training parameters
    this.mysteryModifier = this.mode === 'tutorial' ? null : mysteryModifier;
    this.timeRemaining = level.durationSeconds;
    for (const task of level.tasks ?? []) {
  this.taskProgress[task.id] = 0;
}
    const initialMaxHp = 100 + (this.mysteryModifier?.maxHealthBonus ?? 0);
    const p1CarryMax = Math.max(20, 60 + (this.mysteryModifier?.p1TankBonus ?? 0));
    const p2CarryMax = Math.max(2, 5 + (this.mysteryModifier?.p2BagBonus ?? 0));

    this.p1 = {
      id: 1,
      x: level.p1Spawn.x,
      y: level.p1Spawn.y,
      vx: 0,
      vy: 0,
      facingAngle: 0,
      walkCycle: 0,
      radius: 17,
      health: initialMaxHp,
      maxHealth: initialMaxHp,
      invulnTimer: 0,
      damageFlashTimer: 0,
      carryingCount: 0,
      carryingMax: p1CarryMax, // liters max tank
      actionCooldown: 0,
      actionAnimTimer: 0,
      activeActionLabel: '',
      cameraX: level.p1Spawn.x,
      cameraY: level.p1Spawn.y,
    };

    this.p2 = {
      id: 2,
      x: level.p2Spawn.x,
      y: level.p2Spawn.y,
      vx: 0,
      vy: 0,
      facingAngle: Math.PI,
      walkCycle: 0,
      radius: 17,
      health: initialMaxHp,
      maxHealth: initialMaxHp,
      invulnTimer: 0,
      damageFlashTimer: 0,
      carryingCount: 0,
      carryingMax: p2CarryMax, // meal crates max
      actionCooldown: 0,
      actionAnimTimer: 0,
      activeActionLabel: '',
      cameraX: level.p2Spawn.x,
      cameraY: level.p2Spawn.y,
    };

    this.taps = level.taps.map((t, idx) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      label: t.label,
      leaking: idx === 0, // Start with 1 leaking tap immediately for instant action
      severity: 1,
      leakTimer: 0,
      nextLeakCooldown: 2 + idx * 1.4,
      puddleAccumulator: 0,
      fixProgress: 0,
      totalFixed: 0,
    }));

    // Seed initial water puddle & initial surplus food so gameplay starts immediately
    if (this.taps[0]) {
      this.spawnPuddleNearTap(this.taps[0], 18);
    }
    this.spawnFoodAtRandomStation();
    this.spawnFoodAtRandomStation();

    if (this.mode === 'tutorial') {
      this.tutorial = {
        p1Scoop: false,
        p1FixTap: false,
        p1BankTank: false,
        p2GrabFood: false,
        p2DeliverMeal: false,
        completed: false,
      };
      this.pushMajorAlert(
        'tut-start',
        'Welcome to Training Courtyard!',
        'Follow the 5 checklist steps at the top together to complete training.',
        'info',
        3,
        0,
        4.5
      );
    } else if (this.mode === 'boss') {
      this.boss = {
        name: 'Mega-Wastelord MK-II',
        x: level.worldWidth / 2,
        y: level.worldHeight / 2,
        vx: 0,
        vy: 0,
        radius: 44,
        hp: 140,
        maxHp: 140,
        phase: 1,
        attackCooldown: 3.4,
        overloadCooldown: 7.5,
        flashTimer: 0,
        walkCycle: 0,
      };
      this.pushMajorAlert(
        'boss-intro',
        'Boss Encounter: Mega-Wastelord MK-II',
        'Fix taps, bank water, and deliver meals to blast the Boss to 0 HP!',
        'warning',
        3,
        0,
        4.6
      );
    }
  } 
    private addTaskProgress(type: LevelTaskType, amount = 1) {
  for (const task of this.level.tasks ?? []) {
    if (task.type !== type) continue;

    const current = this.taskProgress[task.id] ?? 0;

    this.taskProgress[task.id] = Math.min(
      task.target,
      current + amount
    );
  }
}

  private nextId(prefix: string) { 
  
    this.uidCounter += 1;
    return `${prefix}-${this.uidCounter}`;
  }

  private addScore(playerId: 1 | 2, basePoints: number) {
    const scaled = Math.round(basePoints * (this.mysteryModifier?.scoreMultiplier ?? 1));
    if (playerId === 1) this.p1Score += scaled;
    else this.p2Score += scaled;
  }

  private completeTutorialStep(step: keyof Omit<TutorialStepStatus, 'completed'>, label: string) {
    if (!this.tutorial || this.tutorial[step]) return;
    this.tutorial[step] = true;
    soundFx.playTutorialStep();
    this.pushMajorAlert(
      `tut-${step}`,
      'Training Step Complete!',
      label,
      'success',
      2,
      0,
      2.8
    );

    const t = this.tutorial;
    if (t.p1Scoop && t.p1FixTap && t.p1BankTank && t.p2GrabFood && t.p2DeliverMeal && !t.completed) {
      t.completed = true;
      this.tutorialFinishDelay = 1.2;
      this.pushMajorAlert(
        'tut-all-done',
        'All Training Steps Complete!',
        'Awesome teamwork! Wrapping up training courtyard...',
        'success',
        4,
        0,
        4.0
      );
    }
  }

  private launchBossBeam(
    startX: number,
    startY: number,
    damage: number,
    color: string,
    label: string
  ) {
    if (!this.boss || this.boss.hp <= 0) return;
    this.bossBeams.push({
      id: this.nextId('beam'),
      x: startX,
      y: startY,
      startX,
      startY,
      targetX: this.boss.x,
      targetY: this.boss.y,
      progress: 0,
      color,
      damage,
      label,
    });
  }

  private applyBossDamage(amount: number, label: string) {
    if (!this.boss || this.boss.hp <= 0) return;
    this.boss.hp = Math.max(0, this.boss.hp - amount);
    this.boss.flashTimer = 0.22;
    this.addFloatingText(this.boss.x, this.boss.y - 52, `${label} -${amount} HP`, '#38BDF8');
    this.emitParticles(this.boss.x, this.boss.y, '#FACC15', 14, 'spark');
    soundFx.playBossHit();

    if (this.boss.phase === 1 && this.boss.hp > 0 && this.boss.hp <= this.boss.maxHp * 0.5) {
      this.boss.phase = 2;
      soundFx.playBossWarning();
      this.pushMajorAlert(
        'boss-p2',
        'Boss Phase 2: Overdrive!',
        'Mega-Wastelord is enraged—faster patrols and dual sludge slams!',
        'danger',
        4,
        0,
        4.4
      );
    }

    if (this.boss.hp <= 0 && !this.finished) {
      this.emitParticles(this.boss.x, this.boss.y, '#34D399', 28, 'spark');
      this.emitParticles(this.boss.x, this.boss.y, '#FBBF24', 24, 'heart');
      this.finished = true;
      this.gameOverReason = 'boss_defeated';
      soundFx.playVictory();
    }
  }

  private spawnPuddleNearTap(tap: TapRuntime, initialLiters = 12) {
    const existing = this.puddles.find((p) => p.sourceTapId === tap.id);
    if (existing) {
      existing.liters = Math.min(45, existing.liters + 6);
      existing.radius = 16 + Math.sqrt(existing.liters) * 3.1;
      return;
    }
    const angle = Math.random() * Math.PI * 2;
    const offset = 28;
    const rawX = clamp(tap.x + Math.cos(angle) * offset, 45, this.level.worldWidth - 45);
    const rawY = clamp(tap.y + Math.sin(angle) * offset + 12, 45, this.level.worldHeight - 45);
    const pos = this.resolveSolidCollisions(rawX, rawY, 18);
    this.puddles.push({
      id: this.nextId('puddle'),
      x: pos.x,
      y: pos.y,
      liters: initialLiters,
      radius: 16 + Math.sqrt(initialLiters) * 3.1,
      maxRadius: 38,
      age: 0,
      evaporating: false,
      sourceTapId: tap.id,
    });
  }

  private spawnFoodAtRandomStation() {
    if (this.foodItems.length >= 9) return;
    const stations = this.level.foodStations;
    const st = stations[Math.floor(Math.random() * stations.length)];
    const kinds: FoodKind[] =
      st.kind === 'bakery'
        ? ['bread', 'mealbox']
        : st.kind === 'kitchen'
        ? ['soup', 'mealbox']
        : st.kind === 'produce'
        ? ['fruit', 'bread']
        : ['mealbox', 'soup', 'fruit'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];

    const offsetX = (Math.random() - 0.5) * 44;
    const offsetY = 26 + Math.random() * 18;
    this.foodItems.push({
      id: this.nextId('food'),
      x: clamp(st.x + offsetX, 50, this.level.worldWidth - 50),
      y: clamp(st.y + offsetY, 50, this.level.worldHeight - 50),
      kind,
      stationId: st.id,
      freshness: 1,
      maxFreshnessSec: this.level.foodSpoilDurationSec,
      portions: kind === 'mealbox' ? 2 : 1,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  private addFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({
      id: this.nextId('ft'),
      x,
      y,
      text,
      color,
      life: 1.2,
      maxLife: 1.2,
    });
  }

  private emitParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    kind: Particle['kind']
  ) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 90;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 20,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        size: 2.5 + Math.random() * 2.5,
        color,
        kind,
      });
    }
  }

  public dismissMajorAlert() {
    this.majorAlert = null;
    this.majorAlertTimer = 0;
    this.majorAlertPriority = 0;
  }

  private pushMajorAlert(
    key: string,
    title: string,
    message: string,
    tone: MajorAlertTone,
    priority = 2,
    cooldownSec = 0,
    durationSec = 3.6
  ) {
    if (cooldownSec > 0 && (this.alertCooldowns[key] ?? 0) > 0) {
      return;
    }
    if (this.majorAlertTimer > 0 && priority < this.majorAlertPriority) {
      return;
    }
    this.majorAlert = {
      id: this.nextId('alert'),
      title,
      message,
      tone,
    };
    this.majorAlertPriority = priority;
    this.majorAlertTimer = this.seniorMode ? Math.max(durationSec, 4.4) : durationSec;
    if (cooldownSec > 0) {
      this.alertCooldowns[key] = cooldownSec;
    }
  }

  public update(dt: number, input: InputState): boolean {
    if (this.finished) return true;
    const clampedDt = Math.min(dt, 0.05);
    this.elapsedTime += clampedDt;
    this.timeRemaining = Math.max(0, this.timeRemaining - clampedDt);

    if (this.orphanageBannerTimer > 0) {
      this.orphanageBannerTimer = Math.max(0, this.orphanageBannerTimer - clampedDt);
    }

    if (this.majorAlertTimer > 0) {
      this.majorAlertTimer = Math.max(0, this.majorAlertTimer - clampedDt);
      if (this.majorAlertTimer <= 0) {
        this.majorAlert = null;
        this.majorAlertPriority = 0;
      }
    }

    for (const key of Object.keys(this.alertCooldowns)) {
      if (this.alertCooldowns[key] > 0) {
        this.alertCooldowns[key] = Math.max(0, this.alertCooldowns[key] - clampedDt);
      }
    }

    // 1. Update Players Movement with smooth momentum & wet footprints
    const baseSpeed = 250 * (this.mysteryModifier?.speedMultiplier ?? 1);
    const p1Speed = baseSpeed * this.getPlayerPickupSpeedMultiplier(1);
    const p2Speed = baseSpeed * this.getPlayerPickupSpeedMultiplier(2);
    this.movePlayer(this.p1, input.p1Move.x, input.p1Move.y, p1Speed, clampedDt);
    this.movePlayer(this.p2, input.p2Move.x, input.p2Move.y, p2Speed, clampedDt);

    // 1b. Update Mystery Box Pickups (spawn, lifetime, contact reveal)
    this.updateMysteryPickups(clampedDt);

    this.footprintClock -= clampedDt;
    if (this.footprintClock <= 0) {
      this.footprintClock = 0.14;
      for (const pl of [this.p1, this.p2]) {
        const moving = Math.hypot(pl.vx, pl.vy) > 40;
        if (moving && this.puddles.some((pd) => dist(pl.x, pl.y, pd.x, pd.y) < pd.radius + 10)) {
          this.particles.push({
            x: pl.x + (Math.random() - 0.5) * 8,
            y: pl.y + 12,
            vx: 0,
            vy: 0,
            life: 0.9,
            maxLife: 0.9,
            size: 2.6,
            color: 'rgba(56, 189, 248, 0.55)',
            kind: 'drop',
          });
        }
      }
    }

    // 2. Player 1 Actions:
    // Button 1: Collect Water from nearest puddle
    if (input.p1Action1Pressed && this.p1.actionCooldown <= 0) {
      this.handleP1CollectWater();
    }
    // Button 2: Fix nearest leaking tap
    if (input.p1Action2Pressed && this.p1.actionCooldown <= 0) {
      this.handleP1FixTap();
    }
    if (this.tutorial?.completed) {
      this.tutorialFinishDelay -= clampedDt;
      if (this.tutorialFinishDelay <= 0) {
        this.finished = true;
        this.gameOverReason = 'tutorial_complete';
        soundFx.playVictory();
        return true;
      }
    }

    // Auto-recycle banked tank water when P1 steps into the Rain Cistern
    if (
      this.waterCarryingLiters > 0 &&
      rectContainsCircle(this.level.cisternZone, this.p1.x, this.p1.y)
    ) {
      const bonus = Math.round(this.waterCarryingLiters * 0.5);
      const total = this.waterCarryingLiters + bonus;
      this.waterSavedLiters += bonus;
      this.addScore(1, bonus * 3);
      this.healPlayer(this.p1, 14);
      this.addFloatingText(
        this.p1.x,
        this.p1.y - 42,
        `+${total}L Saved! +14 HP`,
        '#38BDF8'
      );
      this.emitParticles(this.p1.x, this.p1.y, '#38BDF8', 14, 'drop');
      if (this.mode === 'boss') {
        const bossDmg = Math.max(12, Math.min(28, Math.round(total * 0.45)));
        this.launchBossBeam(
          this.level.cisternZone.x + this.level.cisternZone.w / 2,
          this.level.cisternZone.y + this.level.cisternZone.h / 2,
          bossDmg,
          '#38BDF8',
          'Water Surge'
        );
      }
      if (this.mode === 'tutorial') {
        this.completeTutorialStep('p1BankTank', 'Player 1 banked water at the Tank (+50% bonus)!');
      }
      this.waterCarryingLiters = 0;
      this.p1.carryingCount = 0;
      soundFx.playCisternBank();
      this.pushMajorAlert(
        'cistern',
        'Water Tank Bonus!',
        `+${total}L saved (+50% bonus) and +14 Health!`,
        'success',
        2,
        3
      );
    }

    // 3. Player 2 Actions:
    // Button 1: Collect Food
    if (input.p2Action1Pressed && this.p2.actionCooldown <= 0) {
      this.handleP2CollectFood();
    }
    // Button 2: Reuse & Auto-Dispatch Courier Box to Orphanage
    if (input.p2Action2Pressed && this.p2.actionCooldown <= 0) {
      this.handleP2ReuseDispatch();
    }
    // AUTOMATIC Orphanage Donation when Player 2 enters the Orphanage Zone!
    if (
      this.p2.carryingCount > 0 &&
      rectContainsCircle(this.level.orphanageZone, this.p2.x, this.p2.y)
    ) {
      const donated = this.p2.carryingCount;
      this.mealsDonated += donated;
      this.addScore(2, donated * 45);
      this.healPlayer(this.p2, 14);
      this.lastOrphanageDelivery = donated;
      this.orphanageBannerTimer = 2.2;
      this.addFloatingText(
        this.p2.x,
        this.p2.y - 44,
        `+${donated} Meals Given! +14 HP`,
        '#FBBF24'
      );
      this.emitParticles(this.p2.x, this.p2.y, '#FBBF24', 18, 'heart');
      if (this.mode === 'boss') {
        const bossDmg = Math.max(10, donated * 7);
        this.launchBossBeam(
          this.level.orphanageZone.x + this.level.orphanageZone.w / 2,
          this.level.orphanageZone.y + this.level.orphanageZone.h / 2,
          bossDmg,
          '#FBBF24',
          'Meal Strike'
        );
      }
      if (this.mode === 'tutorial') {
        this.completeTutorialStep('p2DeliverMeal', 'Player 2 delivered meals to Sunny Orphanage!');
      }
      this.p2.carryingCount = 0;
      soundFx.playOrphanageDonate();
      this.pushMajorAlert(
        'orphanage',
        'Meals Given!',
        `Orphanage received +${donated} warm meals! (+14 Health)`,
        'success',
        2,
        2.5
      );
    }

    // 4. Update Taps & Water Wastage
    this.tapSpawnClock -= clampedDt;
    if (this.tapSpawnClock <= 0) {
      this.tapSpawnClock =
        this.level.tapLeakIntervalSec *
        (this.seniorMode ? 1.45 : 1) *
        (this.mysteryModifier?.tapLeakIntervalMultiplier ?? 1);
      const dryTaps = this.taps.filter((t) => !t.leaking);
      if (dryTaps.length > 0) {
        const pick = dryTaps[Math.floor(Math.random() * dryTaps.length)];
        pick.leaking = true;
        pick.severity = Math.random() > 0.72 ? 2 : 1;
        pick.leakTimer = 0;
        this.addFloatingText(pick.x, pick.y - 24, 'Leaking!', '#F87171');
        if (pick.severity === 2) {
          this.pushMajorAlert(
            `bigleak-${pick.id}`,
            'Big Pipe Leak!',
            `${pick.label} is spraying! Stay back and press [R] Fix Tap.`,
            'danger',
            3,
            7
          );
        }
      }
    }

    const burstDelay = 9.5 * (this.mysteryModifier?.burstTimeMultiplier ?? 1);
    for (const tap of this.taps) {
      if (tap.fixProgress > 0) {
        tap.fixProgress = Math.max(0, tap.fixProgress - clampedDt * 2);
      }
      if (tap.leaking) {
        tap.leakTimer += clampedDt * (this.seniorMode ? 0.65 : 1);
        if (tap.severity === 1 && tap.leakTimer > burstDelay) {
          tap.severity = 2;
          this.addFloatingText(tap.x, tap.y - 28, 'Big Leak!', '#EF4444');
          this.pushMajorAlert(
            `bigleak-${tap.id}`,
            'Big Pipe Leak!',
            `${tap.label} burst! Stay back from the spray and fix it with [R].`,
            'danger',
            3,
            7
          );
        }
        tap.puddleAccumulator += clampedDt * tap.severity;
        const wasteRate = tap.severity > 1 ? 3.2 : 1.8;
        this.waterWastedLiters += wasteRate * clampedDt;

        if (Math.random() < 0.25) {
          this.particles.push({
            x: tap.x + (Math.random() - 0.5) * 10,
            y: tap.y + 4,
            vx: (Math.random() - 0.5) * 28,
            vy: 15 + Math.random() * 25,
            life: 0.35,
            maxLife: 0.35,
            size: 2.2,
            color: '#38BDF8',
            kind: 'drop',
          });
        }

        if (tap.puddleAccumulator >= 3.2) {
          tap.puddleAccumulator = 0;
          this.spawnPuddleNearTap(tap, 12);
        }
      }
    }

    // 5. Update Water Puddles
    const hasHeatFlash = this.hasActivePickupEffect('heat_flash');
    const evapAge =
      24 *
      (this.mysteryModifier?.puddleEvapMultiplier ?? 1) *
      (hasHeatFlash ? 0.65 : 1);
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      p.age += clampedDt;
      if (p.age > evapAge) {
        this.waterWastedLiters += 2.5 * clampedDt;
        p.liters -= 2.5 * clampedDt;
        p.radius = Math.max(8, 12 + Math.sqrt(Math.max(0, p.liters)) * 2.8);
        if (p.liters <= 1) {
          this.puddles.splice(i, 1);
        }
      }
    }

    // 6. Spawn & Update Surplus Food
    this.foodSpawnClock -= clampedDt;
    if (this.foodSpawnClock <= 0) {
      this.foodSpawnClock = this.level.foodSpawnIntervalSec * (this.seniorMode ? 1.25 : 1);
      this.spawnFoodAtRandomStation();
    }

    const spoilMult =
      (this.mysteryModifier?.foodSpoilDurationMultiplier ?? 1) *
      (hasHeatFlash ? 0.5 : 1);
    for (let i = this.foodItems.length - 1; i >= 0; i--) {
      const f = this.foodItems[i];
      f.freshness -= (clampedDt / (f.maxFreshnessSec * spoilMult)) * (this.seniorMode ? 0.65 : 1);
      if ((f.kind === 'soup' || f.kind === 'mealbox') && f.freshness > 0.45 && Math.random() < 0.06) {
        this.particles.push({
          x: f.x + (Math.random() - 0.5) * 8,
          y: f.y - 4,
          vx: (Math.random() - 0.5) * 6,
          vy: -14 - Math.random() * 10,
          life: 0.6,
          maxLife: 0.6,
          size: 2.3,
          color: 'rgba(255, 255, 255, 0.55)',
          kind: 'steam',
        });
      }
      if (f.freshness <= 0) {
        this.foodSpoiledCount += f.portions;
        this.spoilHazards.push({
          id: this.nextId('spoil'),
          x: f.x,
          y: f.y,
          life: 6.5,
          maxLife: 6.5,
          radius: 36,
        });
        this.addFloatingText(f.x, f.y - 16, 'Spoiled!', '#EF4444');
        this.pushMajorAlert(
          'spoil',
          'Food Spoiled!',
          'Stay away from the green cloud—it hurts your health!',
          'warning',
          2,
          9
        );
        this.foodItems.splice(i, 1);
      }
    }

    const activeLeaksCount = this.taps.filter((t) => t.leaking).length;
    if (activeLeaksCount >= 3 && !this.manyLeaksWarned) {
      this.manyLeaksWarned = true;
      this.pushMajorAlert(
        'manyleaks',
        'Many Taps Leaking!',
        `${activeLeaksCount} taps are leaking at once—fix them with [R]!`,
        'warning',
        2,
        12
      );
    } else if (activeLeaksCount <= 1) {
      this.manyLeaksWarned = false;
    }

    // 6b. Update Spoil Hazards & Check Health Hazards (Burst Taps + Spoil Clouds)
    for (let i = this.spoilHazards.length - 1; i >= 0; i--) {
      this.spoilHazards[i].life -= clampedDt;
      if (this.spoilHazards[i].life <= 0) {
        this.spoilHazards.splice(i, 1);
      }
    }

    const dmgMult = this.mysteryModifier?.hazardDamageMultiplier ?? 1;
    for (const pl of [this.p1, this.p2]) {
      if (pl.invulnTimer > 0) continue;
      // Burst tap high-pressure jet splash hazard
      const hitBurstTap = this.taps.find(
        (t) => t.leaking && t.severity > 1 && dist(pl.x, pl.y, t.x, t.y) < 32
      );
      if (hitBurstTap) {
        const dmg = Math.max(1, Math.round((this.seniorMode ? 5 : 10) * dmgMult));
        this.damagePlayer(pl, dmg, `Pipe Splash! -${dmg} HP`);
        continue;
      }
      // Spoiled food mold cloud hazard
      const hitSpoil = this.spoilHazards.find(
        (hz) => dist(pl.x, pl.y, hz.x, hz.y) < hz.radius
      );
      if (hitSpoil) {
        const dmg = Math.max(1, Math.round((this.seniorMode ? 4 : 8) * dmgMult));
        this.damagePlayer(pl, dmg, `Bad Food! -${dmg} HP`);
      }
    }

    // 7. Update Auto-Courier Boxes flying to Orphanage
    for (let i = this.couriers.length - 1; i >= 0; i--) {
      const box = this.couriers[i];
      const dx = box.targetX - box.x;
      const dy = box.targetY - box.y;
      const d = Math.hypot(dx, dy);
      const courierSpeed = 340;
      if (d < 16) {
        this.mealsDonated += box.portions;
        this.addScore(2, box.portions * 40);
        this.healPlayer(this.p2, 8);
        this.lastOrphanageDelivery = box.portions;
        this.orphanageBannerTimer = 2.0;
        this.addFloatingText(
          box.targetX,
          box.targetY - 22,
          `+${box.portions} Meals Sent!`,
          '#34D399'
        );
        this.emitParticles(box.targetX, box.targetY, '#34D399', 14, 'heart');
        if (this.mode === 'boss') {
          const bossDmg = Math.max(10, box.portions * 7);
          this.launchBossBeam(
            box.targetX,
            box.targetY,
            bossDmg,
            '#FBBF24',
            'Courier Blast'
          );
        }
        if (this.mode === 'tutorial') {
          this.completeTutorialStep('p2DeliverMeal', 'Player 2 sent meals to Sunny Orphanage!');
        }
        soundFx.playOrphanageDonate();
        this.pushMajorAlert(
          'orphanage',
          'Meals Delivered!',
          `Orphanage received +${box.portions} meals!`,
          'success',
          1,
          2.5
        );
        this.couriers.splice(i, 1);
      } else {
        box.x += (dx / d) * courierSpeed * clampedDt;
        box.y += (dy / d) * courierSpeed * clampedDt;
      }
    }

    // 7b. Boss AI, Telegraphed Sludge Slams & Eco-Beams
    if (this.mode === 'boss' && this.boss && this.boss.hp > 0) {
      this.updateBossMode(clampedDt);
      if (this.finished) return true;
    }

    // 8. Particles & Floating Text
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * clampedDt;
      pt.y += pt.vy * clampedDt;
      pt.life -= clampedDt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 28 * clampedDt;
      ft.life -= clampedDt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // 9. Major Milestones & Time Warnings
    if (!this.waterGoalAnnounced && Math.round(this.waterSavedLiters) >= this.level.waterTargetLiters) {
      this.waterGoalAnnounced = true;
      this.pushMajorAlert(
        'watergoal',
        'Water Goal Reached!',
        `${this.level.waterTargetLiters}L saved! Keep going for extra stars.`,
        'success',
        3,
        0,
        4.2
      );
    }

    if (!this.mealsGoalAnnounced && this.mealsDonated >= this.level.mealsTarget) {
      this.mealsGoalAnnounced = true;
      this.pushMajorAlert(
        'mealsgoal',
        'Meals Goal Reached!',
        `${this.level.mealsTarget} meals given to the Orphanage!`,
        'success',
        3,
        0,
        4.2
      );
    }

    if (this.timeCycleMode === 'cycle' && !this.nightAnnounced) {
      const { timeOfDay } = this.getDaylightState();
      if (timeOfDay === 'night') {
        this.nightAnnounced = true;
        this.pushMajorAlert(
          'nightfall',
          'Night Has Fallen',
          'Street lights and flashlights are now on.',
          'info',
          1,
          0,
          3.5
        );
      }
    }

    if (!this.warned30s && this.timeRemaining <= 30 && this.timeRemaining > 15) {
      this.warned30s = true;
      this.pushMajorAlert(
        'time30',
        '30 Seconds Left!',
        'Finish fixing leaks and deliver your remaining meals!',
        'warning',
        3,
        0,
        3.8
      );
    }

    if (!this.warned15s && this.timeRemaining <= 15 && this.timeRemaining > 0) {
      this.warned15s = true;
      this.pushMajorAlert(
        'time15',
        '15 Seconds Left!',
        'Final countdown! Empty your Water Tank and Send Meals now!',
        'danger',
        4,
        0,
        4.2
      );
    }

    if (this.p1.health <= 0 || this.p2.health <= 0) {
      this.finished = true;
      this.gameOverReason = 'health';
      soundFx.playDamage();
      return true;
    }

    if (this.timeRemaining <= 0) {
      this.finished = true;
      this.gameOverReason = 'time';
      soundFx.playVictory();
      return true;
    }

    return false;
  }

  public setTimeCycleMode(mode: TimeCycleMode) {
    this.timeCycleMode = mode;
  }

  public setSeniorMode(enabled: boolean) {
    this.seniorMode = enabled;
  }

  public setMysteryModifier(mod: MysteryBoxModifier | null) {
    if (this.mode === 'tutorial') {
      this.mysteryModifier = null;
      return;
    }
    this.mysteryModifier = mod;
    const targetMaxHp = 100 + (mod?.maxHealthBonus ?? 0);
    this.p1.maxHealth = targetMaxHp;
    this.p2.maxHealth = targetMaxHp;
    this.p1.health = Math.min(this.p1.health, targetMaxHp);
    this.p2.health = Math.min(this.p2.health, targetMaxHp);
    this.p1.carryingMax = Math.max(20, 60 + (mod?.p1TankBonus ?? 0));
    this.p2.carryingMax = Math.max(2, 5 + (mod?.p2BagBonus ?? 0));
  }

  private updateBossMode(dt: number) {
    const boss = this.boss;
    if (!boss) return;

    if (boss.flashTimer > 0) {
      boss.flashTimer = Math.max(0, boss.flashTimer - dt);
    }

    // Smooth figure-8 arena patrol centered around mid-arena
    const centerX = this.level.worldWidth / 2;
    const centerY = this.level.worldHeight / 2;
    const orbitSpeed = boss.phase === 2 ? 0.72 : 0.45;
    boss.walkCycle += dt * (boss.phase === 2 ? 3.2 : 2.1);
    const targetX = centerX + Math.sin(this.elapsedTime * orbitSpeed) * 195;
    const targetY = centerY + Math.sin(this.elapsedTime * orbitSpeed * 1.6) * 165;
    const dx = targetX - boss.x;
    const dy = targetY - boss.y;
    const moveLerp = Math.min(1, dt * (boss.phase === 2 ? 2.4 : 1.5));
    boss.x += dx * moveLerp;
    boss.y += dy * moveLerp;

    // Contact knockback/hazard if a player touches the Boss directly
    const dmgMult = this.mysteryModifier?.hazardDamageMultiplier ?? 1;
    for (const pl of [this.p1, this.p2]) {
      const d = dist(pl.x, pl.y, boss.x, boss.y);
      if (d < boss.radius + pl.radius + 4) {
        const pushAngle = Math.atan2(pl.y - boss.y, pl.x - boss.x);
        pl.x = boss.x + Math.cos(pushAngle) * (boss.radius + pl.radius + 8);
        pl.y = boss.y + Math.sin(pushAngle) * (boss.radius + pl.radius + 8);
        if (pl.invulnTimer <= 0) {
          const dmg = Math.max(2, Math.round((this.seniorMode ? 6 : 11) * dmgMult));
          this.damagePlayer(pl, dmg, `Boss Knockback! -${dmg} HP`);
        }
      }
    }

    // Pipe Overload: Boss periodically forces a dry tap to leak
    boss.overloadCooldown -= dt;
    if (boss.overloadCooldown <= 0) {
      boss.overloadCooldown = (boss.phase === 2 ? 7.5 : 11.0) * (this.seniorMode ? 1.3 : 1);
      const dryTaps = this.taps.filter((t) => !t.leaking);
      if (dryTaps.length > 0) {
        const pick = dryTaps[Math.floor(Math.random() * dryTaps.length)];
        pick.leaking = true;
        pick.severity = boss.phase === 2 ? 2 : 1;
        pick.leakTimer = 0;
        this.addFloatingText(pick.x, pick.y - 24, 'Boss Overload!', '#EF4444');
        this.emitParticles(pick.x, pick.y, '#EF4444', 10, 'spark');
      }
    }

    // Telegraphed Sludge/Steam Slam Attacks
    boss.attackCooldown -= dt;
    if (boss.attackCooldown <= 0) {
      boss.attackCooldown = (boss.phase === 2 ? 3.2 : 4.8) * (this.seniorMode ? 1.28 : 1);
      const targets = boss.phase === 2 ? [this.p1, this.p2] : [Math.random() < 0.5 ? this.p1 : this.p2];
      for (const pl of targets) {
        const tx = clamp(pl.x + (Math.random() - 0.5) * 32, 90, this.level.worldWidth - 90);
        const ty = clamp(pl.y + (Math.random() - 0.5) * 32, 90, this.level.worldHeight - 90);
        this.bossTelegraphs.push({
          id: this.nextId('tele'),
          x: tx,
          y: ty,
          radius: boss.phase === 2 ? 74 : 66,
          elapsed: 0,
          duration: this.seniorMode ? 2.1 : 1.6,
          kind: boss.phase === 2 ? 'steam' : 'sludge',
        });
      }
      soundFx.playBossWarning();
    }

    // Resolve Telegraphs
    for (let i = this.bossTelegraphs.length - 1; i >= 0; i--) {
      const tg = this.bossTelegraphs[i];
      tg.elapsed += dt;
      if (tg.elapsed >= tg.duration) {
        this.emitParticles(tg.x, tg.y, tg.kind === 'steam' ? '#EF4444' : '#F59E0B', 16, 'spark');
        for (const pl of [this.p1, this.p2]) {
          if (pl.invulnTimer <= 0 && dist(pl.x, pl.y, tg.x, tg.y) <= tg.radius) {
            const base = boss.phase === 2 ? 12 : 9;
            const dmg = Math.max(2, Math.round((this.seniorMode ? base * 0.6 : base) * dmgMult));
            this.damagePlayer(pl, dmg, `Boss Slam! -${dmg} HP`);
          }
        }
        // Leave a small spoil hazard or puddle at the slam site
        if (Math.random() < 0.5 && this.spoilHazards.length < 4) {
          this.spoilHazards.push({
            id: this.nextId('spoil'),
            x: tg.x,
            y: tg.y,
            life: 4.5,
            maxLife: 4.5,
            radius: 32,
          });
        } else if (this.puddles.length < 7) {
          this.puddles.push({
            id: this.nextId('puddle'),
            x: tg.x,
            y: tg.y,
            liters: 10,
            radius: 24,
            maxRadius: 34,
            age: 0,
            evaporating: false,
          });
        }
        this.bossTelegraphs.splice(i, 1);
      }
    }

    // Update Eco-Beams flying into Boss
    for (let i = this.bossBeams.length - 1; i >= 0; i--) {
      const b = this.bossBeams[i];
      b.targetX = boss.x;
      b.targetY = boss.y;
      b.progress = Math.min(1, b.progress + dt * 2.3);
      b.x = b.startX + (b.targetX - b.startX) * b.progress;
      b.y = b.startY + (b.targetY - b.startY) * b.progress;
      if (b.progress >= 1) {
        this.applyBossDamage(b.damage, b.label);
        this.bossBeams.splice(i, 1);
      }
    }
  }

  private getActionReach(playerId?: 1 | 2): number {
    const hasSwift =
      playerId !== undefined &&
      this.activePickupEffects.some(
        (e) =>
          e.kind === 'swift_boots' &&
          (e.targetPlayer === playerId || e.targetPlayer === 'all')
      );
    return (
      (this.seniorMode ? 105 : 80) *
      (this.mysteryModifier?.reachMultiplier ?? 1) *
      (hasSwift ? 1.25 : 1)
    );
  }

  public getDaylightState(): { daylightLevel: number; timeOfDay: TimeOfDayPhase } {
    const nightFloor = this.seniorMode ? 0.52 : 0.14;
    const darkBoost =
      (this.mysteryModifier?.nightDarknessBoost ?? 0) +
      (this.hasActivePickupEffect('heat_flash') ? 0.1 : 0);
    const applyBoost = (lvl: number) => clamp(lvl - darkBoost, 0.08, 1);

    if (this.mode === 'tutorial') {
      return { daylightLevel: 1, timeOfDay: 'day' };
    }
    if (this.timeCycleMode === 'day') {
      return { daylightLevel: applyBoost(1), timeOfDay: 'day' };
    }
    if (this.timeCycleMode === 'night') {
      return { daylightLevel: applyBoost(nightFloor), timeOfDay: 'night' };
    }
    const progress = clamp(this.elapsedTime / Math.max(1, this.level.durationSeconds), 0, 1);
    if (progress < 0.34) {
      return { daylightLevel: applyBoost(1), timeOfDay: 'day' };
    }
    if (progress < 0.54) {
      const t = (progress - 0.34) / 0.2;
      return { daylightLevel: applyBoost(1 - t * (1 - nightFloor)), timeOfDay: 'dusk' };
    }
    if (progress < 0.84) {
      return { daylightLevel: applyBoost(nightFloor), timeOfDay: 'night' };
    }
    const t = (progress - 0.84) / 0.16;
    return {
      daylightLevel: applyBoost(nightFloor + t * (0.92 - nightFloor)),
      timeOfDay: 'dawn',
    };
  }

  private damagePlayer(player: PlayerRuntime, amount: number, label: string) {
    const minHp = this.mode === 'tutorial' ? 25 : 0;
    player.health = Math.max(minHp, player.health - amount);
    player.invulnTimer = 1.05;
    player.damageFlashTimer = 0.45;
    this.addFloatingText(player.x, player.y - 40, label, '#EF4444');
    soundFx.playDamage();

    const name = player.id === 1 ? this.p1Custom.name : this.p2Custom.name;
    if (player.health > 0 && player.health <= 30) {
      const warned = player.id === 1 ? this.p1LowHealthWarned : this.p2LowHealthWarned;
      if (!warned) {
        if (player.id === 1) this.p1LowHealthWarned = true;
        else this.p2LowHealthWarned = true;
        this.pushMajorAlert(
          `lowhp-${player.id}`,
          `${name} Has Low Health!`,
          `Only ${Math.round(player.health)} HP left! Fix 7 taps, empty Water Tank, or give meals to heal.`,
          'danger',
          4,
          8,
          4.8
        );
        return;
      }
    }

    if (player.health > 0) {
      this.pushMajorAlert(
        `dmg-${player.id}`,
        `${name} Got Hurt!`,
        `${label} — Stay clear of spraying pipes and green clouds.`,
        'danger',
        3,
        4.5,
        3.2
      );
    }
  }

  private healPlayer(player: PlayerRuntime, amount: number) {
    if (player.health >= player.maxHealth) return;
    player.health = Math.min(player.maxHealth, player.health + amount);
    if (player.health > 45) {
      if (player.id === 1) this.p1LowHealthWarned = false;
      else this.p2LowHealthWarned = false;
    }
    soundFx.playHeal();
  }

  private movePlayer(
    player: PlayerRuntime,
    mx: number,
    my: number,
    speed: number,
    dt: number
  ) {
    if (player.actionCooldown > 0) player.actionCooldown = Math.max(0, player.actionCooldown - dt);
    if (player.actionAnimTimer > 0) player.actionAnimTimer = Math.max(0, player.actionAnimTimer - dt);
    if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    if (player.damageFlashTimer > 0) player.damageFlashTimer = Math.max(0, player.damageFlashTimer - dt);

    const mag = Math.hypot(mx, my);
    const nx = mag > 0.01 ? mx / Math.max(1, mag) : 0;
    const ny = mag > 0.01 ? my / Math.max(1, mag) : 0;

    const targetVx = nx * speed;
    const targetVy = ny * speed;
    const accel = Math.min(1, dt * 15);
    player.vx += (targetVx - player.vx) * accel;
    player.vy += (targetVy - player.vy) * accel;

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (mag > 0.05) {
      player.facingAngle = Math.atan2(ny, nx);
      player.walkCycle += dt * 13;
    }

    // World bounds & solid stall/obstacle collision (2 passes to prevent corner squeeze)
    const resolved = this.resolveSolidCollisions(player.x, player.y, player.radius);
    player.x = resolved.x;
    player.y = resolved.y;

    // Smooth camera follow
    player.cameraX += (player.x - player.cameraX) * Math.min(1, dt * 8.5);
    player.cameraY += (player.y - player.cameraY) * Math.min(1, dt * 8.5);
  }

  private resolveSolidCollisions(x: number, y: number, radius: number): { x: number; y: number } {
    let rx = clamp(x, 34, this.level.worldWidth - 34);
    let ry = clamp(y, 34, this.level.worldHeight - 34);

    for (let pass = 0; pass < 2; pass++) {
      for (const obs of this.level.obstacles) {
        const res = resolveCircleObstacleCollision(rx, ry, radius, obs);
        rx = res.x;
        ry = res.y;
      }
      for (const st of this.level.foodStations) {
        const res = resolveCircleRectCollision(rx, ry, radius, {
          x: st.x + FOOD_STATION_HITBOX.offsetX,
          y: st.y + FOOD_STATION_HITBOX.offsetY,
          w: FOOD_STATION_HITBOX.w,
          h: FOOD_STATION_HITBOX.h,
        });
        rx = res.x;
        ry = res.y;
      }
      rx = clamp(rx, 34, this.level.worldWidth - 34);
      ry = clamp(ry, 34, this.level.worldHeight - 34);
    }

    return { x: rx, y: ry };
  }

  private handleP1CollectWater() {
    let closestIdx = -1;
    let closestDist = this.getActionReach(1);
    for (let i = 0; i < this.puddles.length; i++) {
      const d = dist(this.p1.x, this.p1.y, this.puddles[i].x, this.puddles[i].y);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }
    this.p1.actionCooldown = 0.24;
    this.p1.actionAnimTimer = 0.28;

    if (closestIdx >= 0) {
      const puddle = this.puddles[closestIdx];
      const amount = Math.round(puddle.liters);
      this.waterSavedLiters += amount;
      this.waterCarryingLiters = Math.min(
        this.p1.carryingMax,
        this.waterCarryingLiters + amount
      );
      this.p1.carryingCount = this.waterCarryingLiters;
      this.addScore(1, amount * 4);
      this.emitParticles(puddle.x, puddle.y, '#38BDF8', 12, 'drop');
      this.addFloatingText(puddle.x, puddle.y - 16, `+${amount}L Water!`, '#38BDF8');
      this.puddles.splice(closestIdx, 1);
      soundFx.playWaterCollect();
      if (this.mode === 'tutorial') {
        this.completeTutorialStep('p1Scoop', 'Player 1 scooped spilled water!');
      }
    } else {
      this.addFloatingText(this.p1.x, this.p1.y - 34, 'Get closer to water', '#94A3B8');
    }
  }

  private handleP1FixTap() {
    let closestTap: TapRuntime | null = null;
    let closestDist = this.getActionReach(1);
    for (const t of this.taps) {
      if (!t.leaking) continue;
      const d = dist(this.p1.x, this.p1.y, t.x, t.y);
      if (d < closestDist) {
        closestDist = d;
        closestTap = t;
      }
    }
    this.p1.actionCooldown = 0.26;
    this.p1.actionAnimTimer = 0.32;

    if (closestTap) {
      closestTap.leaking = false;
      closestTap.fixProgress = 1;
      closestTap.totalFixed += 1;
      this.tapsFixed += 1;
      const bonusLiters = closestTap.severity > 1 ? 20 : 12;
      this.waterSavedLiters += bonusLiters;
      this.addScore(1, closestTap.severity > 1 ? 85 : 55);

      if (this.mode === 'boss') {
        this.launchBossBeam(
          closestTap.x,
          closestTap.y,
          closestTap.severity > 1 ? 14 : 10,
          '#2DD4BF',
          'Pipe Shutoff'
        );
      }
      if (this.mode === 'tutorial') {
        this.completeTutorialStep('p1FixTap', 'Player 1 fixed a leaking tap!');
      }

      const pipeCycle = this.tapsFixed % 7;
      if (pipeCycle === 0) {
        const wasFull = this.p1.health >= this.p1.maxHealth;
        this.healPlayer(this.p1, 25);
        this.emitParticles(this.p1.x, this.p1.y, '#34D399', 16, 'heart');
        this.addFloatingText(
          this.p1.x,
          this.p1.y - 42,
          wasFull ? '7 Fixed! Full HP!' : '7 Fixed! +25 HP!',
          '#34D399'
        );
        this.pushMajorAlert(
          'healed7',
          '7 Taps Fixed!',
          `${this.p1Custom.name} got a +25 Health boost!`,
          'success',
          2,
          3
        );
      }

      this.emitParticles(closestTap.x, closestTap.y, '#FACC15', 14, 'spark');
      this.addFloatingText(
        closestTap.x,
        closestTap.y - 26,
        `Fixed! +${bonusLiters}L (${pipeCycle === 0 ? 7 : pipeCycle}/7)`,
        '#34D399'
      );
      soundFx.playTapFix();
    } else {
      this.addFloatingText(this.p1.x, this.p1.y - 34, 'Get closer to a tap', '#94A3B8');
    }
  }

  private handleP2CollectFood() {
    if (this.p2.carryingCount >= this.p2.carryingMax) {
      this.p2.actionCooldown = 0.25;
      this.addFloatingText(
        this.p2.x,
        this.p2.y - 38,
        'Bag Full! Go to Orphanage or press Send',
        '#FBBF24'
      );
      return;
    }

    let closestIdx = -1;
    let closestDist = this.getActionReach(2);
    for (let i = 0; i < this.foodItems.length; i++) {
      const d = dist(this.p2.x, this.p2.y, this.foodItems[i].x, this.foodItems[i].y);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }
    this.p2.actionCooldown = 0.22;
    this.p2.actionAnimTimer = 0.26;

    if (closestIdx >= 0) {
      const item = this.foodItems[closestIdx];
      const added = Math.min(item.portions, this.p2.carryingMax - this.p2.carryingCount);
      this.p2.carryingCount += added;
      this.addScore(2, added * 15);
      this.healPlayer(this.p2, 4);
      this.emitParticles(item.x, item.y, '#FBBF24', 10, 'steam');
      this.addFloatingText(item.x, item.y - 18, `+${added} Meal!`, '#FBBF24');
      this.foodItems.splice(closestIdx, 1);
      soundFx.playFoodCollect();
      if (this.mode === 'tutorial') {
        this.completeTutorialStep('p2GrabFood', 'Player 2 rescued fresh surplus food!');
      }
    } else {
      this.addFloatingText(this.p2.x, this.p2.y - 34, 'Get closer to food', '#94A3B8');
    }
  }

  private handleP2ReuseDispatch() {
    this.p2.actionCooldown = 0.35;
    this.p2.actionAnimTimer = 0.3;

    // If carrying food, pack and auto-dispatch courier box directly to Orphanage!
    if (this.p2.carryingCount > 0) {
      const targetX = this.level.orphanageZone.x + this.level.orphanageZone.w / 2;
      const targetY = this.level.orphanageZone.y + this.level.orphanageZone.h / 2;
      this.couriers.push({
        id: this.nextId('courier'),
        x: this.p2.x,
        y: this.p2.y,
        targetX,
        targetY,
        portions: this.p2.carryingCount,
        progress: 0,
      });
      this.addFloatingText(
        this.p2.x,
        this.p2.y - 38,
        `Sending ${this.p2.carryingCount} Meals!`,
        '#34D399'
      );
      this.p2.carryingCount = 0;
      soundFx.playCourierLaunch();
      return;
    }

    // Otherwise if standing near a food item on the ground, directly repack & auto-send it to the Orphanage!
    let closestIdx = -1;
    let closestDist = this.getActionReach(2) + 4;
    for (let i = 0; i < this.foodItems.length; i++) {
      const d = dist(this.p2.x, this.p2.y, this.foodItems[i].x, this.foodItems[i].y);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    if (closestIdx >= 0) {
      const item = this.foodItems[closestIdx];
      const targetX = this.level.orphanageZone.x + this.level.orphanageZone.w / 2;
      const targetY = this.level.orphanageZone.y + this.level.orphanageZone.h / 2;
      this.couriers.push({
        id: this.nextId('courier'),
        x: item.x,
        y: item.y,
        targetX,
        targetY,
        portions: item.portions,
        progress: 0,
      });
      this.addFloatingText(
        item.x,
        item.y - 20,
        'Sent to Orphanage!',
        '#34D399'
      );
      this.foodItems.splice(closestIdx, 1);
      soundFx.playCourierLaunch();
    } else {
      this.addFloatingText(
        this.p2.x,
        this.p2.y - 34,
        'Grab food first to send',
        '#94A3B8'
      );
    }
  }

  private hasActivePickupEffect(kind: MysteryPickupEffectKind): boolean {
    return this.activePickupEffects.some((e) => e.kind === kind);
  }

  private getPlayerPickupSpeedMultiplier(playerId: 1 | 2): number {
    let mult = 1;
    for (const eff of this.activePickupEffects) {
      if (eff.targetPlayer !== playerId && eff.targetPlayer !== 'all') continue;
      if (eff.kind === 'swift_boots') mult *= 1.38;
      if (eff.kind === 'sticky_tar') mult *= 0.68;
    }
    return mult;
  }

  private updateMysteryPickups(dt: number) {
    // Tick active timed effects
    for (let i = this.activePickupEffects.length - 1; i >= 0; i--) {
      this.activePickupEffects[i].remainingSec -= dt;
      if (this.activePickupEffects[i].remainingSec <= 0) {
        this.activePickupEffects.splice(i, 1);
      }
    }

    if (this.lastMysteryRevealTimer > 0) {
      this.lastMysteryRevealTimer = Math.max(0, this.lastMysteryRevealTimer - dt);
      if (this.lastMysteryRevealTimer <= 0) {
        this.lastMysteryReveal = null;
      }
    }

    // Spawn new mystery crates periodically (max 2 on map)
    this.mysterySpawnClock -= dt;
    if (this.mysterySpawnClock <= 0) {
      this.mysterySpawnClock = this.mode === 'tutorial' ? 18 : 14 + Math.random() * 5;
      if (this.mysteryPickups.length < 2) {
        this.spawnMysteryPickup();
      }
    }

    // Update lifetimes & detect player contact pickup
    for (let i = this.mysteryPickups.length - 1; i >= 0; i--) {
      const box = this.mysteryPickups[i];
      box.spawnAge += dt;
      box.lifetime -= dt;
      if (box.lifetime <= 0) {
        this.mysteryPickups.splice(i, 1);
        continue;
      }

      if (box.spawnAge < 0.35) continue;

      const collector = [this.p1, this.p2].find(
        (pl) => dist(pl.x, pl.y, box.x, box.y) < pl.radius + 20
      );
      if (collector) {
        this.mysteryPickups.splice(i, 1);
        this.revealMysteryPickup(collector, box.x, box.y);
      }
    }
  }

  private spawnMysteryPickup() {
    const pad = 95;
    for (let attempt = 0; attempt < 24; attempt++) {
      const rx = pad + Math.random() * (this.level.worldWidth - pad * 2);
      const ry = pad + Math.random() * (this.level.worldHeight - pad * 2);

      // Avoid zones, obstacles, food stations, taps, and players
      const inCistern =
        rx >= this.level.cisternZone.x - 24 &&
        rx <= this.level.cisternZone.x + this.level.cisternZone.w + 24 &&
        ry >= this.level.cisternZone.y - 24 &&
        ry <= this.level.cisternZone.y + this.level.cisternZone.h + 24;
      const inOrphanage =
        rx >= this.level.orphanageZone.x - 24 &&
        rx <= this.level.orphanageZone.x + this.level.orphanageZone.w + 24 &&
        ry >= this.level.orphanageZone.y - 24 &&
        ry <= this.level.orphanageZone.y + this.level.orphanageZone.h + 24;
      if (inCistern || inOrphanage) continue;

      const hitsObstacle = this.level.obstacles.some(
        (o) =>
          rx >= o.x - 30 &&
          rx <= o.x + o.w + 30 &&
          ry >= o.y - 30 &&
          ry <= o.y + o.h + 30
      );
      if (hitsObstacle) continue;

      const hitsStation = this.level.foodStations.some(
        (s) => dist(rx, ry, s.x, s.y) < 62
      );
      if (hitsStation) continue;

      const hitsTap = this.taps.some((t) => dist(rx, ry, t.x, t.y) < 55);
      if (hitsTap) continue;

      const tooCloseToPlayers =
        dist(rx, ry, this.p1.x, this.p1.y) < 130 ||
        dist(rx, ry, this.p2.x, this.p2.y) < 130;
      if (tooCloseToPlayers) continue;

      const tooCloseToBox = this.mysteryPickups.some((b) => dist(rx, ry, b.x, b.y) < 160);
      if (tooCloseToBox) continue;

      this.mysteryPickups.push({
        id: this.nextId('mbox'),
        x: rx,
        y: ry,
        bobOffset: Math.random() * Math.PI * 2,
        spawnAge: 0,
        lifetime: 24,
        maxLifetime: 24,
      });
      this.emitParticles(rx, ry, '#FACC15', 10, 'spark');
      return;
    }
  }

  private revealMysteryPickup(collector: PlayerRuntime, x: number, y: number) {
    const collectorName = collector.id === 1 ? this.p1Custom.name : this.p2Custom.name;
    const goodPool: MysteryPickupEffectKind[] = [
      'swift_boots',
      'eco_medkit',
      'valve_blessing',
      'harvest_jackpot',
    ];
    const badPool: MysteryPickupEffectKind[] = [
      'sticky_tar',
      'pipe_gremlin',
      'box_trap',
      'heat_flash',
    ];

    // True hidden 50/50 Good vs Bad mystery roll revealed ONLY on collecting
    const isGood = Math.random() < 0.5;
    const pool = isGood ? goodPool : badPool;
    const filtered =
      pool.length > 1 && this.lastMysteryEffectKind
        ? pool.filter((k) => k !== this.lastMysteryEffectKind)
        : pool;
    const kind = filtered[Math.floor(Math.random() * filtered.length)];
    this.lastMysteryEffectKind = kind;
    this.mysteryBoxesCollected += 1;

    let polarity: MysteryPickupPolarity = isGood ? 'good' : 'bad';
    let effectName = '';
    let summary = '';

    if (kind === 'swift_boots') {
      polarity = 'good';
      effectName = 'Swift Boots';
      summary = `${collectorName} gets +38% Speed & +25% Reach for 10s!`;
      this.upsertTimedPickupEffect({
        id: this.nextId('eff'),
        kind,
        name: effectName,
        polarity,
        summary,
        targetPlayer: collector.id,
        remainingSec: 10,
        durationSec: 10,
      });
      this.addScore(collector.id, 40);
    } else if (kind === 'eco_medkit') {
      polarity = 'good';
      effectName = 'Eco Medkit';
      summary = `${collectorName} +30 HP, Partner +10 HP & +60 Score!`;
      this.healPlayer(collector, 30);
      this.healPlayer(collector.id === 1 ? this.p2 : this.p1, 10);
      this.addScore(collector.id, 60);
    } else if (kind === 'valve_blessing') {
      polarity = 'good';
      effectName = 'Valve Blessing';
      const leaking = this.taps.filter((t) => t.leaking).slice(0, 2);
      for (const tap of leaking) {
        tap.leaking = false;
        tap.fixProgress = 1;
        tap.totalFixed += 1;
        this.tapsFixed += 1;
        this.emitParticles(tap.x, tap.y, '#34D399', 10, 'spark');
      }
      this.spoilHazards.length = 0;
      this.waterSavedLiters += 20;
      this.addScore(collector.id, 80);
      summary =
        leaking.length > 0
          ? `Fixed ${leaking.length} leaking tap${leaking.length > 1 ? 's' : ''}, cleared clouds & +20L!`
          : 'Cleared spoil clouds & added +20L water saved!';
    } else if (kind === 'harvest_jackpot') {
      polarity = 'good';
      effectName = 'Harvest Jackpot';
      for (const f of this.foodItems) {
        f.freshness = 1;
      }
      this.addScore(1, 75);
      this.addScore(2, 75);
      summary = '+150 Team Score & all food refreshed to 100%!';
    } else if (kind === 'sticky_tar') {
      polarity = 'bad';
      effectName = 'Sticky Tar';
      summary = `${collectorName} stepped in sticky tar (-32% Speed for 7s)!`;
      this.upsertTimedPickupEffect({
        id: this.nextId('eff'),
        kind,
        name: effectName,
        polarity,
        summary,
        targetPlayer: collector.id,
        remainingSec: 7,
        durationSec: 7,
      });
    } else if (kind === 'pipe_gremlin') {
      polarity = 'bad';
      effectName = 'Pipe Gremlin';
      const dry = this.taps.filter((t) => !t.leaking);
      const count = Math.min(2, dry.length);
      for (let k = 0; k < count; k++) {
        const pick = dry.splice(Math.floor(Math.random() * dry.length), 1)[0];
        if (pick) {
          pick.leaking = true;
          pick.severity = 1;
          pick.leakTimer = 0;
          this.addFloatingText(pick.x, pick.y - 24, 'Gremlin Leak!', '#F87171');
        }
      }
      summary =
        count > 0
          ? `Oh no! ${count} dry tap${count > 1 ? 's' : ''} started leaking!`
          : 'Gremlin rattled the pipes (all taps already leaking)!';
    } else if (kind === 'box_trap') {
      polarity = 'bad';
      effectName = 'Shock Trap';
      const rawDmg = this.seniorMode ? 8 : 15;
      const dmg = Math.max(2, Math.round(rawDmg * (this.mysteryModifier?.hazardDamageMultiplier ?? 1)));
      const floorHp = this.mode === 'tutorial' ? 20 : 5;
      const actualDmg = Math.min(dmg, Math.max(0, collector.health - floorHp));
      if (actualDmg > 0) {
        collector.health = Math.max(floorHp, collector.health - actualDmg);
        collector.invulnTimer = 0.9;
        collector.damageFlashTimer = 0.45;
      }
      summary = `${collectorName} triggered a shock trap (-${actualDmg} HP)!`;
    } else {
      polarity = 'bad';
      effectName = 'Heat Flash';
      summary = 'Food spoils 2x faster & puddles dry sooner for 8s!';
      this.upsertTimedPickupEffect({
        id: this.nextId('eff'),
        kind,
        name: effectName,
        polarity,
        summary,
        targetPlayer: 'all',
        remainingSec: 8,
        durationSec: 8,
      });
    }

    soundFx.playMysteryPickupReveal(polarity);
    this.emitParticles(
      x,
      y,
      polarity === 'good' ? '#34D399' : '#F43F5E',
      18,
      polarity === 'good' ? 'heart' : 'spark'
    );
    this.addFloatingText(
      x,
      y - 24,
      `${polarity === 'good' ? 'GOOD!' : 'TRAP!'} ${effectName}`,
      polarity === 'good' ? '#34D399' : '#FB7185'
    );

    this.lastMysteryReveal = {
      id: this.nextId('rev'),
      collectorId: collector.id,
      collectorName,
      effectName,
      polarity,
      summary,
    };
    this.lastMysteryRevealTimer = 4.2;

    this.pushMajorAlert(
      `mystery-${polarity}-${kind}`,
      `Mystery Box (${polarity === 'good' ? 'Good' : 'Bad'}): ${effectName}!`,
      summary,
      polarity === 'good' ? 'success' : 'danger',
      3,
      0,
      3.8
    );
  }

  private upsertTimedPickupEffect(nextEff: ActivePickupEffect) {
    const existingIdx = this.activePickupEffects.findIndex(
      (e) => e.kind === nextEff.kind && e.targetPlayer === nextEff.targetPlayer
    );
    if (existingIdx >= 0) {
      this.activePickupEffects[existingIdx] = nextEff;
    } else {
      this.activePickupEffects.push(nextEff);
    }
  }

  public getHudSnapshot(): GameHudSnapshot {
    const p1Reach = this.getActionReach(1);
    const p2Reach = this.getActionReach(2);
    const p1NearPuddle = this.puddles.some(
      (p) => dist(this.p1.x, this.p1.y, p.x, p.y) < p1Reach
    );
    const p1NearTap = this.taps.some(
      (t) => t.leaking && dist(this.p1.x, this.p1.y, t.x, t.y) < p1Reach
    );
    const p2NearFood = this.foodItems.some(
      (f) => dist(this.p2.x, this.p2.y, f.x, f.y) < p2Reach
    );
    const p2NearOrphanage = rectContainsCircle(
      this.level.orphanageZone,
      this.p2.x,
      this.p2.y
    );

    let p1NearbyHint: string | null = null;
    if (p1NearTap) p1NearbyHint = 'Fix Tap Nearby';
    else if (p1NearPuddle) p1NearbyHint = 'Scoop Water';
    else if (this.waterCarryingLiters > 0) p1NearbyHint = 'Go to Water Tank (+50%)';

    let p2NearbyHint: string | null = null;
    if (p2NearOrphanage && this.p2.carryingCount > 0) p2NearbyHint = 'Giving Meals!';
    else if (p2NearFood) p2NearbyHint = 'Grab Food';
    else if (this.p2.carryingCount > 0) p2NearbyHint = 'Go to Orphanage or press Send';

    const { daylightLevel, timeOfDay } = this.getDaylightState();

    return {
      mode: this.mode,
      timeRemaining: this.timeRemaining,
      timeOfDay,
      daylightLevel,
      p1Health: Math.round(this.p1.health),
      p2Health: Math.round(this.p2.health),
      p1MaxHealth: Math.round(this.p1.maxHealth),
      p2MaxHealth: Math.round(this.p2.maxHealth),
      gameOverReason: this.gameOverReason,
      waterSavedLiters: Math.round(this.waterSavedLiters),
      waterWastedLiters: Math.round(this.waterWastedLiters),
      waterCarryingLiters: Math.round(this.waterCarryingLiters),
      tapsFixed: this.tapsFixed,
      activeLeaks: this.taps.filter((t) => t.leaking).length,
      mealsDonated: this.mealsDonated,
      foodCarryingCount: this.p2.carryingCount,
      foodSpoiledCount: this.foodSpoiledCount,
      activeFoodCount: this.foodItems.length,
      p1Score: this.p1Score,
      p2Score: this.p2Score,
      teamScore: this.p1Score + this.p2Score,
      p1NearbyHint,
      p2NearbyHint,
      p1CanScoop: p1NearPuddle,
      p1CanFixTap: p1NearTap,
      p2CanGrab: p2NearFood && this.p2.carryingCount < this.p2.carryingMax,
      p2CanSend: this.p2.carryingCount > 0 || p2NearFood,
      orphanageBannerTimer: this.orphanageBannerTimer,
      lastOrphanageDelivery: this.lastOrphanageDelivery,
      majorAlert: this.majorAlert,
      mysteryBoxesCollected: this.mysteryBoxesCollected,
      activeMysteryPickupCount: this.mysteryPickups.length,
      activePickupEffects: this.activePickupEffects.map((e) => ({ ...e })),
      lastMysteryReveal: this.lastMysteryReveal ? { ...this.lastMysteryReveal } : null,
      boss: this.boss
        ? {
            name: this.boss.name,
            hp: this.boss.hp,
            maxHp: this.boss.maxHp,
            phase: this.boss.phase,
          }
        : null,
      tutorial: this.tutorial ? { ...this.tutorial } : null,
    };
  }

  public renderSplitScreen(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    orientation: Exclude<SplitOrientation, 'auto'>
  ) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const divider = 4;
    if (orientation === 'side-by-side') {
      const halfW = Math.floor((canvasWidth - divider) / 2);
      // Left Viewport: Player 1
      this.renderViewport(ctx, 0, 0, halfW, canvasHeight, this.p1, 1);
      // Right Viewport: Player 2
      this.renderViewport(ctx, halfW + divider, 0, canvasWidth - halfW - divider, canvasHeight, this.p2, 2);

      // Center Architectural Divider
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(halfW, 0, divider, canvasHeight);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(halfW + 1, 0, 1, canvasHeight);
    } else {
      const halfH = Math.floor((canvasHeight - divider) / 2);
      // Top Viewport: Player 1
      this.renderViewport(ctx, 0, 0, canvasWidth, halfH, this.p1, 1);
      // Bottom Viewport: Player 2
      this.renderViewport(ctx, 0, halfH + divider, canvasWidth, canvasHeight - halfH - divider, this.p2, 2);

      // Horizontal Divider
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, halfH, canvasWidth, divider);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, halfH + 1, canvasWidth, 1);
    }
  }

  private renderViewport(
    ctx: CanvasRenderingContext2D,
    vx: number,
    vy: number,
    vw: number,
    vh: number,
    focusPlayer: PlayerRuntime,
    playerIndex: 1 | 2
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();

    // Camera zoom adapts cleanly so smaller mobile halves still show generous surroundings
    const zoom = vw < 420 || vh < 340 ? 0.78 : 0.96;
    const viewWorldW = vw / zoom;
    const viewWorldH = vh / zoom;

    const camLeft = clamp(
      focusPlayer.cameraX - viewWorldW / 2,
      0,
      Math.max(0, this.level.worldWidth - viewWorldW)
    );
    const camTop = clamp(
      focusPlayer.cameraY - viewWorldH / 2,
      0,
      Math.max(0, this.level.worldHeight - viewWorldH)
    );

    ctx.translate(vx, vy);
    ctx.scale(zoom, zoom);
    ctx.translate(-camLeft, -camTop);

    // 1. Floor
    drawWorldFloor(ctx, this.level, this.elapsedTime);

    // 2. Zones (Cistern + Orphanage)
    drawZones(ctx, this.level, this.elapsedTime, this.orphanageBannerTimer);

    // 2b. Food Station Floor Mats (walkable ground layer)
    for (const st of this.level.foodStations) {
      drawFoodStationMat(ctx, st);
    }

    // 3. Puddles, Spoil Hazard Clouds & Boss Telegraph Rings
    for (const puddle of this.puddles) {
      drawPuddle(ctx, puddle, this.elapsedTime);
    }
    for (const hz of this.spoilHazards) {
      drawSpoilHazard(ctx, hz, this.elapsedTime);
    }
    for (const tg of this.bossTelegraphs) {
      drawBossTelegraph(ctx, tg, this.elapsedTime);
    }

    // 4. Taps
    for (const tap of this.taps) {
      drawTap(ctx, tap, this.elapsedTime);
    }

    // 4b. Clear target rings for reachable items in the focused player's viewport
    const reach = this.getActionReach(playerIndex);
    if (playerIndex === 1) {
      const nearTap = this.taps
        .filter((t) => t.leaking && dist(this.p1.x, this.p1.y, t.x, t.y) < reach)
        .sort((a, b) => dist(this.p1.x, this.p1.y, a.x, a.y) - dist(this.p1.x, this.p1.y, b.x, b.y))[0];
      if (nearTap) {
        drawTargetHighlight(ctx, nearTap.x, nearTap.y, 28, '#2DD4BF', this.elapsedTime);
      }
      const nearPuddle = this.puddles
        .filter((p) => dist(this.p1.x, this.p1.y, p.x, p.y) < reach)
        .sort((a, b) => dist(this.p1.x, this.p1.y, a.x, a.y) - dist(this.p1.x, this.p1.y, b.x, b.y))[0];
      if (nearPuddle) {
        drawTargetHighlight(ctx, nearPuddle.x, nearPuddle.y, nearPuddle.radius + 6, '#38BDF8', this.elapsedTime);
      }
    } else if (this.p2.carryingCount < this.p2.carryingMax) {
      const nearFood = this.foodItems
        .filter((f) => dist(this.p2.x, this.p2.y, f.x, f.y) < reach)
        .sort((a, b) => dist(this.p2.x, this.p2.y, a.x, a.y) - dist(this.p2.x, this.p2.y, b.x, b.y))[0];
      if (nearFood) {
        drawTargetHighlight(ctx, nearFood.x, nearFood.y, 24, '#FBBF24', this.elapsedTime);
      }
    }

    // 5. Depth-sorted Stalls, Obstacles, Food Items, Mystery Boxes & Players by visual base Y
    const depthDrawables: Array<{ sortY: number; draw: () => void }> = [];

    for (const st of this.level.foodStations) {
      depthDrawables.push({
        sortY: st.y + 2,
        draw: () => drawFoodStation(ctx, st),
      });
    }
    for (const obs of this.level.obstacles) {
      depthDrawables.push({
        sortY: obs.y + obs.h,
        draw: () => drawObstacle(ctx, obs, this.elapsedTime),
      });
    }
    for (const item of this.foodItems) {
      depthDrawables.push({
        sortY: item.y + 8,
        draw: () => drawFoodItem(ctx, item, this.elapsedTime),
      });
    }
    for (const box of this.mysteryPickups) {
      depthDrawables.push({
        sortY: box.y + 10,
        draw: () => drawMysteryPickup(ctx, box, this.elapsedTime),
      });
    }
    for (const pl of [this.p1, this.p2]) {
      const custom = pl.id === 1 ? this.p1Custom : this.p2Custom;
      const carryRatio =
        pl.id === 1
          ? this.waterCarryingLiters / this.p1.carryingMax
          : pl.carryingCount / this.p2.carryingMax;
      depthDrawables.push({
        sortY: pl.y + 13,
        draw: () => {
          drawPlayerPickupAura(ctx, pl, this.activePickupEffects, this.elapsedTime);
          drawPlayerSprite(
            ctx,
            pl.x,
            pl.y,
            pl.facingAngle,
            pl.walkCycle,
            custom,
            pl.id,
            carryRatio,
            pl.actionAnimTimer
          );
        },
      });
    }

    if (this.boss && this.boss.hp > 0) {
      const bossRef = this.boss;
      depthDrawables.push({
        sortY: bossRef.y + 32,
        draw: () => drawBossEntity(ctx, bossRef, this.elapsedTime),
      });
    }

    depthDrawables.sort((a, b) => a.sortY - b.sortY);
    for (const entry of depthDrawables) {
      entry.draw();
    }

    // 6. Courier Boxes & Boss Eco-Beams (flying overhead)
    for (const box of this.couriers) {
      drawCourierBox(ctx, box);
    }
    for (const beam of this.bossBeams) {
      drawBossBeam(ctx, beam);
    }

    // 7. Player Labels & Health Bars (always legible on top)
    for (const pl of [this.p1, this.p2]) {
      const custom = pl.id === 1 ? this.p1Custom : this.p2Custom;
      drawPlayerLabel(ctx, pl, custom);
    }

    // 10. Particles & Floating Text
    for (const pt of this.particles) {
      drawParticle(ctx, pt);
    }
    for (const ft of this.floatingTexts) {
      drawFloatingText(ctx, ft);
    }

    // 11. Subtle Offscreen Waypoint Guide for Player's Primary Objective
    this.drawObjectivePointer(ctx, focusPlayer, playerIndex, camLeft, camTop, viewWorldW, viewWorldH);

    ctx.restore();

    // 12. Day / Dusk / Night / Dawn Atmospheric Lighting Layer
    const { daylightLevel, timeOfDay } = this.getDaylightState();
    drawDayNightAtmosphere(
      ctx,
      vx,
      vy,
      vw,
      vh,
      camLeft,
      camTop,
      zoom,
      this.level,
      daylightLevel,
      timeOfDay,
      this.p1,
      this.p2,
      this.taps,
      this.elapsedTime,
      this.mysteryPickups
    );

    // Subtle viewport corner label
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.beginPath();
    ctx.roundRect(vx + 10, vy + 10, 152, 24, 6);
    ctx.fill();
    ctx.fillStyle = playerIndex === 1 ? '#38BDF8' : '#FBBF24';
    ctx.font = '700 11px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    const customName = playerIndex === 1 ? this.p1Custom.name : this.p2Custom.name;
    ctx.fillText(
      `P${playerIndex} · ${customName.slice(0, 14)}`,
      vx + 18,
      vy + 26
    );
    ctx.restore();
  }

  private drawObjectivePointer(
    ctx: CanvasRenderingContext2D,
    player: PlayerRuntime,
    playerIndex: 1 | 2,
    camLeft: number,
    camTop: number,
    vw: number,
    vh: number
  ) {
    let target: { x: number; y: number } | null = null;
    let color = '#38BDF8';

    if (playerIndex === 1) {
      if (this.mode === 'tutorial' && this.tutorial && !this.tutorial.p1BankTank && this.waterCarryingLiters > 0) {
        target = {
          x: this.level.cisternZone.x + this.level.cisternZone.w / 2,
          y: this.level.cisternZone.y + this.level.cisternZone.h / 2,
        };
        color = '#38BDF8';
      } else {
        const leakingTap = this.taps
          .filter((t) => t.leaking)
          .sort((a, b) => dist(player.x, player.y, a.x, a.y) - dist(player.x, player.y, b.x, b.y))[0];
        if (leakingTap) {
          target = leakingTap;
          color = '#EF4444';
        } else if (this.puddles.length > 0) {
          target = this.puddles[0];
          color = '#38BDF8';
        }
      }
    } else {
      if (player.carryingCount >= player.carryingMax) {
        target = {
          x: this.level.orphanageZone.x + this.level.orphanageZone.w / 2,
          y: this.level.orphanageZone.y + this.level.orphanageZone.h / 2,
        };
        color = '#10B981';
      } else if (this.foodItems.length > 0) {
        const urgentFood = [...this.foodItems].sort((a, b) => a.freshness - b.freshness)[0];
        target = urgentFood;
        color = '#F59E0B';
      }
    }

    if (!target) return;
    const inView =
      target.x >= camLeft + 24 &&
      target.x <= camLeft + vw - 24 &&
      target.y >= camTop + 24 &&
      target.y <= camTop + vh - 24;
    if (inView) return;

    const angle = Math.atan2(target.y - player.y, target.x - player.x);
    const px = clamp(
      player.x + Math.cos(angle) * Math.min(vw * 0.36, 150),
      camLeft + 26,
      camLeft + vw - 26
    );
    const py = clamp(
      player.y + Math.sin(angle) * Math.min(vh * 0.36, 130),
      camTop + 26,
      camTop + vh - 26
    );

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
