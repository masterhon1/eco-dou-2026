import {
  ActivePickupEffect,
  BossBeam,
  BossState,
  BossTelegraph,
  CourierBox,
  FloatingText,
  FoodItem,
  FoodStationConfig,
  LevelConfig,
  MysteryPickupItem,
  Particle,
  PlayerCustomization,
  PlayerRuntime,
  SpoilHazard,
  TapRuntime,
  TimeOfDayPhase,
  WaterPuddle,
  WorldObstacle,
} from './types';

let lightMaskCanvas: HTMLCanvasElement | null = null;

// Offscreen floor texture cache so detailed stone/cobble/tile shading runs at 60fps
const floorCache = new Map<string, HTMLCanvasElement>();

function seededRand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function getOrCreateFloorCanvas(level: LevelConfig): HTMLCanvasElement {
  const key = `${level.id}_${level.worldWidth}_${level.worldHeight}`;
  const cached = floorCache.get(key);
  if (cached) return cached;

  const off = document.createElement('canvas');
  off.width = level.worldWidth;
  off.height = level.worldHeight;
  const ctx = off.getContext('2d');
  if (!ctx) return off;

  const { worldWidth: w, worldHeight: h, floorTheme } = level;

  if (floorTheme === 'courtyard') {
    ctx.fillStyle = '#DCD3BE';
    ctx.fillRect(0, 0, w, h);

    // Individual natural travertine flagstones with subtle tonal variation
    const tile = 56;
    for (let gx = 0; gx < w; gx += tile) {
      for (let gy = 0; gy < h; gy += tile) {
        const r = seededRand(gx * 31 + gy * 17);
        const shade = Math.floor((r - 0.5) * 16);
        ctx.fillStyle = `rgb(${224 + shade}, ${215 + shade}, ${195 + shade})`;
        ctx.beginPath();
        ctx.roundRect(gx + 2, gy + 2, tile - 4, tile - 4, 4);
        ctx.fill();

        // Subtle stone speckle
        ctx.fillStyle = 'rgba(87, 83, 78, 0.08)';
        ctx.beginPath();
        ctx.arc(gx + 14 + r * 26, gy + 16 + r * 20, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Garden lawn border + dark wood trim
    const grassGrad = ctx.createLinearGradient(0, 0, 0, 36);
    grassGrad.addColorStop(0, '#2F5E2E');
    grassGrad.addColorStop(1, '#4A7C44');
    ctx.fillStyle = '#3F6E3B';
    ctx.fillRect(0, 0, w, 30);
    ctx.fillRect(0, h - 30, w, 30);
    ctx.fillRect(0, 0, 30, h);
    ctx.fillRect(w - 30, 0, 30, h);

    // Grass blade texture along perimeter
    ctx.fillStyle = 'rgba(134, 239, 172, 0.22)';
    for (let i = 10; i < w - 10; i += 14) {
      const jy = seededRand(i) * 16;
      ctx.fillRect(i, 6 + jy, 2, 6);
      ctx.fillRect(i, h - 22 + jy, 2, 6);
    }

    // Curb stone edge
    ctx.strokeStyle = '#9C9281';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, w - 60, h - 60);
  } else if (floorTheme === 'cafeteria') {
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(0, 0, w, h);

    const tile = 48;
    for (let gx = 0; gx < w; gx += tile) {
      for (let gy = 0; gy < h; gy += tile) {
        const checker = ((gx / tile) + (gy / tile)) % 2 === 0;
        const r = seededRand(gx * 13 + gy * 29);
        const base = checker ? 236 : 224;
        const delta = Math.floor((r - 0.5) * 6);
        ctx.fillStyle = `rgb(${base + delta}, ${base + delta + 2}, ${base + delta + 5})`;
        ctx.fillRect(gx + 1, gy + 1, tile - 2, tile - 2);
      }
    }

    // Polished floor reflection sheen
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(15,23,42,0.06)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    // Architectural interior walls with trim
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 22;
    ctx.strokeRect(11, 11, w - 22, h - 22);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    ctx.strokeRect(22, 22, w - 44, h - 44);
  } else if (floorTheme === 'market') {
    ctx.fillStyle = '#C9B99F';
    ctx.fillRect(0, 0, w, h);

    // Organic varied cobblestones
    for (let y = 0; y < h; y += 30) {
      const offset = ((y / 30) % 2) * 23;
      for (let x = -23; x < w; x += 46) {
        const r = seededRand(x * 19 + y * 23);
        const shade = Math.floor((r - 0.5) * 20);
        ctx.fillStyle = `rgb(${208 + shade}, ${194 + shade}, ${168 + shade})`;
        ctx.beginPath();
        ctx.roundRect(x + offset + 2, y + 2, 42, 26, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(68, 64, 60, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Warm brick pedestrian promenade across center
    ctx.fillStyle = 'rgba(180, 83, 9, 0.14)';
    ctx.fillRect(0, h * 0.42, w, 126);
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.42);
    ctx.lineTo(w, h * 0.42);
    ctx.moveTo(0, h * 0.42 + 126);
    ctx.lineTo(w, h * 0.42 + 126);
    ctx.stroke();
  } else {
    // Metro Eco Plaza — terrazzo & radial granite pavers
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(0, 0, w, h);

    const tile = 64;
    for (let gx = 0; gx < w; gx += tile) {
      for (let gy = 0; gy < h; gy += tile) {
        const r = seededRand(gx * 17 + gy * 41);
        const s = Math.floor((r - 0.5) * 10);
        ctx.fillStyle = `rgb(${216 + s}, ${224 + s}, ${234 + s})`;
        ctx.fillRect(gx + 1, gy + 1, tile - 2, tile - 2);
      }
    }

    // Radial architectural plaza rings
    ctx.strokeStyle = 'rgba(14, 116, 144, 0.18)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 230, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(15, 118, 110, 0.14)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 345, 0, Math.PI * 2);
    ctx.stroke();

    // Lush park edge
    ctx.fillStyle = '#365314';
    ctx.fillRect(0, 0, w, 24);
    ctx.fillRect(0, h - 24, w, 24);
    ctx.fillRect(0, 0, 24, h);
    ctx.fillRect(w - 24, 0, 24, h);
  }

  floorCache.set(key, off);
  return off;
}

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facingAngle: number,
  walkCycle: number,
  custom: PlayerCustomization,
  roleId: 1 | 2,
  carryingRatio: number,
  actionAnimTimer: number,
  scale = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Soft ambient contact shadow + directional cast shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.beginPath();
  ctx.ellipse(3, 15, 17, 8.5, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 13, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const stride = Math.sin(walkCycle) * 5.2;
  const bob = Math.abs(Math.cos(walkCycle)) * 1.9;

  // Articulated boots/shoes
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.ellipse(-5.5, 11.5 + stride * 0.48, 4.8, 3.2, 0, 0, Math.PI * 2);
  ctx.ellipse(5.5, 11.5 - stride * 0.48, 4.8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(-5.5, 10.5 + stride * 0.48, 2.2, 0, Math.PI * 2);
  ctx.arc(5.5, 10.5 - stride * 0.48, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bob);

  // Backpack / Carrier behind torso
  if (roleId === 1) {
    // Pressurized Hydro Water Tank with metallic caps & sight glass
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(-13, -9, 26, 17, 5);
    ctx.fill();
    ctx.fillStyle = '#075985';
    ctx.beginPath();
    ctx.roundRect(-10, -7, 20, 13, 3);
    ctx.fill();
    const fillW = Math.max(0, Math.min(1, carryingRatio)) * 18;
    if (fillW > 0) {
      const tankGrad = ctx.createLinearGradient(-9, -6, -9, 5);
      tankGrad.addColorStop(0, '#7DD3FC');
      tankGrad.addColorStop(1, '#0284C7');
      ctx.fillStyle = tankGrad;
      ctx.beginPath();
      ctx.roundRect(-9, -6, fillW, 11, 2);
      ctx.fill();
    }
    // Specular glass highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(-8, -5, 16, 2);
  } else {
    // Insulated Woven Thermal Food Carrier
    ctx.fillStyle = '#451A03';
    ctx.beginPath();
    ctx.roundRect(-13, -10, 26, 18, 5);
    ctx.fill();
    ctx.fillStyle = carryingRatio > 0 ? '#D97706' : '#78350F';
    ctx.beginPath();
    ctx.roundRect(-10, -7, 20, 12, 3);
    ctx.fill();
    if (carryingRatio > 0) {
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(-6, -4, 12, 4);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(-2, -3, 4, 2);
    }
  }

  // Torso / Jacket with subtle gradient shading
  const torsoGrad = ctx.createLinearGradient(-11, -7, 11, 13);
  torsoGrad.addColorStop(0, custom.primaryColor);
  torsoGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = custom.primaryColor;
  ctx.beginPath();
  ctx.roundRect(-11.5, -6.5, 23, 19, 7.5);
  ctx.fill();

  // Subtle jacket shading overlay
  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.beginPath();
  ctx.roundRect(0, -6.5, 11.5, 19, [0, 7.5, 7.5, 0]);
  ctx.fill();

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-11.5, -6.5, 23, 19, 7.5);
  ctx.stroke();

  // Outfit details
  if (custom.outfit === 'plumber') {
    ctx.fillStyle = custom.accentColor;
    ctx.fillRect(-7, -5.5, 3.5, 14);
    ctx.fillRect(3.5, -5.5, 3.5, 14);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-11.5, 6, 23, 3.8);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-2, 6, 4, 3.8);
  } else if (custom.outfit === 'chef') {
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(-7.5, -3.5, 15, 14.5, 3);
    ctx.fill();
    ctx.fillStyle = custom.accentColor;
    ctx.fillRect(-2.5, -3.5, 5, 3);
  } else if (custom.outfit === 'ranger') {
    ctx.fillStyle = custom.accentColor;
    ctx.beginPath();
    ctx.roundRect(-9, -2, 6, 7, 1.5);
    ctx.roundRect(3, -2, 6, 7, 1.5);
    ctx.fill();
  } else {
    ctx.strokeStyle = custom.accentColor;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(8, 10);
    ctx.stroke();
  }

  // Swinging arms with sleeves
  const armReach = actionAnimTimer > 0 ? Math.sin(actionAnimTimer * 24) * 5 + 4 : 0;
  ctx.fillStyle = custom.primaryColor;
  ctx.beginPath();
  ctx.arc(-12.5, 1 + stride * 0.35, 4.2, 0, Math.PI * 2);
  ctx.arc(12.5 + armReach * 0.3, 1 - stride * 0.35, 4.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = custom.skinTone;
  ctx.beginPath();
  ctx.arc(-13.5, 3 + stride * 0.45, 3.3, 0, Math.PI * 2);
  ctx.arc(13.5 + armReach * 0.45, 3 - stride * 0.45, 3.3, 0, Math.PI * 2);
  ctx.fill();

  // Action tool animation
  if (actionAnimTimer > 0 && roleId === 1) {
    ctx.save();
    ctx.translate(17, -2);
    ctx.rotate(-0.5 + Math.sin(actionAnimTimer * 28) * 0.55);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(0, -8);
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(0, -9, 4, 0.4, Math.PI * 1.7);
    ctx.fill();
    ctx.restore();
  }

  // Head with subtle cheek shadow
  ctx.fillStyle = custom.skinTone;
  ctx.beginPath();
  ctx.arc(0, -12.5, 10.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
  ctx.beginPath();
  ctx.arc(2, -11.5, 9.5, -0.5, Math.PI * 0.85);
  ctx.fill();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -12.5, 10.8, 0, Math.PI * 2);
  ctx.stroke();

  // Eyes oriented toward facing direction
  const lookX = Math.cos(facingAngle) * 2.6;
  const lookY = Math.sin(facingAngle) * 1.6;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-3.2 + lookX, -11.8 + lookY, 1.5, 0, Math.PI * 2);
  ctx.arc(3.2 + lookX, -11.8 + lookY, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Eye catchlights
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-3.6 + lookX, -12.3 + lookY, 0.55, 0, Math.PI * 2);
  ctx.arc(2.8 + lookX, -12.3 + lookY, 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Hat / Hair
  if (custom.hat === 'none') {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(0, -15.5, 10.4, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (custom.hat === 'cap') {
    ctx.fillStyle = custom.primaryColor;
    ctx.beginPath();
    ctx.arc(0, -15, 10.8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = custom.accentColor;
    ctx.beginPath();
    ctx.ellipse(lookX * 1.4, -15, 11.2, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (custom.hat === 'hardhat') {
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, -15.5, 11.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#CA8A04';
    ctx.fillRect(-13, -16.5, 26, 3.2);
    ctx.fillStyle = '#FEF9C3';
    ctx.fillRect(-2, -25.5, 4, 8.5);
  } else if (custom.hat === 'toque') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(-8.5, -24.5, 17, 10, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-5, -25.5, 5.5, 0, Math.PI * 2);
    ctx.arc(0, -27.5, 6.2, 0, Math.PI * 2);
    ctx.arc(5, -25.5, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (custom.hat === 'visor') {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(0, -15.5, 10.2, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = custom.accentColor;
    ctx.fillRect(-10.5, -17.5, 21, 3.8);
  }

  ctx.restore();
}

export function drawWorldFloor(ctx: CanvasRenderingContext2D, level: LevelConfig, time: number) {
  const off = getOrCreateFloorCanvas(level);
  ctx.drawImage(off, 0, 0);

  // Dynamic sunlight shafts / dappled illumination over the static ground
  ctx.save();
  if (level.floorTheme === 'cafeteria') {
    ctx.fillStyle = 'rgba(254, 243, 199, 0.22)';
    ctx.beginPath();
    ctx.moveTo(140, 22);
    ctx.lineTo(360, 22);
    ctx.lineTo(540, level.worldHeight - 22);
    ctx.lineTo(290, level.worldHeight - 22);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(640, 22);
    ctx.lineTo(820, 22);
    ctx.lineTo(990, level.worldHeight - 22);
    ctx.lineTo(790, level.worldHeight - 22);
    ctx.closePath();
    ctx.fill();
  } else {
    // Gentle swaying tree canopy shadows along corners
    const sway = Math.sin(time * 0.9) * 6;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.beginPath();
    ctx.arc(70 + sway, 60, 75, 0, Math.PI * 2);
    ctx.arc(level.worldWidth - 65 - sway, level.worldHeight - 55, 85, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawZones(
  ctx: CanvasRenderingContext2D,
  level: LevelConfig,
  time: number,
  orphanageBannerTimer: number
) {
  // 1. Rain Cistern / Greywater Tank (Water Guardian Drop-off)
  const c = level.cisternZone;
  ctx.save();
  ctx.fillStyle = 'rgba(14, 165, 233, 0.1)';
  ctx.strokeStyle = '#0284C7';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.roundRect(c.x, c.y, c.w, c.h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2 - 4;

  // Cast shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx + 5, cy + 28, 38, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Metallic cylinder body with horizontal ribs
  const cylGrad = ctx.createLinearGradient(cx - 36, cy, cx + 36, cy);
  cylGrad.addColorStop(0, '#0C4A6E');
  cylGrad.addColorStop(0.35, '#0284C7');
  cylGrad.addColorStop(0.65, '#0369A1');
  cylGrad.addColorStop(1, '#082F49');
  ctx.fillStyle = cylGrad;
  ctx.beginPath();
  ctx.roundRect(cx - 35, cy - 22, 70, 50, 6);
  ctx.fill();

  // Structural metal bands
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 35, cy - 4);
  ctx.lineTo(cx + 35, cy - 4);
  ctx.moveTo(cx - 35, cy + 12);
  ctx.lineTo(cx + 35, cy + 12);
  ctx.stroke();

  // Open top water basin
  ctx.fillStyle = '#0EA5E9';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 22, 35, 11.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#E0F2FE';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const wave = Math.sin(time * 3.2) * 3;
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.78)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 22, 18 + wave, 5 + wave * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#0C4A6E';
  ctx.font = '700 11.5px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(c.label.toUpperCase(), cx, c.y + c.h - 10);
  ctx.restore();

  // 2. Sunny Haven Orphanage Entrance Zone
  const o = level.orphanageZone;
  ctx.save();
  const pulse = orphanageBannerTimer > 0 ? 0.3 : 0.12;
  ctx.fillStyle = `rgba(245, 158, 11, ${pulse})`;
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = orphanageBannerTimer > 0 ? 3.5 : 2.5;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.roundRect(o.x, o.y, o.w, o.h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  const ox = o.x + o.w / 2;
  const oy = o.y + o.h / 2 - 8;

  // Porch shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.beginPath();
  ctx.roundRect(ox - 50, oy - 28, 112, 58, 8);
  ctx.fill();

  // Brick facade + stone steps
  ctx.fillStyle = '#D6D3D1';
  ctx.fillRect(ox - 20, oy + 14, 40, 10);
  ctx.fillStyle = '#9A3412';
  ctx.beginPath();
  ctx.roundRect(ox - 56, oy - 36, 112, 54, 8);
  ctx.fill();

  // Subtle brick mortar lines
  ctx.strokeStyle = 'rgba(254, 215, 170, 0.16)';
  ctx.lineWidth = 1;
  for (let by = oy - 28; by < oy + 12; by += 8) {
    ctx.beginPath();
    ctx.moveTo(ox - 54, by);
    ctx.lineTo(ox + 54, by);
    ctx.stroke();
  }

  // Pitched shingle roof trim
  ctx.fillStyle = '#7C2D12';
  ctx.beginPath();
  ctx.roundRect(ox - 60, oy - 41, 120, 12, 4);
  ctx.fill();

  // Warm glowing paned windows
  [ox - 42, ox + 22].forEach((wx) => {
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(wx, oy - 22, 20, 18);
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(wx, oy - 22, 20, 18);
    ctx.beginPath();
    ctx.moveTo(wx + 10, oy - 22);
    ctx.lineTo(wx + 10, oy - 4);
    ctx.moveTo(wx, oy - 13);
    ctx.lineTo(wx + 20, oy - 13);
    ctx.stroke();
  });

  // Wooden double doors
  ctx.fillStyle = '#451A03';
  ctx.fillRect(ox - 13, oy - 18, 26, 36);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(ox, oy - 18);
  ctx.lineTo(ox, oy + 18);
  ctx.stroke();

  // Celebration heart-pulse when delivery lands
  if (orphanageBannerTimer > 0) {
    const bounce = Math.abs(Math.sin(time * 9)) * 6;
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(ox, oy - 48 - bounce, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#78350F';
  ctx.font = '700 11.5px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(o.label.toUpperCase(), ox, o.y + o.h - 20);
  ctx.fillStyle = '#B45309';
  ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('WALK IN TO GIVE MEALS', ox, o.y + o.h - 7);
  ctx.restore();
}

export function drawObstacle(ctx: CanvasRenderingContext2D, obs: WorldObstacle, time: number) {
  ctx.save();
  // Ambient cast shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
  ctx.beginPath();
  ctx.roundRect(obs.x + 5, obs.y + 7, obs.w, obs.h, 10);
  ctx.fill();

  if (obs.kind === 'planter') {
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 10);
    ctx.fill();
    ctx.fillStyle = '#14532D';
    ctx.beginPath();
    ctx.roundRect(obs.x + 7, obs.y + 7, obs.w - 14, obs.h - 14, 7);
    ctx.fill();

    // Layered botanical leaves
    for (let lx = obs.x + 22; lx < obs.x + obs.w - 16; lx += 26) {
      ctx.fillStyle = '#16A34A';
      ctx.beginPath();
      ctx.arc(lx, obs.y + obs.h / 2, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ADE80';
      ctx.beginPath();
      ctx.arc(lx - 3, obs.y + obs.h / 2 - 3, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (obs.kind === 'table' || obs.kind === 'counter') {
    ctx.fillStyle = obs.kind === 'counter' ? '#475569' : '#78350F';
    ctx.beginPath();
    ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 8);
    ctx.fill();
    ctx.fillStyle = obs.kind === 'counter' ? '#E2E8F0' : '#B45309';
    ctx.beginPath();
    ctx.roundRect(obs.x + 5, obs.y + 5, obs.w - 10, obs.h - 10, 5);
    ctx.fill();

    // Wood grain or brushed steel lines
    ctx.strokeStyle = obs.kind === 'counter' ? 'rgba(100,116,139,0.35)' : 'rgba(69,26,3,0.28)';
    ctx.lineWidth = 1.2;
    for (let y = obs.y + 16; y < obs.y + obs.h - 10; y += 12) {
      ctx.beginPath();
      ctx.moveTo(obs.x + 10, y);
      ctx.lineTo(obs.x + obs.w - 10, y);
      ctx.stroke();
    }
  } else if (obs.kind === 'stall') {
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 8);
    ctx.fill();
    const stripeW = 18;
    ctx.fillStyle = '#DC2626';
    for (let sx = obs.x; sx < obs.x + obs.w; sx += stripeW * 2) {
      ctx.fillRect(sx, obs.y, Math.min(stripeW, obs.x + obs.w - sx), obs.h);
    }
    // Canopy highlight ridge
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(obs.x, obs.y + obs.h * 0.35, obs.w, 6);
    ctx.strokeStyle = '#7C2D12';
    ctx.lineWidth = 2;
    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
  } else if (obs.kind === 'fountain') {
    const cx = obs.x + obs.w / 2;
    const cy = obs.y + obs.h / 2;
    const r = Math.min(obs.w, obs.h) / 2;

    // Carved stone rim
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
    ctx.fill();

    // Deep water basin with animated ripples
    const waterGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r - 11);
    waterGrad.addColorStop(0, '#38BDF8');
    waterGrad.addColorStop(1, '#0369A1');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 11, 0, Math.PI * 2);
    ctx.fill();

    const rip = ((time * 22) % Math.max(12, r - 18)) + 8;
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, rip, 0, Math.PI * 2);
    ctx.stroke();

    // Center stone pedestal & jet
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#BAE6FD';
    ctx.beginPath();
    ctx.arc(cx, cy, 5 + Math.sin(time * 9) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawFoodStationMat(ctx: CanvasRenderingContext2D, st: FoodStationConfig) {
  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.fillStyle = 'rgba(217, 119, 6, 0.14)';
  ctx.beginPath();
  ctx.roundRect(-44, -30, 88, 60, 10);
  ctx.fill();
  ctx.restore();
}

export function drawFoodStation(ctx: CanvasRenderingContext2D, st: FoodStationConfig) {
  ctx.save();
  ctx.translate(st.x, st.y);

  // Cast shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.beginPath();
  ctx.roundRect(-33, -19, 70, 24, 5);
  ctx.fill();

  // Wooden counter + warm brass tray heater
  ctx.fillStyle = '#78350F';
  ctx.beginPath();
  ctx.roundRect(-36, -22, 72, 24, 5);
  ctx.fill();
  ctx.strokeStyle = '#451A03';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = st.kind === 'kitchen' ? '#CBD5E1' : '#FDE68A';
  ctx.beginPath();
  ctx.roundRect(-31, -18, 62, 16, 3);
  ctx.fill();

  ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(st.label).width + 12;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
  ctx.beginPath();
  ctx.roundRect(-tw / 2, 12, tw, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#FEF3C7';
  ctx.fillText(st.label, 0, 23.5);
  ctx.restore();
}

export function drawPuddle(ctx: CanvasRenderingContext2D, puddle: WaterPuddle, time: number) {
  ctx.save();
  ctx.translate(puddle.x, puddle.y);
  const pulse = 1 + Math.sin(time * 3.8 + puddle.age) * 0.035;
  const r = puddle.radius * pulse;

  // Organic multi-lobed puddle shape
  ctx.fillStyle = 'rgba(14, 165, 233, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.15, r * 0.82, 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.38, r * 0.18, r * 0.62, r * 0.45, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Inner reflective water gradient
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.2, 2, 0, 0, r);
  grad.addColorStop(0, 'rgba(186, 230, 253, 0.8)');
  grad.addColorStop(0.55, 'rgba(56, 189, 248, 0.6)');
  grad.addColorStop(1, 'rgba(2, 132, 199, 0.42)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(-1, -1, r * 0.88, r * 0.62, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Animated concentric ripple
  ctx.strokeStyle = 'rgba(240, 249, 255, 0.82)';
  ctx.lineWidth = 1.5;
  const rippleR = ((time * 18 + puddle.age * 10) % Math.max(8, r * 0.78)) + 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, rippleR, rippleR * 0.66, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Specular highlight arc
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.16, r * 0.34, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();

  ctx.font = '700 11.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeText(`${Math.round(puddle.liters)}L`, 0, 4);
  ctx.fillStyle = '#E0F2FE';
  ctx.fillText(`${Math.round(puddle.liters)}L`, 0, 4);
  ctx.restore();
}

export function drawTap(ctx: CanvasRenderingContext2D, tap: TapRuntime, time: number) {
  ctx.save();
  ctx.translate(tap.x, tap.y);

  // Alert beacon ring when leaking
  if (tap.leaking) {
    const alertPulse = 23 + Math.sin(time * 8) * 4;
    ctx.strokeStyle = tap.severity > 1 ? 'rgba(239, 68, 68, 0.82)' : 'rgba(14, 165, 233, 0.72)';
    ctx.lineWidth = tap.severity > 1 ? 3 : 2.3;
    ctx.beginPath();
    ctx.arc(0, 0, alertPulse, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tap.fixProgress > 0) {
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.88)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ground shadow + stone basin + metal drain grate
  ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
  ctx.beginPath();
  ctx.roundRect(-15, -9, 34, 26, 6);
  ctx.fill();

  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.roundRect(-17, -12, 34, 24, 6);
  ctx.fill();
  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(-13, -8, 26, 16, 4);
  ctx.fill();
  // Drain grate slots
  ctx.fillStyle = '#334155';
  ctx.fillRect(-7, -3, 14, 2);
  ctx.fillRect(-7, 1, 14, 2);

  // Brass standpipe & curved gooseneck spout
  ctx.fillStyle = '#B45309';
  ctx.fillRect(-4, -19, 8, 15);
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(0, -19, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Valve cross-handle
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-6, -24);
  ctx.lineTo(6, -24);
  ctx.stroke();

  // Spraying water arc if leaking
  if (tap.leaking) {
    ctx.strokeStyle = '#7DD3FC';
    ctx.lineWidth = tap.severity > 1 ? 4 : 2.2;
    const splash = Math.sin(time * 18) * 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.quadraticCurveTo(8, 2, 5 + splash, 14);
    ctx.stroke();

    if (tap.severity > 1) {
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.quadraticCurveTo(-7, 0, -5 - splash, 13);
      ctx.stroke();
    }
  }

  const tapText = tap.leaking ? (tap.severity > 1 ? 'BIG LEAK!' : 'LEAKING') : tap.label;
  ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(tapText).width + 12;
  ctx.fillStyle = tap.leaking ? '#DC2626' : 'rgba(15, 23, 42, 0.84)';
  ctx.beginPath();
  ctx.roundRect(-tw / 2, 16, tw, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(tapText, 0, 27.5);

  ctx.restore();
}

export function drawTargetHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  time: number
) {
  ctx.save();
  const pulse = Math.sin(time * 5) * 2.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(x, y, radius + pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawFoodItem(ctx: CanvasRenderingContext2D, item: FoodItem, time: number) {
  ctx.save();
  const bob = Math.sin(time * 3.5 + item.bobOffset) * 2.2;
  ctx.translate(item.x, item.y + bob);

  // Soft plate shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Freshness ring
  const pct = Math.max(0, Math.min(1, item.freshness));
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 17.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = pct > 0.5 ? '#10B981' : pct > 0.25 ? '#F59E0B' : '#EF4444';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 17.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.stroke();

  // Ceramic plate / wooden board
  ctx.fillStyle = '#FFFBEB';
  ctx.beginPath();
  ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (item.kind === 'bread') {
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.5, 5.2, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.ellipse(-0.5, -0.5, 8, 4, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FEF3C7';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, -2);
    ctx.lineTo(-1, 2);
    ctx.moveTo(2, -2);
    ctx.lineTo(4, 2);
    ctx.stroke();
  } else if (item.kind === 'soup') {
    ctx.fillStyle = '#C2410C';
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FB923C';
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(-2, -1, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.kind === 'fruit') {
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(-3.2, 2.2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16A34A';
    ctx.beginPath();
    ctx.arc(4, 1.2, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, -3.8, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.roundRect(-8.5, -6.5, 17, 13, 3);
    ctx.fill();
    ctx.fillStyle = '#10B981';
    ctx.fillRect(-4.5, -3.5, 9, 7);
  }

  ctx.restore();
}

export function drawCourierBox(ctx: CanvasRenderingContext2D, box: CourierBox) {
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(box.x, box.y);
  ctx.lineTo(box.targetX, box.targetY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.translate(box.x, box.y);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.roundRect(-12, -10, 24, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#FEF3C7';
  ctx.fillRect(-12, -2, 24, 4);
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = Math.max(0, p.life / p.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawFloatingText(ctx: CanvasRenderingContext2D, ft: FloatingText) {
  const alpha = Math.max(0, ft.life / ft.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '700 15px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeText(ft.text, ft.x, ft.y);
  ctx.fillStyle = ft.color;
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.restore();
}

export function drawSpoilHazard(ctx: CanvasRenderingContext2D, hazard: SpoilHazard, time: number) {
  const alpha = Math.min(1, hazard.life / 1.5) * 0.48;
  const pulse = 1 + Math.sin(time * 5 + hazard.x) * 0.08;
  ctx.save();
  ctx.translate(hazard.x, hazard.y);
  ctx.globalAlpha = alpha;
  const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, hazard.radius * pulse);
  grad.addColorStop(0, 'rgba(132, 204, 22, 0.85)');
  grad.addColorStop(0.6, 'rgba(101, 163, 13, 0.45)');
  grad.addColorStop(1, 'rgba(77, 124, 15, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, hazard.radius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawDayNightAtmosphere(
  ctx: CanvasRenderingContext2D,
  vx: number,
  vy: number,
  vw: number,
  vh: number,
  camLeft: number,
  camTop: number,
  zoom: number,
  level: LevelConfig,
  daylightLevel: number,
  timeOfDay: TimeOfDayPhase,
  p1: PlayerRuntime,
  p2: PlayerRuntime,
  taps: TapRuntime[],
  time: number,
  mysteryPickups: MysteryPickupItem[] = []
) {
  // Subtle golden dusk / dawn atmospheric warmth
  if (timeOfDay === 'dusk' || timeOfDay === 'dawn') {
    const duskStrength = timeOfDay === 'dusk' ? 0.14 : 0.11;
    ctx.save();
    ctx.fillStyle =
      timeOfDay === 'dusk'
        ? `rgba(234, 88, 12, ${duskStrength})`
        : `rgba(251, 146, 60, ${duskStrength})`;
    ctx.fillRect(vx, vy, vw, vh);
    ctx.restore();
  }

  const darkness = Math.max(0, 1 - daylightLevel);
  if (darkness <= 0.04) return;

  if (typeof document === 'undefined') return;
  if (!lightMaskCanvas) {
    lightMaskCanvas = document.createElement('canvas');
  }
  const maskW = Math.max(64, Math.ceil(vw / 2));
  const maskH = Math.max(64, Math.ceil(vh / 2));
  if (lightMaskCanvas.width !== maskW || lightMaskCanvas.height !== maskH) {
    lightMaskCanvas.width = maskW;
    lightMaskCanvas.height = maskH;
  }

  const lctx = lightMaskCanvas.getContext('2d');
  if (!lctx) return;

  lctx.save();
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, maskW, maskH);

  // Deep midnight navy overlay scaled by darkness
  const maxAlpha = 0.64;
  lctx.fillStyle = `rgba(8, 15, 34, ${(darkness * maxAlpha).toFixed(3)})`;
  lctx.fillRect(0, 0, maskW, maskH);

  // Punch soft radial light pools for visibility
  lctx.globalCompositeOperation = 'destination-out';
  const toMaskX = (wx: number) => ((wx - camLeft) * zoom) / 2;
  const toMaskY = (wy: number) => ((wy - camTop) * zoom) / 2;
  const toMaskR = (wr: number) => (wr * zoom) / 2;

  const punchLight = (wx: number, wy: number, wr: number, strength = 1) => {
    const mx = toMaskX(wx);
    const my = toMaskY(wy);
    const mr = toMaskR(wr);
    if (mx + mr < 0 || mx - mr > maskW || my + mr < 0 || my - mr > maskH) return;
    const g = lctx.createRadialGradient(mx, my, mr * 0.12, mx, my, mr);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.6})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g;
    lctx.beginPath();
    lctx.arc(mx, my, mr, 0, Math.PI * 2);
    lctx.fill();
  };

  // Player lanterns / headlamps
  punchLight(p1.x, p1.y, 185, 0.96);
  punchLight(p2.x, p2.y, 185, 0.96);

  // Orphanage warm porch floodlight
  punchLight(
    level.orphanageZone.x + level.orphanageZone.w / 2,
    level.orphanageZone.y + level.orphanageZone.h / 2,
    210,
    0.92
  );

  // Cistern beacon
  punchLight(
    level.cisternZone.x + level.cisternZone.w / 2,
    level.cisternZone.y + level.cisternZone.h / 2,
    165,
    0.85
  );

  // Food station lamps
  for (const st of level.foodStations) {
    punchLight(st.x, st.y, 120, 0.78);
  }

  // Leaking tap alert lights
  for (const t of taps) {
    if (t.leaking) {
      punchLight(t.x, t.y, 95 + Math.sin(time * 7) * 8, 0.8);
    }
  }

  // Mystery box pickup shimmer beacons
  for (const mb of mysteryPickups) {
    punchLight(mb.x, mb.y, 92 + Math.sin(time * 5 + mb.bobOffset) * 8, 0.82);
  }

  lctx.restore();

  ctx.save();
  ctx.drawImage(lightMaskCanvas, vx, vy, vw, vh);

  // Subtle warm lantern amber halo around players & orphanage when night falls
  if (darkness > 0.25) {
    const glowAlpha = Math.min(0.16, darkness * 0.16);
    const ox = vx + (level.orphanageZone.x + level.orphanageZone.w / 2 - camLeft) * zoom;
    const oy = vy + (level.orphanageZone.y + level.orphanageZone.h / 2 - camTop) * zoom;
    const og = ctx.createRadialGradient(ox, oy, 8, ox, oy, 110 * zoom);
    og.addColorStop(0, `rgba(251, 191, 36, ${glowAlpha})`);
    og.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(ox, oy, 110 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPlayerLabel(
  ctx: CanvasRenderingContext2D,
  player: PlayerRuntime,
  custom: PlayerCustomization
) {
  ctx.save();

  // Damage flash ring
  if (player.damageFlashTimer > 0) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 24, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.font = '700 12.5px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  const label = `${custom.name}`;
  const metrics = ctx.measureText(label);
  const pw = Math.max(58, metrics.width + 16);

  const boxTop = player.health < player.maxHealth ? player.y - 58 : player.y - 50;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.beginPath();
  ctx.roundRect(player.x - pw / 2, boxTop, pw, 20, 6);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(label, player.x, boxTop + 14);

  // High-contrast HP bar beneath name tag
  const barW = Math.max(50, pw - 6);
  const barY = boxTop + 22;
  const pct = Math.max(0, Math.min(1, player.health / player.maxHealth));
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  ctx.roundRect(player.x - barW / 2, barY, barW, 7, 3.5);
  ctx.fill();

  ctx.fillStyle = pct > 0.6 ? '#10B981' : pct > 0.3 ? '#F59E0B' : '#EF4444';
  if (pct > 0) {
    ctx.beginPath();
    ctx.roundRect(player.x - barW / 2, barY, barW * pct, 7, 3.5);
    ctx.fill();
  }

  ctx.restore();
}

export function drawBossTelegraph(
  ctx: CanvasRenderingContext2D,
  telegraph: BossTelegraph,
  time: number
) {
  const progress = Math.max(0, Math.min(1, telegraph.elapsed / telegraph.duration));
  const color = telegraph.kind === 'steam' ? '239, 68, 68' : '245, 158, 11';
  ctx.save();
  ctx.translate(telegraph.x, telegraph.y);

  // Outer warning border
  ctx.strokeStyle = `rgba(${color}, ${0.55 + Math.sin(time * 14) * 0.25})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, telegraph.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Filling inner blast circle
  ctx.fillStyle = `rgba(${color}, ${0.12 + progress * 0.28})`;
  ctx.beginPath();
  ctx.arc(0, 0, telegraph.radius * progress, 0, Math.PI * 2);
  ctx.fill();

  // Center hazard label
  ctx.font = '700 11px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('DODGE!', 0, 4);
  ctx.restore();
}

export function drawBossEntity(ctx: CanvasRenderingContext2D, boss: BossState, time: number) {
  ctx.save();
  const hover = Math.sin(boss.walkCycle * 2) * 3.5;
  ctx.translate(boss.x, boss.y + hover);

  const isPhase2 = boss.phase === 2;
  const isFlashing = boss.flashTimer > 0;

  // Ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
  ctx.beginPath();
  ctx.ellipse(0, 32 - hover, boss.radius * 0.95, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Phase 2 overdrive aura
  if (isPhase2) {
    const auraR = boss.radius + 10 + Math.sin(time * 8) * 3;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Twin side exhaust pipes
  ctx.fillStyle = isFlashing ? '#FEF08A' : '#475569';
  ctx.beginPath();
  ctx.roundRect(-boss.radius - 6, -24, 14, 34, 4);
  ctx.roundRect(boss.radius - 8, -24, 14, 34, 4);
  ctx.fill();

  // Heavy brass/iron body chassis
  ctx.fillStyle = isFlashing ? '#FDE047' : isPhase2 ? '#7F1D1D' : '#334155';
  ctx.beginPath();
  ctx.roundRect(-boss.radius + 4, -34, (boss.radius - 4) * 2, 62, 16);
  ctx.fill();
  ctx.strokeStyle = isPhase2 ? '#F87171' : '#D97706';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Shoulder brass rivets / valve wheels
  const wheelRot = time * (isPhase2 ? 5.2 : 2.4);
  for (const sx of [-26, 26]) {
    ctx.save();
    ctx.translate(sx, -24);
    ctx.rotate(wheelRot);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.moveTo(-9, 0);
    ctx.lineTo(9, 0);
    ctx.moveTo(0, -9);
    ctx.lineTo(0, 9);
    ctx.stroke();
    ctx.restore();
  }

  // Glowing pressure gauge core
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(0, -2, 16, 0, Math.PI * 2);
  ctx.fill();

  const coreGrad = ctx.createRadialGradient(-3, -5, 2, 0, -2, 14);
  if (isPhase2) {
    coreGrad.addColorStop(0, '#FEF08A');
    coreGrad.addColorStop(0.5, '#EF4444');
    coreGrad.addColorStop(1, '#991B1B');
  } else {
    coreGrad.addColorStop(0, '#FEF3C7');
    coreGrad.addColorStop(0.5, '#F59E0B');
    coreGrad.addColorStop(1, '#B45309');
  }
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, -2, 12, 0, Math.PI * 2);
  ctx.fill();

  // Angry visor slit
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-10, -4, 20, 4);

  // Overhead boss nameplate + HP bar
  const barW = 108;
  const barY = -54;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(-barW / 2 - 4, barY - 18, barW + 8, 28, 6);
  ctx.fill();

  ctx.font = '700 11px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = isPhase2 ? '#FCA5A5' : '#FDE68A';
  ctx.fillText(boss.name, 0, barY - 6);

  const pct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(-barW / 2, barY, barW, 6, 3);
  ctx.fill();
  ctx.fillStyle = isPhase2 ? '#EF4444' : '#F59E0B';
  if (pct > 0) {
    ctx.beginPath();
    ctx.roundRect(-barW / 2, barY, barW * pct, 6, 3);
    ctx.fill();
  }

  ctx.restore();
}

export function drawBossBeam(ctx: CanvasRenderingContext2D, beam: BossBeam) {
  ctx.save();
  ctx.strokeStyle = beam.color;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(beam.startX, beam.startY);
  ctx.lineTo(beam.x, beam.y);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(beam.x, beam.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = beam.color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

export function drawMysteryPickup(
  ctx: CanvasRenderingContext2D,
  box: MysteryPickupItem,
  time: number
) {
  ctx.save();
  const spawnPop = Math.min(1, box.spawnAge / 0.35);
  const popScale = spawnPop < 1 ? 0.5 + 0.5 * Math.sin(spawnPop * Math.PI * 0.65) : 1;
  const expiringBlink =
    box.lifetime < 4 ? 0.55 + Math.abs(Math.sin(time * 12)) * 0.45 : 1;
  const bob = Math.sin(time * 3.8 + box.bobOffset) * 3.2;

  ctx.globalAlpha = expiringBlink;
  ctx.translate(box.x, box.y);
  ctx.scale(popScale, popScale);

  // Pulsing ground mystery halo (neutral gold/violet — effect stays secret!)
  const ringR = 23 + Math.sin(time * 4.5 + box.bobOffset) * 2.5;
  const haloGrad = ctx.createRadialGradient(0, 2, 4, 0, 2, ringR + 6);
  haloGrad.addColorStop(0, 'rgba(250, 204, 21, 0.32)');
  haloGrad.addColorStop(0.6, 'rgba(168, 85, 247, 0.25)');
  haloGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, 2, ringR + 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(0, 2, ringR, time * 1.4, time * 1.4 + Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Contact shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 15, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Floating Crate Body
  ctx.translate(0, bob - 3);

  // Crate main face (deep royal purple + gold trim)
  const boxGrad = ctx.createLinearGradient(-15, -15, 15, 15);
  boxGrad.addColorStop(0, '#7E22CE');
  boxGrad.addColorStop(1, '#3B0764');
  ctx.fillStyle = boxGrad;
  ctx.beginPath();
  ctx.roundRect(-15, -15, 30, 30, 6);
  ctx.fill();

  // Gold metallic border & cross straps
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
  ctx.fillRect(-15, -3.5, 30, 7);
  ctx.fillRect(-3.5, -15, 7, 30);

  // Center medallion & crisp '?' mark
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FDE047';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.font = '800 15px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FEF08A';
  ctx.fillText('?', 0, 1);

  // Tiny orbiting sparkles
  for (let i = 0; i < 2; i++) {
    const a = time * 3.2 + i * Math.PI + box.bobOffset;
    const sx = Math.cos(a) * 20;
    const sy = Math.sin(a) * 14 - 4;
    ctx.fillStyle = i === 0 ? '#FEF08A' : '#E879F9';
    ctx.beginPath();
    ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle 'MYSTERY' pill above crate
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 9.5px "Outfit", sans-serif';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
  ctx.beginPath();
  ctx.roundRect(-24, -29, 48, 13, 4);
  ctx.fill();
  ctx.fillStyle = '#FDE047';
  ctx.fillText('MYSTERY', 0, -19.5);

  ctx.restore();
}

export function drawPlayerPickupAura(
  ctx: CanvasRenderingContext2D,
  player: PlayerRuntime,
  effects: ActivePickupEffect[],
  time: number
) {
  const playerEffects = effects.filter(
    (e) => e.targetPlayer === player.id || e.targetPlayer === 'all'
  );
  if (playerEffects.length === 0) return;

  ctx.save();
  ctx.translate(player.x, player.y + 8);
  for (const eff of playerEffects) {
    if (eff.kind === 'swift_boots') {
      const r = 21 + Math.sin(time * 10) * 2.5;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.78)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (eff.kind === 'sticky_tar') {
      const r = 20 + Math.sin(time * 5) * 1.5;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.82)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 2, r, r * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}
