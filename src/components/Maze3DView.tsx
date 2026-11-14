import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Compass,
  Droplets,
  Gift,
  Navigation,
  Play,
  RotateCcw,
  RotateCw,
  Sparkles,
  Star,
  SunMedium,
  Utensils,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundFx } from '../game/audio';
import {
  cellToWorld,
  generateMazeLayout,
  MAZE_CELL_SIZE,
  MAZE_GRID_SIZE,
  MAZE_WALL_HEIGHT,
  MazeLayout,
  resolveMazeCollision,
} from '../game/maze3d';
import { DeviceMode, PlayerCustomization } from '../game/types';

export type MazeCameraMode = 'three-quarter' | 'close-chase' | 'high-overview';

interface Maze3DViewProps {
  p1Custom: PlayerCustomization;
  deviceMode: DeviceMode;
  muted: boolean;
  onToggleMute: () => void;
  onExitToLobby: () => void;
  onMazeComplete: (elapsedSec: number, resourcesCollected: number, stars: number) => void;
}

// Pre-allocated math helpers outside animation loop (zero per-frame GC)
const _camDesired = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _moveVec = new THREE.Vector3();
const _tempMatrix = new THREE.Matrix4();
const _tempColor = new THREE.Color();
const _dummy = new THREE.Object3D();

function createProceduralStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);

    const tile = 64;
    for (let y = 0; y < 256; y += tile) {
      for (let x = 0; x < 256; x += tile) {
        const shade = 28 + Math.floor(Math.random() * 14);
        ctx.fillStyle = `rgb(${shade}, ${shade + 10}, ${shade + 24})`;
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2.5, y + 2.5, tile - 5, tile - 5);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(MAZE_GRID_SIZE, MAZE_GRID_SIZE);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWallBrickTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 256, 256);
    const rows = 4;
    const cols = 4;
    const rh = 256 / rows;
    const cw = 256 / cols;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const bx = c * cw + offset;
        const by = r * rh;
        const v = 54 + Math.floor(Math.random() * 18);
        ctx.fillStyle = `rgb(${v}, ${v + 12}, ${v + 24})`;
        ctx.fillRect(bx + 2, by + 2, cw - 4, rh - 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPlayerAvatar(custom: PlayerCustomization): THREE.Group {
  const group = new THREE.Group();

  // 1. Contact shadow disc
  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 24),
    new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  // 2. Boots / base stance
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75, metalness: 0.1 });
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.34), bootMat);
  leftBoot.position.set(-0.18, 0.12, 0.04);
  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.34), bootMat);
  rightBoot.position.set(0.18, 0.12, 0.04);
  group.add(leftBoot, rightBoot);

  // 3. Primary body torso vest
  const primaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(custom.primaryColor),
    roughness: 0.45,
    metalness: 0.15,
  });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.72, 12), primaryMat);
  torso.position.y = 0.6;
  torso.castShadow = true;
  group.add(torso);

  // 4. Eco Hydro Pack on back
  const packMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(custom.accentColor),
    roughness: 0.25,
    metalness: 0.6,
    emissive: new THREE.Color(custom.accentColor),
    emissiveIntensity: 0.22,
  });
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.22), packMat);
  pack.position.set(0, 0.64, -0.32);
  pack.castShadow = true;
  group.add(pack);

  // 5. Head
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(custom.skinTone),
    roughness: 0.65,
    metalness: 0.05,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), skinMat);
  head.position.y = 1.18;
  head.castShadow = true;
  group.add(head);

  // 6. Cap / Helmet visor facing +Z
  const hatMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(custom.accentColor),
    roughness: 0.3,
    metalness: 0.4,
  });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hatMat
  );
  dome.position.y = 1.22;
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.22), hatMat);
  brim.position.set(0, 1.24, 0.25);
  group.add(dome, brim);

  // 7. Forward chest lantern crystal
  const lantern = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.11, 0),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    })
  );
  lantern.position.set(0, 0.72, 0.36);
  group.add(lantern);

  return group;
}

function buildFloatingBeaconGroup(): {
  group: THREE.Group;
  core: THREE.Mesh;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  crown: THREE.Mesh;
  beam: THREE.Mesh;
  runeRing: THREE.Mesh;
  beaconLight: THREE.PointLight;
} {
  const group = new THREE.Group();

  // 1. Octagonal carved stone pedestal (grounded y=0)
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.75,
    metalness: 0.2,
  });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.95, 0.34, 8), plinthMat);
  plinth.position.y = 0.17;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  group.add(plinth);

  // 2. Sanctuary trigger rune ring on top of plinth
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.7,
  });
  const runeRing = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.07, 10, 32), runeMat);
  runeRing.rotation.x = Math.PI / 2;
  runeRing.position.y = 0.36;
  group.add(runeRing);

  // 3. Floating inner radiant crystal core
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.7,
    roughness: 0.15,
    metalness: 0.2,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), coreMat);
  core.position.y = 3.2;
  core.castShadow = true;
  group.add(core);

  // 4. Outer metallic gyro ring
  const outerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
    roughness: 0.22,
    metalness: 0.9,
  });
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.065, 12, 36), outerMat);
  outerRing.position.y = 3.2;
  group.add(outerRing);

  // 5. Inner counter-rotating gyro ring
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.85,
  });
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.05, 12, 32), innerMat);
  innerRing.position.y = 3.2;
  group.add(innerRing);

  // 6. Floating upper spire crown
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.82, 6), outerMat);
  crown.position.y = 4.45;
  group.add(crown);

  // 7. Towering translucent Beacon Light Pillar visible across the 3/4 maze
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.92, 16, 20, 1, true), beamMat);
  beam.position.y = 8.2;
  group.add(beam);

  // 8. Real dynamic point light at center beacon
  const beaconLight = new THREE.PointLight(0xfbbf24, 9, 24, 1.5);
  beaconLight.position.y = 3.6;
  group.add(beaconLight);

  return { group, core, outerRing, innerRing, crown, beam, runeRing, beaconLight };
}

function buildCollectibleGroup(kind: 'water' | 'harvest'): {
  group: THREE.Group;
  orb: THREE.Mesh;
  ring: THREE.Mesh;
  pillar: THREE.Mesh;
} {
  const group = new THREE.Group();
  const isWater = kind === 'water';
  const mainHex = isWater ? 0x38bdf8 : 0xfbbf24;
  const emissiveHex = isWater ? 0x0284c7 : 0xd97706;

  // 1. Ground glow pad flush on floor
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.72, 0.08, 20),
    new THREE.MeshStandardMaterial({
      color: mainHex,
      emissive: emissiveHex,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.5,
    })
  );
  pad.position.y = 0.04;
  group.add(pad);

  // 2. Central crystal / harvest pod
  const orbMat = new THREE.MeshStandardMaterial({
    color: mainHex,
    emissive: emissiveHex,
    emissiveIntensity: 1.05,
    roughness: 0.18,
    metalness: isWater ? 0.35 : 0.6,
  });
  const orbGeo = isWater
    ? new THREE.OctahedronGeometry(0.44, 0)
    : new THREE.DodecahedronGeometry(0.42, 0);
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.y = 1.15;
  orb.castShadow = true;
  group.add(orb);

  // 3. Orbiting halo ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.045, 10, 28),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: mainHex,
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.85,
    })
  );
  ring.position.y = 1.15;
  ring.rotation.x = Math.PI / 3;
  group.add(ring);

  // 4. Vertical visibility spire rising above the 1.45 wall height so resources stay visible in 3/4 view
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.14, 2.5, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: mainHex,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  pillar.position.y = 1.45;
  group.add(pillar);

  return { group, orb, ring, pillar };
}

function createMysteryBoxTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 128, 128);
    grad.addColorStop(0, '#7e22ce');
    grad.addColorStop(1, '#3b0764');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 118, 118);

    ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.fillRect(0, 52, 128, 24);
    ctx.fillRect(52, 0, 24, 128);

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(64, 64, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = '800 52px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 64, 68);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildMazeMysteryBoxGroup(boxTex: THREE.CanvasTexture): {
  group: THREE.Group;
  cube: THREE.Mesh;
  ring: THREE.Mesh;
  pillar: THREE.Mesh;
} {
  const group = new THREE.Group();

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.72, 0.08, 20),
    new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.65,
      roughness: 0.35,
      metalness: 0.5,
    })
  );
  pad.position.y = 0.04;
  group.add(pad);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.82, 0.82),
    new THREE.MeshStandardMaterial({
      map: boxTex,
      emissive: 0x581c87,
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.45,
    })
  );
  cube.position.y = 1.2;
  cube.castShadow = true;
  group.add(cube);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.045, 10, 28),
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xfacc15,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.85,
    })
  );
  ring.position.y = 1.2;
  ring.rotation.x = Math.PI / 3;
  group.add(ring);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.14, 2.5, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xe879f9,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  pillar.position.y = 1.45;
  group.add(pillar);

  return { group, cube, ring, pillar };
}

export const Maze3DView: React.FC<Maze3DViewProps> = ({
  p1Custom,
  deviceMode,
  muted,
  onToggleMute,
  onExitToLobby,
  onMazeComplete,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [mazeSeed, setMazeSeed] = useState(0);
  const [showBriefing, setShowBriefing] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [cameraMode, setCameraMode] = useState<MazeCameraMode>('three-quarter');
  const [collectedCount, setCollectedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(10);
  const [waterCollected, setWaterCollected] = useState(0);
  const [harvestCollected, setHarvestCollected] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [beaconUnlocked, setBeaconUnlocked] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [bannerTone, setBannerTone] = useState<'neutral' | 'good' | 'bad'>('neutral');
  const [activeMazeEffect, setActiveMazeEffect] = useState<{
    name: string;
    polarity: 'good' | 'bad';
    remainingSec: number;
  } | null>(null);
  const [victory, setVictory] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [isTouchViewport, setIsTouchViewport] = useState(false);

  // Mutable refs consumed by the WebGL loop without tearing down the scene
  const keysRef = useRef<Set<string>>(new Set());
  const touchMoveRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraModeRef = useRef<MazeCameraMode>(cameraMode);
  const camYawTargetRef = useRef<number>(Math.PI * 0.25); // 45 deg diagonal 3/4 view
  const camYawCurrentRef = useRef<number>(Math.PI * 0.25);
  const pulseTimerRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(showBriefing || victory);
  const completedSentRef = useRef<boolean>(false);
  const bannerTimerRef = useRef<number>(0);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    pausedRef.current = showBriefing || victory;
  }, [showBriefing, victory]);

  useEffect(() => {
    const updateTouch = () => {
      const coarse =
        typeof window !== 'undefined' &&
        (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900);
      setIsTouchViewport(coarse);
    };
    updateTouch();
    window.addEventListener('resize', updateTouch);
    return () => window.removeEventListener('resize', updateTouch);
  }, []);

  const showTouchPad = useMemo(() => {
    if (deviceMode === 'mobile') return true;
    if (deviceMode === 'desktop') return false;
    return isTouchViewport;
  }, [deviceMode, isTouchViewport]);

  const rotateCamera = useCallback((deltaRad: number) => {
    camYawTargetRef.current += deltaRad;
  }, []);

  const triggerLightPulse = useCallback(() => {
    pulseTimerRef.current = 2.6;
    soundFx.playTutorialStep();
    setBannerTone('neutral');
    setStatusBanner('Beacon Pulse active — all remaining resources highlighted!');
    bannerTimerRef.current = 2.4;
  }, []);

  const restartMaze = useCallback(() => {
    soundFx.playTapFix();
    setVictory(false);
    setCollectedCount(0);
    setWaterCollected(0);
    setHarvestCollected(0);
    setElapsedSec(0);
    setBeaconUnlocked(false);
    setStatusBanner(null);
    setBannerTone('neutral');
    setActiveMazeEffect(null);
    completedSentRef.current = false;
    camYawTargetRef.current = Math.PI * 0.25;
    camYawCurrentRef.current = Math.PI * 0.25;
    setMazeSeed((s) => s + 1);
  }, []);

  // Keyboard Listeners (WASD / Arrow movement + Q/E camera rotate + Space pulse + H hide dock + R reset)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (showBriefing) {
        if (e.code === 'Enter' || e.code === 'Space') {
          soundFx.playTapFix();
          setShowBriefing(false);
        }
        return;
      }

      keysRef.current.add(e.code);

      if (e.code === 'KeyQ') rotateCamera(-Math.PI / 4);
      if (e.code === 'KeyE') rotateCamera(Math.PI / 4);
      if (e.code === 'KeyH') setDockCollapsed((v) => !v);
      if (e.code === 'KeyR') restartMaze();
      if (e.code === 'Space' && !victory) triggerLightPulse();
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
  }, [showBriefing, victory, rotateCamera, restartMaze, triggerLightPulse]);

  // Main Three.js WebGL Setup & Game Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL probe
    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2') || probe.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('3D WebGL rendering is unavailable on this browser.');
      return;
    }

    setWebglError(null);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initW = Math.max(320, container.clientWidth);
    const initH = Math.max(240, container.clientHeight);
    renderer.setSize(initW, initH);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglError('3D graphics context paused. Click New Maze to restore.');
    };
    const onContextRestored = () => {
      setWebglError(null);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // 2. Scene, Studio RoomEnvironment & Horizon Fog
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x0b1628);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x0b1628, 0.011);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(50, initW / initH, 0.3, 180);

    // 3. Warm/Cool 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.72);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.55);
    keyLight.position.set(22, 34, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 90;
    const d = 26;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-22, 16, -24);
    scene.add(rimLight);

    // 4. Generate Maze Layout
    const layout: MazeLayout = generateMazeLayout(10);
    setTotalCount(layout.resources.length);

    // 5. Floor, Outer Apron Terrain & Natural Perimeter Trees
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const stoneTex = createProceduralStoneTexture();
    stoneTex.anisotropy = maxAniso;
    const brickTex = createWallBrickTexture();
    brickTex.anisotropy = maxAniso;

    const mazeExtent = MAZE_GRID_SIZE * MAZE_CELL_SIZE;

    // Outer courtyard ground extending far to fog horizon (never floating in a void)
    const outerGroundGeo = new THREE.PlaneGeometry(160, 160);
    const outerGroundMat = new THREE.MeshStandardMaterial({
      color: 0x0f1f2e,
      roughness: 0.92,
      metalness: 0.04,
    });
    const outerGround = new THREE.Mesh(outerGroundGeo, outerGroundMat);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.03;
    outerGround.receiveShadow = true;
    scene.add(outerGround);

    // Maze tiled courtyard floor
    const mazeFloorGeo = new THREE.PlaneGeometry(mazeExtent, mazeExtent);
    const mazeFloorMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.78,
      metalness: 0.1,
    });
    const mazeFloor = new THREE.Mesh(mazeFloorGeo, mazeFloorMat);
    mazeFloor.rotation.x = -Math.PI / 2;
    mazeFloor.position.y = 0;
    mazeFloor.receiveShadow = true;
    scene.add(mazeFloor);

    // Instanced Maze Walls + Architectural Top Trim Caps
    const wallCells: Array<{ x: number; z: number }> = [];
    for (let r = 0; r < layout.size; r++) {
      for (let c = 0; c < layout.size; c++) {
        if (layout.grid[r][c] === 1) {
          wallCells.push(cellToWorld(r, c, layout.size, layout.cellSize));
        }
      }
    }

    const wallGeo = new THREE.BoxGeometry(MAZE_CELL_SIZE, MAZE_WALL_HEIGHT, MAZE_CELL_SIZE);
    const wallMat = new THREE.MeshStandardMaterial({
      map: brickTex,
      color: 0x64748b,
      roughness: 0.72,
      metalness: 0.14,
    });
    const wallInst = new THREE.InstancedMesh(wallGeo, wallMat, wallCells.length);
    wallInst.castShadow = true;
    wallInst.receiveShadow = true;

    const trimGeo = new THREE.BoxGeometry(MAZE_CELL_SIZE + 0.06, 0.16, MAZE_CELL_SIZE + 0.06);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.42,
      metalness: 0.55,
    });
    const trimInst = new THREE.InstancedMesh(trimGeo, trimMat, wallCells.length);
    trimInst.receiveShadow = true;

    wallCells.forEach((wc, idx) => {
      _tempMatrix.makeTranslation(wc.x, MAZE_WALL_HEIGHT * 0.5, wc.z);
      wallInst.setMatrixAt(idx, _tempMatrix);
      _tempMatrix.makeTranslation(wc.x, MAZE_WALL_HEIGHT + 0.08, wc.z);
      trimInst.setMatrixAt(idx, _tempMatrix);
    });
    wallInst.instanceMatrix.needsUpdate = true;
    trimInst.instanceMatrix.needsUpdate = true;
    wallInst.computeBoundingSphere();
    trimInst.computeBoundingSphere();
    scene.add(wallInst, trimInst);

    // Surrounding Perimeter Cypress Tree Grove (InstancedMesh with ±15% scale & tint variation)
    const treePositions: Array<{ x: number; z: number; scale: number; tint: number }> = [];
    const ringRadiusMin = mazeExtent * 0.5 + 3.8;
    const ringRadiusMax = mazeExtent * 0.5 + 18;
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
      const distOut = ringRadiusMin + Math.random() * (ringRadiusMax - ringRadiusMin);
      const tx = Math.cos(angle) * distOut;
      const tz = Math.sin(angle) * distOut;
      if (Math.abs(tx) < mazeExtent * 0.5 + 2.5 && Math.abs(tz) < mazeExtent * 0.5 + 2.5) continue;
      treePositions.push({
        x: tx,
        z: tz,
        scale: 0.85 + Math.random() * 0.3,
        tint: 0.82 + Math.random() * 0.25,
      });
    }

    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.34, 1.4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const canopyGeo = new THREE.ConeGeometry(1.15, 3.6, 8);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length);
    treePositions.forEach((tp, idx) => {
      _dummy.position.set(tp.x, 0.7 * tp.scale, tp.z);
      _dummy.scale.set(tp.scale, tp.scale, tp.scale);
      _dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(tp.x, 2.7 * tp.scale, tp.z);
      _dummy.updateMatrix();
      canopyInst.setMatrixAt(idx, _dummy.matrix);

      _tempColor.setRGB(0.08 * tp.tint, 0.48 * tp.tint, 0.24 * tp.tint);
      canopyInst.setColorAt(idx, _tempColor);
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    canopyInst.computeBoundingSphere();
    scene.add(trunkInst, canopyInst);

    // 6. Build Center Floating Beacon of Light
    const beacon = buildFloatingBeaconGroup();
    beacon.group.position.set(layout.center.x, 0, layout.center.z);
    scene.add(beacon.group);

    // 7. Build Visible Resource Collectibles & Mystery Box Pickups
    const resourceMeshes = layout.resources.map((res) => {
      const built = buildCollectibleGroup(res.kind);
      built.group.position.set(res.x, 0, res.z);
      scene.add(built.group);
      return { node: res, ...built };
    });

    const mysteryBoxTex = createMysteryBoxTexture();
    const mysteryMeshes = layout.mysteryBoxes.map((mb) => {
      const built = buildMazeMysteryBoxGroup(mysteryBoxTex);
      built.group.position.set(mb.x, 0, mb.z);
      scene.add(built.group);
      return { node: mb, ...built };
    });

    // 8. Build Player Avatar & Player Lantern Light
    const playerGroup = buildPlayerAvatar(p1Custom);
    let px = layout.spawn.x;
    let pz = layout.spawn.z;
    let facingYaw = 0;
    let walkBob = 0;
    playerGroup.position.set(px, 0, pz);
    scene.add(playerGroup);

    const playerLight = new THREE.PointLight(0x7dd3fc, 4.5, 13, 1.5);
    playerLight.position.set(px, 2.4, pz);
    scene.add(playerLight);

    // Light Pulse wave ring around player
    const pulseWaveGeo = new THREE.RingGeometry(0.6, 0.95, 36);
    const pulseWaveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pulseWave = new THREE.Mesh(pulseWaveGeo, pulseWaveMat);
    pulseWave.rotation.x = -Math.PI / 2;
    pulseWave.position.set(px, 0.1, pz);
    scene.add(pulseWave);

    // Initial camera placement
    camera.position.set(px + 14, 24, pz + 16);
    camera.lookAt(px * 0.45 + layout.center.x * 0.55, 0.6, pz * 0.45 + layout.center.z * 0.55);
    _lookTarget.set(px, 0.8, pz);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(300, container.clientWidth);
      const h = Math.max(220, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Game Simulation State inside loop
    let localCollected = 0;
    let localWater = 0;
    let localHarvest = 0;
    let localElapsed = 0;
    let localUnlocked = false;
    let localVictory = false;
    let hudSyncTimer = 0;
    let centerCooldown = 0;
    let speedBuffTimer = 0;
    let slowDebuffTimer = 0;
    let fogDebuffTimer = 0;
    let activeEffectName = '';
    let activeEffectPolarity: 'good' | 'bad' = 'good';
    let activeEffectRemaining = 0;

    let frameId = 0;
    let disposed = false;
    let lastNow = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;

      // Smoothly damp camera yaw
      camYawCurrentRef.current = THREE.MathUtils.damp(
        camYawCurrentRef.current,
        camYawTargetRef.current,
        7.5,
        dt
      );

      if (!pausedRef.current && !localVictory) {
        localElapsed += dt;
        if (centerCooldown > 0) centerCooldown = Math.max(0, centerCooldown - dt);
        if (pulseTimerRef.current > 0) pulseTimerRef.current = Math.max(0, pulseTimerRef.current - dt);
        if (speedBuffTimer > 0) speedBuffTimer = Math.max(0, speedBuffTimer - dt);
        if (slowDebuffTimer > 0) slowDebuffTimer = Math.max(0, slowDebuffTimer - dt);
        if (fogDebuffTimer > 0) fogDebuffTimer = Math.max(0, fogDebuffTimer - dt);
        if (activeEffectRemaining > 0) {
          activeEffectRemaining = Math.max(0, activeEffectRemaining - dt);
        }
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.density = fogDebuffTimer > 0 ? 0.038 : 0.011;
        }
        if (bannerTimerRef.current > 0) {
          bannerTimerRef.current = Math.max(0, bannerTimerRef.current - dt);
          if (bannerTimerRef.current <= 0) setStatusBanner(null);
        }

        // Camera-relative movement direction
        const keys = keysRef.current;
        const inputX =
          (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
          (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) +
          touchMoveRef.current.x;
        const inputZ =
          (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
          (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) +
          touchMoveRef.current.y;

        const mag = Math.hypot(inputX, inputZ);
        if (mag > 0.05) {
          const nx = inputX / Math.max(1, mag);
          const nz = inputZ / Math.max(1, mag);
          const yaw = camYawCurrentRef.current;
          // Screen-right & screen-forward projected onto XZ plane
          const rightX = Math.cos(yaw);
          const rightZ = -Math.sin(yaw);
          const fwdX = -Math.sin(yaw);
          const fwdZ = -Math.cos(yaw);

          _moveVec.set(nx * rightX - nz * fwdX, 0, nx * rightZ - nz * fwdZ).normalize();
          const speed =
            7.4 *
            (speedBuffTimer > 0 ? 1.45 : 1) *
            (slowDebuffTimer > 0 ? 0.65 : 1);
          const nextX = px + _moveVec.x * speed * dt;
          const nextZ = pz + _moveVec.z * speed * dt;
          const resolved = resolveMazeCollision(nextX, nextZ, 0.56, layout);
          px = resolved.x;
          pz = resolved.z;

          const targetAngle = Math.atan2(_moveVec.x, _moveVec.z);
          // Smooth shortest-arc yaw turn
          let diff = targetAngle - facingYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          facingYaw += diff * Math.min(1, dt * 14);
          walkBob += dt * 12;
        }

        playerGroup.position.set(px, Math.abs(Math.sin(walkBob)) * (mag > 0.05 ? 0.08 : 0), pz);
        playerGroup.rotation.y = facingYaw;
        playerLight.position.set(px, 2.5, pz);

        // Pulse wave visual
        if (pulseTimerRef.current > 0) {
          const p = 1 - pulseTimerRef.current / 2.6;
          const s = 1 + p * 14;
          pulseWave.position.set(px, 0.12, pz);
          pulseWave.scale.set(s, s, 1);
          pulseWaveMat.opacity = Math.max(0, (1 - p) * 0.65);
        } else {
          pulseWaveMat.opacity = 0;
        }

        // Check resource collection
        for (const item of resourceMeshes) {
          if (item.node.collected) continue;
          const dx = px - item.node.x;
          const dz = pz - item.node.z;
          if (dx * dx + dz * dz < 1.35 * 1.35) {
            item.node.collected = true;
            item.group.visible = false;
            localCollected += 1;
            if (item.node.kind === 'water') {
              localWater += 1;
              soundFx.playWaterCollect();
            } else {
              localHarvest += 1;
              soundFx.playFoodCollect();
            }

            setCollectedCount(localCollected);
            setWaterCollected(localWater);
            setHarvestCollected(localHarvest);

            if (localCollected >= layout.resources.length && !localUnlocked) {
              localUnlocked = true;
              setBeaconUnlocked(true);
              soundFx.playOrphanageDonate();
              setBannerTone('good');
              setStatusBanner('All resources collected! Reach the Center Beacon of Light!');
              bannerTimerRef.current = 5.0;
            } else {
              const left = layout.resources.length - localCollected;
              setBannerTone('neutral');
              setStatusBanner(`Collected ${item.node.label}! ${left} remaining.`);
              bannerTimerRef.current = 2.0;
            }
          }
        }

        // Check Mystery Box Pickups (hidden Good/Bad effect revealed ONLY on collecting!)
        for (const mb of mysteryMeshes) {
          if (mb.node.collected) continue;
          const dx = px - mb.node.x;
          const dz = pz - mb.node.z;
          if (dx * dx + dz * dz < 1.35 * 1.35) {
            mb.node.collected = true;
            mb.group.visible = false;

            const isGood = Math.random() < 0.5;
            soundFx.playMysteryPickupReveal(isGood ? 'good' : 'bad');

            if (isGood) {
              const roll = Math.floor(Math.random() * 4);
              if (roll === 0) {
                speedBuffTimer = 8;
                activeEffectName = 'Sprint Boost (+45% Speed)';
                activeEffectPolarity = 'good';
                activeEffectRemaining = 8;
                setBannerTone('good');
                setStatusBanner('Mystery Box (Good): Sprint Boost! +45% Speed for 8s!');
              } else if (roll === 1) {
                pulseTimerRef.current = 6.5;
                activeEffectName = 'Beacon Radar';
                activeEffectPolarity = 'good';
                activeEffectRemaining = 6.5;
                setBannerTone('good');
                setStatusBanner('Mystery Box (Good): Beacon Radar! Resources pulsing for 6.5s!');
              } else if (roll === 2) {
                localElapsed = Math.max(0, localElapsed - 10);
                setBannerTone('good');
                setStatusBanner('Mystery Box (Good): Time Rewind! -10s off your clock!');
              } else {
                const uncollected = resourceMeshes.filter((r) => !r.node.collected);
                if (uncollected.length > 0) {
                  uncollected.sort(
                    (a, b) =>
                      Math.hypot(a.node.x - px, a.node.z - pz) -
                      Math.hypot(b.node.x - px, b.node.z - pz)
                  );
                  const auto = uncollected[0];
                  auto.node.collected = true;
                  auto.group.visible = false;
                  localCollected += 1;
                  if (auto.node.kind === 'water') localWater += 1;
                  else localHarvest += 1;
                  setCollectedCount(localCollected);
                  setWaterCollected(localWater);
                  setHarvestCollected(localHarvest);
                  if (localCollected >= layout.resources.length && !localUnlocked) {
                    localUnlocked = true;
                    setBeaconUnlocked(true);
                  }
                  setBannerTone('good');
                  setStatusBanner(`Mystery Box (Good): Magnet Grab! Collected ${auto.node.label}!`);
                } else {
                  localElapsed = Math.max(0, localElapsed - 8);
                  setBannerTone('good');
                  setStatusBanner('Mystery Box (Good): Time Bonus! -8s off your clock!');
                }
              }
            } else {
              const roll = Math.floor(Math.random() * 4);
              if (roll === 0) {
                slowDebuffTimer = 6;
                activeEffectName = 'Muddy Boots (-35% Speed)';
                activeEffectPolarity = 'bad';
                activeEffectRemaining = 6;
                setBannerTone('bad');
                setStatusBanner('Mystery Box (Bad): Muddy Boots! -35% Speed for 6s!');
              } else if (roll === 1) {
                fogDebuffTimer = 7;
                activeEffectName = 'Heavy Mist';
                activeEffectPolarity = 'bad';
                activeEffectRemaining = 7;
                setBannerTone('bad');
                setStatusBanner('Mystery Box (Bad): Heavy Mist! Thicker fog for 7s!');
              } else if (roll === 2) {
                localElapsed += 8;
                setBannerTone('bad');
                setStatusBanner('Mystery Box (Bad): Time Penalty! +8s added to your clock!');
              } else {
                camYawTargetRef.current += Math.PI * 0.5;
                setBannerTone('bad');
                setStatusBanner('Mystery Box (Bad): Dizzy Spin! Camera rotated 90°!');
              }
            }
            bannerTimerRef.current = 3.5;
          }
        }

        // Check Center Beacon Arrival
        const cdx = px - layout.center.x;
        const cdz = pz - layout.center.z;
        if (cdx * cdx + cdz * cdz < 2.25 * 2.25) {
          if (localUnlocked) {
            localVictory = true;
            setVictory(true);
            soundFx.playVictory();
            if (!completedSentRef.current) {
              completedSentRef.current = true;
              const stars = localElapsed <= 65 ? 3 : localElapsed <= 105 ? 2 : 1;
              onMazeComplete(localElapsed, localCollected, stars);
            }
          } else if (centerCooldown <= 0) {
            centerCooldown = 3.0;
            const left = layout.resources.length - localCollected;
            setBannerTone('neutral');
            setStatusBanner(
              `Center Beacon locked — collect ${left} more resource${left === 1 ? '' : 's'} first!`
            );
            bannerTimerRef.current = 2.8;
          }
        }

        hudSyncTimer += dt;
        if (hudSyncTimer >= 0.12) {
          hudSyncTimer = 0;
          setElapsedSec(localElapsed);
          if (activeEffectRemaining > 0) {
            setActiveMazeEffect({
              name: activeEffectName,
              polarity: activeEffectPolarity,
              remainingSec: activeEffectRemaining,
            });
          } else {
            setActiveMazeEffect(null);
          }
        }
      }

      // Animate Floating Center Beacon of Light & Collectibles (even on briefing preview)
      const t = now * 0.001;
      const pulseBoost = pulseTimerRef.current > 0 ? 1.5 : 1.0;

      beacon.core.position.y = 3.25 + Math.sin(t * 2.2) * 0.3;
      beacon.core.rotation.y = t * 1.1;
      beacon.outerRing.position.y = beacon.core.position.y;
      beacon.outerRing.rotation.x = t * 0.9;
      beacon.outerRing.rotation.y = t * 1.3;
      beacon.innerRing.position.y = beacon.core.position.y;
      beacon.innerRing.rotation.z = -t * 1.4;
      beacon.innerRing.rotation.x = Math.PI * 0.35 + Math.sin(t) * 0.4;
      beacon.crown.position.y = beacon.core.position.y + 1.25 + Math.sin(t * 2.2) * 0.08;
      beacon.crown.rotation.y = -t * 1.2;

      const beaconColorHex = localUnlocked ? 0x10b981 : 0xfbbf24;
      const beamMat = beacon.beam.material as THREE.MeshBasicMaterial;
      beamMat.color.setHex(localUnlocked ? 0x34d399 : 0xfde047);
      beamMat.opacity = (localUnlocked ? 0.34 : 0.2) + Math.sin(t * 3.1) * 0.05;
      beacon.beaconLight.color.setHex(beaconColorHex);
      beacon.beaconLight.intensity = (localUnlocked ? 13 : 8.5) + Math.sin(t * 3.5) * 1.5;
      const runeMat = beacon.runeRing.material as THREE.MeshStandardMaterial;
      runeMat.color.setHex(beaconColorHex);
      runeMat.emissive.setHex(beaconColorHex);

      for (let i = 0; i < resourceMeshes.length; i++) {
        const rm = resourceMeshes[i];
        if (rm.node.collected) continue;
        const bob = Math.sin(t * 2.6 + i * 0.8) * 0.18;
        rm.orb.position.y = 1.2 + bob;
        rm.orb.rotation.y = t * 1.5 + i;
        rm.ring.position.y = 1.2 + bob;
        rm.ring.rotation.z = t * 1.8;
        const pillarMat = rm.pillar.material as THREE.MeshBasicMaterial;
        pillarMat.opacity = (0.3 + Math.sin(t * 3 + i) * 0.08) * pulseBoost;
      }

      for (let i = 0; i < mysteryMeshes.length; i++) {
        const mm = mysteryMeshes[i];
        if (mm.node.collected) continue;
        const bob = Math.sin(t * 3.1 + i * 1.3) * 0.2;
        mm.cube.position.y = 1.22 + bob;
        mm.cube.rotation.y = t * 1.4 + i;
        mm.ring.position.y = 1.22 + bob;
        mm.ring.rotation.z = -t * 2.0;
        const pillarMat = mm.pillar.material as THREE.MeshBasicMaterial;
        pillarMat.opacity = 0.34 + Math.sin(t * 3.5 + i) * 0.1;
      }

      // Smooth 3/4 Camera Follow (shows ~3/4 of the maze by default)
      const mode = cameraModeRef.current;
      const yaw = camYawCurrentRef.current;
      let camDist = 20.5;
      let camHeight = 23.5;
      let centerBias = 0.36; // Pull focus slightly toward maze center so ~3/4 of maze is framed
      if (mode === 'close-chase') {
        camDist = 10.5;
        camHeight = 9.5;
        centerBias = 0.08;
      } else if (mode === 'high-overview') {
        camDist = 14;
        camHeight = 33.5;
        centerBias = 0.65;
      }

      const focusX = THREE.MathUtils.lerp(px, layout.center.x, centerBias);
      const focusZ = THREE.MathUtils.lerp(pz, layout.center.z, centerBias);
      _lookTarget.set(
        THREE.MathUtils.damp(_lookTarget.x, focusX, 6.5, dt),
        0.8,
        THREE.MathUtils.damp(_lookTarget.z, focusZ, 6.5, dt)
      );

      _camDesired.set(
        _lookTarget.x + Math.sin(yaw) * camDist,
        camHeight,
        _lookTarget.z + Math.cos(yaw) * camDist
      );
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camDesired.x, 6.0, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camDesired.y, 6.0, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camDesired.z, 6.0, dt);
      camera.lookAt(_lookTarget);

      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      stoneTex.dispose();
      brickTex.dispose();
      mysteryBoxTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, [mazeSeed, p1Custom, onMazeComplete]);

  const formattedTime = useMemo(() => {
    const secs = Math.floor(elapsedSec);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [elapsedSec]);

  const earnedStars = elapsedSec <= 65 ? 3 : elapsedSec <= 105 ? 2 : 1;

  return (
    <div className="relative h-[100dvh] w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Isolated Dedicated WebGL Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full touch-game-surface" />

      {/* Graceful WebGL Fallback */}
      {webglError && (
        <div className="absolute inset-0 z-40 bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-center space-y-4">
            <Compass className="w-12 h-12 text-sky-400 mx-auto" />
            <h2 className="font-display text-2xl font-bold text-white">3D Maze Graphics Unavailable</h2>
            <p className="text-sm text-slate-300">{webglError}</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={restartMaze}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm cursor-pointer"
              >
                Retry 3D Maze
              </button>
              <button
                type="button"
                onClick={onExitToLobby}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm cursor-pointer"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Top HUD Strip (No backdrop-filter over active WebGL canvas) */}
      <header className="relative z-20 pointer-events-none px-3 sm:px-5 pt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/92 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-lg">
          <button
            type="button"
            onClick={onExitToLobby}
            className="min-h-[40px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Menu</span>
          </button>
          <div className="hidden sm:block pr-2">
            <div className="font-display text-sm font-bold text-white whitespace-nowrap">
              First-Player 3D Maze
            </div>
            <div className="text-xs text-slate-300 whitespace-nowrap">
              {beaconUnlocked
                ? 'Beacon unlocked — reach center!'
                : `Collect all ${totalCount} resources, then reach center`}
            </div>
          </div>
        </div>

        {/* Center Resource & Beacon Progress Readout */}
        <div className="pointer-events-auto flex items-center gap-3 sm:gap-5 bg-slate-950/92 border border-slate-700 rounded-xl px-4 py-2 font-mono-tabular text-xs sm:text-sm shadow-lg">
          <div className="flex items-center gap-1.5 text-sky-300 font-bold whitespace-nowrap">
            <Droplets className="w-4 h-4 shrink-0" />
            <span>{waterCollected}/5</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300 font-bold whitespace-nowrap">
            <Utensils className="w-4 h-4 shrink-0" />
            <span>{harvestCollected}/5</span>
          </div>
          <div
            className={`font-bold whitespace-nowrap ${
              beaconUnlocked ? 'text-emerald-300' : 'text-white'
            }`}
          >
            Total {collectedCount}/{totalCount}
          </div>
          <span className="text-slate-600" aria-hidden="true">
            |
          </span>
          <div className="font-bold text-slate-100 whitespace-nowrap">{formattedTime}</div>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/92 border border-slate-700 rounded-xl p-1.5 shadow-lg">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={restartMaze}
            className="min-h-[40px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4 text-sky-300 shrink-0" />
            <span>New Maze</span>
          </button>
        </div>
      </header>

      {/* Non-blocking Status Banner & Active Mystery Effect Pill */}
      {!showBriefing && !victory && (statusBanner || activeMazeEffect) && (
        <div className="relative z-20 pointer-events-none flex flex-col items-center gap-2 px-4 mt-3">
          {statusBanner && (
            <div
              className={`bg-slate-950/92 border rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xl ${
                bannerTone === 'good'
                  ? 'border-emerald-400'
                  : bannerTone === 'bad'
                  ? 'border-rose-400'
                  : 'border-sky-400/70'
              }`}
            >
              {statusBanner}
            </div>
          )}
          {activeMazeEffect && (
            <div
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold flex items-center gap-2 shadow-lg ${
                activeMazeEffect.polarity === 'good'
                  ? 'bg-emerald-950/92 border-emerald-400 text-emerald-100'
                  : 'bg-rose-950/92 border-rose-400 text-rose-100'
              }`}
            >
              <Gift className="w-3.5 h-3.5 shrink-0" />
              <span>{activeMazeEffect.name}</span>
              <span className="font-mono-tabular">
                {Math.ceil(activeMazeEffect.remainingSec)}s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Touch Pad for Mobile / Touch Mode (bottom-left) */}
      {showTouchPad && !showBriefing && !victory && (
        <div className="absolute bottom-24 left-4 z-20">
          <MazeTouchPad
            onMove={(x, y) => {
              touchMoveRef.current = { x, y };
            }}
          />
        </div>
      )}

      {/* Collapsible Unified Bottom Control Dock */}
      {!showBriefing && !victory && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-20 transition-transform duration-200 max-w-[94vw] ${
            dockCollapsed ? 'bottom-0 translate-y-[calc(100%-36px)]' : 'bottom-4 translate-y-0'
          }`}
        >
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setDockCollapsed((v) => !v)}
              className="h-9 px-4 rounded-t-xl bg-slate-950/95 border border-b-0 border-slate-700 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Show Controls [H]</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Hide Controls [H]</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-2xl bg-slate-950/95 border border-slate-700 px-3 py-2.5 shadow-2xl flex flex-wrap items-center justify-center gap-2">
            {/* Camera View Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {(
                [
                  { id: 'three-quarter', label: '3/4 Maze View' },
                  { id: 'close-chase', label: 'Close Follow' },
                  { id: 'high-overview', label: 'High 3D' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setCameraMode(preset.id)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    cameraMode === preset.id
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => rotateCamera(-Math.PI / 4)}
                className="min-h-[40px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Turn [Q]</span>
              </button>
              <button
                type="button"
                onClick={() => rotateCamera(Math.PI / 4)}
                className="min-h-[40px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Turn [E]</span>
              </button>
              <button
                type="button"
                onClick={triggerLightPulse}
                className="min-h-[40px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <SunMedium className="w-4 h-4 shrink-0" />
                <span>Beacon Pulse [Space]</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Start 3D Maze Briefing Modal */}
      {showBriefing && !webglError && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/82 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="maze-briefing-title"
        >
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border-2 border-slate-700 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/70">
              <p className="text-xs font-semibold text-sky-300">
                New Single-Player 3D Experience
              </p>
              <h2 id="maze-briefing-title" className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
                Sanctuary 3D Maze
              </h2>
              <p className="text-sm text-slate-200 mt-1">
                See three-quarters of the stone labyrinth from an elevated 3D view, follow the glowing trails, and unlock the center beacon.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1">
                  <div className="font-bold text-sky-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 shrink-0" />
                    <span>1. 3/4 3D View</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Move with WASD or Arrow keys. Rotate camera anytime with Q / E.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>2. Collect All 10</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Gather 5 Aqua Crystals and 5 Harvest Pods—each glows above the walls.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 shrink-0" />
                    <span>3. Reach Center</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Once all 10 are gathered, step into the Floating Beacon of Light to win.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-purple-950/35 border border-purple-500/50 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                <Gift className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-amber-300">Mystery Boxes [?]:</strong> Glowing purple-and-gold crates hold a hidden random effect (Good or Bad) revealed only when collected!
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onExitToLobby}
                className="min-h-[48px] px-5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-semibold text-sm cursor-pointer"
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
                className="min-h-[50px] px-7 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Enter 3D Maze</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Summary Modal */}
      {victory && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/85 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="3D Maze Complete"
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border-2 border-emerald-500/70 p-6 space-y-5 shadow-2xl text-center">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-9 h-9 ${
                    s <= earnedStars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>

            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Center Beacon Reached!
              </h2>
              <p className="text-sm text-slate-200 mt-1">
                You collected all {totalCount} eco-resources and unlocked the Floating Beacon of Light.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono-tabular">
              <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3">
                <div className="text-xs text-slate-400 font-sans">Time</div>
                <div className="text-lg font-bold text-white mt-0.5">{formattedTime}</div>
              </div>
              <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3">
                <div className="text-xs text-slate-400 font-sans">Water</div>
                <div className="text-lg font-bold text-sky-300 mt-0.5">{waterCollected}/5</div>
              </div>
              <div className="rounded-xl bg-slate-950/85 border border-slate-800 p-3">
                <div className="text-xs text-slate-400 font-sans">Harvest</div>
                <div className="text-lg font-bold text-amber-300 mt-0.5">{harvestCollected}/5</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={restartMaze}
                className="flex-1 min-h-[48px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play New Maze</span>
              </button>
              <button
                type="button"
                onClick={onExitToLobby}
                className="flex-1 min-h-[48px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm cursor-pointer whitespace-nowrap"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MazeTouchPadProps {
  onMove: (x: number, y: number) => void;
}

const MazeTouchPad: React.FC<MazeTouchPadProps> = ({ onMove }) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointerRef = useRef<number | null>(null);

  const updatePointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 2 ? Math.cos(angle) * clamped : 0;
    const ky = dist > 2 ? Math.sin(angle) * clamped : 0;
    setKnob({ x: kx, y: ky });
    onMove(kx / maxR, ky / maxR);
  };

  return (
    <div
      ref={padRef}
      onPointerDown={(e) => {
        activePointerRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        updatePointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (activePointerRef.current === e.pointerId) {
          updatePointer(e.clientX, e.clientY);
        }
      }}
      onPointerUp={(e) => {
        if (activePointerRef.current === e.pointerId) {
          activePointerRef.current = null;
          setKnob({ x: 0, y: 0 });
          onMove(0, 0);
        }
      }}
      onPointerCancel={() => {
        activePointerRef.current = null;
        setKnob({ x: 0, y: 0 });
        onMove(0, 0);
      }}
      className="relative w-28 h-28 rounded-full bg-slate-950/90 border-2 border-sky-400/70 touch-none flex items-center justify-center shadow-xl"
      aria-label="Move Joystick"
    >
      <div
        className="w-11 h-11 rounded-full bg-sky-500 border-2 border-white shadow-md"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
};
