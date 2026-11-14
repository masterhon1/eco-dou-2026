import courtyardImg from '../assets/images/level_courtyard_1794645426654.jpg';
import cafeteriaImg from '../assets/images/level_cafeteria_1794645426700.jpg';
import marketImg from '../assets/images/level_market_1794645427642.jpg';
import plazaImg from '../assets/images/level_plaza_1794645427982.jpg';
import tutorialImg from '../assets/images/level_tutorial_yard_1794695179173.jpg';
import bossImg from '../assets/images/level_boss_arena_1794695178873.jpg';
import { LevelConfig, PlayerCustomization } from './types';

export const P1_PRESET_COLORS = [
  { label: 'Hydro Sky', primary: '#0284C7', accent: '#38BDF8' },
  { label: 'Deep Cobalt', primary: '#1D4ED8', accent: '#60A5FA' },
  { label: 'River Teal', primary: '#0D9488', accent: '#2DD4BF' },
  { label: 'Emerald Spring', primary: '#059669', accent: '#34D399' },
];

export const P2_PRESET_COLORS = [
  { label: 'Harvest Amber', primary: '#D97706', accent: '#FBBF24' },
  { label: 'Terracotta', primary: '#EA580C', accent: '#FB923C' },
  { label: 'Orchard Olive', primary: '#65A30D', accent: '#A3E635' },
  { label: 'Warm Berry', primary: '#BE123C', accent: '#FB7185' },
];

export const SKIN_TONES = ['#FDE2C8', '#F2C59F', '#D99B6C', '#A66E46', '#6F4327'];

export const DEFAULT_P1_CUSTOM: PlayerCustomization = {
  name: 'Water Saver',
  outfit: 'plumber',
  hat: 'hardhat',
  primaryColor: '#0284C7',
  accentColor: '#38BDF8',
  skinTone: '#F2C59F',
};

export const DEFAULT_P2_CUSTOM: PlayerCustomization = {
  name: 'Food Helper',
  outfit: 'chef',
  hat: 'toque',
  primaryColor: '#D97706',
  accentColor: '#FBBF24',
  skinTone: '#D99B6C',
};

export const LEVELS: LevelConfig[] = [
  {
    id: 'courtyard',
    number: 1,
    name: 'Garden Courtyard',
    subtitle: 'Open paths & local food stall',
    description:
      'Fix leaking garden taps, scoop up spilled water, and bring fresh bread and fruit to Sunny Orphanage.',
    goalSummary: 'Save 115 L water and deliver 10 meals before time runs out.',
    difficulty: 'Easy',
    image: courtyardImg,
    worldWidth: 1120,
    worldHeight: 820,
    durationSeconds: 100,
    waterTargetLiters: 115,
    mealsTarget: 10,
    floorTheme: 'courtyard',
    p1Spawn: { x: 240, y: 420 },
    p2Spawn: { x: 860, y: 420 },
    cisternZone: { x: 60, y: 340, w: 130, h: 150, label: 'Water Tank' },
    orphanageZone: { x: 910, y: 70, w: 160, h: 140, label: 'Sunny Orphanage' },
    taps: [
      { id: 'tap-c1', x: 180, y: 130, label: 'North Tap' },
      { id: 'tap-c2', x: 430, y: 220, label: 'Yard Basin' },
      { id: 'tap-c3', x: 210, y: 690, label: 'Hose Tap' },
      { id: 'tap-c4', x: 540, y: 670, label: 'Fountain Tap' },
    ],
    foodStations: [
      { id: 'food-c1', x: 760, y: 220, label: 'Corner Bakery', kind: 'bakery' },
      { id: 'food-c2', x: 880, y: 580, label: 'Fruit Stall', kind: 'produce' },
      { id: 'food-c3', x: 640, y: 450, label: 'Food Table', kind: 'buffet' },
    ],
    obstacles: [
      { id: 'obs-c1', x: 340, y: 360, w: 120, h: 100, kind: 'planter', label: 'Herb Bed' },
      { id: 'obs-c2', x: 560, y: 150, w: 110, h: 65, kind: 'table', label: 'Picnic Bench' },
      { id: 'obs-c3', x: 680, y: 640, w: 130, h: 70, kind: 'planter', label: 'Flower Bed' },
    ],
    tapLeakIntervalSec: 6.4,
    foodSpawnIntervalSec: 4.0,
    foodSpoilDurationSec: 26,
  },
  {
    id: 'cafeteria',
    number: 2,
    name: 'School Cafeteria',
    subtitle: 'Lunch tables & kitchen sinks',
    description:
      'Walk around the lunch tables to grab extra meals before they go bad, and fix leaking kitchen sinks.',
    goalSummary: 'Save 150 L water and deliver 13 meals before time runs out.',
    difficulty: 'Normal',
    image: cafeteriaImg,
    worldWidth: 1240,
    worldHeight: 880,
    durationSeconds: 105,
    waterTargetLiters: 150,
    mealsTarget: 13,
    floorTheme: 'cafeteria',
    p1Spawn: { x: 260, y: 460 },
    p2Spawn: { x: 920, y: 460 },
    cisternZone: { x: 60, y: 650, w: 140, h: 150, label: 'Water Tank' },
    orphanageZone: { x: 1010, y: 70, w: 170, h: 145, label: 'Orphanage Van' },
    taps: [
      { id: 'tap-k1', x: 150, y: 140, label: 'Sink A' },
      { id: 'tap-k2', x: 460, y: 140, label: 'Sink B' },
      { id: 'tap-k3', x: 300, y: 440, label: 'Water Fountain' },
      { id: 'tap-k4', x: 250, y: 740, label: 'Wash Sink' },
      { id: 'tap-k5', x: 580, y: 720, label: 'Back Tap' },
    ],
    foodStations: [
      { id: 'food-k1', x: 740, y: 200, label: 'Soup Counter', kind: 'kitchen' },
      { id: 'food-k2', x: 1020, y: 360, label: 'Lunch Buffet', kind: 'buffet' },
      { id: 'food-k3', x: 770, y: 580, label: 'Fruit & Milk', kind: 'produce' },
      { id: 'food-k4', x: 980, y: 720, label: 'Bread Rack', kind: 'bakery' },
    ],
    obstacles: [
      { id: 'obs-k1', x: 240, y: 240, w: 150, h: 56, kind: 'table', label: 'Lunch Table' },
      { id: 'obs-k2', x: 480, y: 320, w: 70, h: 190, kind: 'counter', label: 'Counter' },
      { id: 'obs-k3', x: 380, y: 560, w: 160, h: 56, kind: 'table', label: 'Lunch Table' },
      { id: 'obs-k4', x: 820, y: 380, w: 140, h: 58, kind: 'table', label: 'Prep Table' },
    ],
    tapLeakIntervalSec: 5.3,
    foodSpawnIntervalSec: 3.4,
    foodSpoilDurationSec: 23,
  },
  {
    id: 'market',
    number: 3,
    name: 'Farmers Market',
    subtitle: 'Busy food stalls & stone paths',
    description:
      'Lots of fresh food and lively leaks! Work together around the market stalls to save water and send meals.',
    goalSummary: 'Save 185 L water and deliver 18 meals before time runs out.',
    difficulty: 'Hard',
    image: marketImg,
    worldWidth: 1320,
    worldHeight: 920,
    durationSeconds: 110,
    waterTargetLiters: 185,
    mealsTarget: 18,
    floorTheme: 'market',
    p1Spawn: { x: 280, y: 460 },
    p2Spawn: { x: 1035, y: 465 },
    cisternZone: { x: 65, y: 390, w: 135, h: 150, label: 'Water Tank' },
    orphanageZone: { x: 1090, y: 390, w: 170, h: 150, label: 'Orphanage' },
    taps: [
      { id: 'tap-m1', x: 180, y: 130, label: 'North Tap' },
      { id: 'tap-m2', x: 520, y: 150, label: 'Wash Tap' },
      { id: 'tap-m3', x: 440, y: 470, label: 'Well Tap' },
      { id: 'tap-m4', x: 220, y: 780, label: 'South Tap' },
      { id: 'tap-m5', x: 610, y: 790, label: 'Flower Hose' },
      { id: 'tap-m6', x: 840, y: 150, label: 'Mist Pipe' },
    ],
    foodStations: [
      { id: 'food-m1', x: 760, y: 270, label: 'Bread Tent', kind: 'bakery' },
      { id: 'food-m2', x: 960, y: 180, label: 'Fruit Stand', kind: 'produce' },
      { id: 'food-m3', x: 770, y: 630, label: 'Hot Kitchen', kind: 'kitchen' },
      { id: 'food-m4', x: 980, y: 740, label: 'Cheese Stall', kind: 'buffet' },
    ],
    obstacles: [
      { id: 'obs-m1', x: 300, y: 240, w: 130, h: 80, kind: 'stall', label: 'Canopy Stall' },
      { id: 'obs-m2', x: 580, y: 370, w: 110, h: 140, kind: 'fountain', label: 'Stone Well' },
      { id: 'obs-m3', x: 320, y: 610, w: 140, h: 75, kind: 'stall', label: 'Crate Stall' },
      { id: 'obs-m4', x: 880, y: 430, w: 110, h: 80, kind: 'planter', label: 'Tree Planter' },
    ],
    tapLeakIntervalSec: 4.6,
    foodSpawnIntervalSec: 3.0,
    foodSpoilDurationSec: 21,
  },
  {
    id: 'plaza',
    number: 4,
    name: 'City Plaza',
    subtitle: 'Big city square & main hall',
    description:
      'The grand finale! Stop leaks around the plaza fountain and hurry warm meals over to the City Orphanage.',
    goalSummary: 'Save 235 L water and deliver 22 meals before time runs out.',
    difficulty: 'Expert',
    image: plazaImg,
    worldWidth: 1400,
    worldHeight: 960,
    durationSeconds: 120,
    waterTargetLiters: 235,
    mealsTarget: 22,
    floorTheme: 'plaza',
    p1Spawn: { x: 320, y: 480 },
    p2Spawn: { x: 1040, y: 480 },
    cisternZone: { x: 70, y: 80, w: 150, h: 145, label: 'Water Tank' },
    orphanageZone: { x: 1150, y: 740, w: 185, h: 155, label: 'City Orphanage' },
    taps: [
      { id: 'tap-p1', x: 240, y: 240, label: 'West Tap' },
      { id: 'tap-p2', x: 560, y: 150, label: 'Garden Tap' },
      { id: 'tap-p3', x: 500, y: 500, label: 'Plaza Tap' },
      { id: 'tap-p4', x: 200, y: 760, label: 'Park Tap' },
      { id: 'tap-p5', x: 640, y: 820, label: 'South Pipe' },
      { id: 'tap-p6', x: 880, y: 200, label: 'Hall Sink' },
    ],
    foodStations: [
      { id: 'food-p1', x: 900, y: 360, label: 'Main Kitchen', kind: 'kitchen' },
      { id: 'food-p2', x: 1140, y: 180, label: 'City Bakery', kind: 'bakery' },
      { id: 'food-p3', x: 820, y: 680, label: 'Fresh Fruit', kind: 'produce' },
      { id: 'food-p4', x: 1160, y: 480, label: 'Food Buffet', kind: 'buffet' },
      { id: 'food-p5', x: 540, y: 340, label: 'Food Cart', kind: 'buffet' },
    ],
    obstacles: [
      { id: 'obs-p1', x: 620, y: 410, w: 150, h: 150, kind: 'fountain', label: 'Big Fountain' },
      { id: 'obs-p2', x: 330, y: 310, w: 120, h: 75, kind: 'planter', label: 'Garden Bed' },
      { id: 'obs-p3', x: 340, y: 630, w: 130, h: 75, kind: 'planter', label: 'Bamboo Bed' },
      { id: 'obs-p4', x: 960, y: 540, w: 120, h: 70, kind: 'table', label: 'Park Bench' },
    ],
    tapLeakIntervalSec: 4.0,
    foodSpawnIntervalSec: 2.7,
    foodSpoilDurationSec: 19,
  },
];

export const TUTORIAL_LEVEL: LevelConfig = {
  id: 'tutorial',
  number: 0,
  mode: 'tutorial',
  name: 'Training Courtyard',
  subtitle: 'Step-by-step co-op practice',
  description:
    'Learn every action together at a relaxed pace: scoop water, fix a leaking tap, use the Water Tank, grab food, and deliver meals.',
  goalSummary: 'Complete all 5 guided co-op steps at your own pace.',
  difficulty: 'Easy',
  image: tutorialImg,
  worldWidth: 1020,
  worldHeight: 740,
  durationSeconds: 300,
  waterTargetLiters: 40,
  mealsTarget: 2,
  floorTheme: 'courtyard',
  p1Spawn: { x: 250, y: 380 },
  p2Spawn: { x: 760, y: 380 },
  cisternZone: { x: 65, y: 310, w: 135, h: 145, label: 'Water Tank' },
  orphanageZone: { x: 820, y: 95, w: 150, h: 135, label: 'Sunny Orphanage' },
  taps: [
    { id: 'tap-t1', x: 290, y: 175, label: 'Practice Tap' },
    { id: 'tap-t2', x: 350, y: 560, label: 'Garden Tap' },
  ],
  foodStations: [
    { id: 'food-t1', x: 700, y: 260, label: 'Training Bakery', kind: 'bakery' },
    { id: 'food-t2', x: 720, y: 530, label: 'Fruit Table', kind: 'produce' },
  ],
  obstacles: [
    { id: 'obs-t1', x: 460, y: 315, w: 100, h: 90, kind: 'planter', label: 'Herb Bed' },
  ],
  tapLeakIntervalSec: 14,
  foodSpawnIntervalSec: 7,
  foodSpoilDurationSec: 45,
};

export const BOSS_LEVEL: LevelConfig = {
  id: 'boss',
  number: 5,
  mode: 'boss',
  name: 'Wastelord Foundry',
  subtitle: 'Boss Battle · Mega-Wastelord MK-II',
  description:
    'Team up to defeat Mega-Wastelord MK-II! Fix taps, bank water at the Tank, and send meals to launch eco-strikes while dodging sludge slams.',
  goalSummary: 'Drop Mega-Wastelord MK-II from 140 HP to 0 HP before time expires.',
  difficulty: 'Expert',
  image: bossImg,
  worldWidth: 1260,
  worldHeight: 880,
  durationSeconds: 165,
  waterTargetLiters: 170,
  mealsTarget: 15,
  floorTheme: 'plaza',
  p1Spawn: { x: 270, y: 440 },
  p2Spawn: { x: 990, y: 440 },
  cisternZone: { x: 60, y: 360, w: 140, h: 160, label: 'Water Tank' },
  orphanageZone: { x: 1050, y: 360, w: 155, h: 160, label: 'Safe Orphanage' },
  taps: [
    { id: 'tap-b1', x: 220, y: 145, label: 'Valve North' },
    { id: 'tap-b2', x: 490, y: 145, label: 'Main Pipe' },
    { id: 'tap-b3', x: 220, y: 735, label: 'Valve South' },
    { id: 'tap-b4', x: 490, y: 735, label: 'Drain Pipe' },
  ],
  foodStations: [
    { id: 'food-b1', x: 780, y: 160, label: 'Relief Kitchen', kind: 'kitchen' },
    { id: 'food-b2', x: 980, y: 175, label: 'Field Bakery', kind: 'bakery' },
    { id: 'food-b3', x: 780, y: 720, label: 'Produce Crate', kind: 'produce' },
    { id: 'food-b4', x: 980, y: 705, label: 'Hot Buffet', kind: 'buffet' },
  ],
  obstacles: [
    { id: 'obs-b1', x: 340, y: 270, w: 75, h: 75, kind: 'planter', label: 'Pillar' },
    { id: 'obs-b2', x: 340, y: 535, w: 75, h: 75, kind: 'planter', label: 'Pillar' },
    { id: 'obs-b3', x: 845, y: 270, w: 75, h: 75, kind: 'planter', label: 'Pillar' },
    { id: 'obs-b4', x: 845, y: 535, w: 75, h: 75, kind: 'planter', label: 'Pillar' },
  ],
  tapLeakIntervalSec: 5.2,
  foodSpawnIntervalSec: 2.8,
  foodSpoilDurationSec: 22,
};

