export type MazeResourceKind = 'water' | 'harvest';

export interface MazeResourceNode {
  id: string;
  row: number;
  col: number;
  x: number;
  z: number;
  kind: MazeResourceKind;
  label: string;
  collected: boolean;
}

export interface MazeMysteryBoxNode {
  id: string;
  row: number;
  col: number;
  x: number;
  z: number;
  collected: boolean;
}

export interface MazeLayout {
  size: number;
  cellSize: number;
  wallHeight: number;
  grid: number[][]; // 0 = floor, 1 = wall
  spawn: { x: number; z: number; row: number; col: number };
  center: { x: number; z: number; row: number; col: number };
  resources: MazeResourceNode[];
  mysteryBoxes: MazeMysteryBoxNode[];
}

export const MAZE_GRID_SIZE = 11; // Odd dimension for crisp DFS + 3x3 center sanctuary
export const MAZE_CELL_SIZE = 3.4;
export const MAZE_WALL_HEIGHT = 1.45; // Balanced height so 3/4 view clearly shows 3/4 of maze + collectibles + beacon

export function cellToWorld(row: number, col: number, size = MAZE_GRID_SIZE, cellSize = MAZE_CELL_SIZE) {
  const half = (size - 1) / 2;
  return {
    x: (col - half) * cellSize,
    z: (row - half) * cellSize,
  };
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateMazeLayout(resourceCount = 10): MazeLayout {
  const size = MAZE_GRID_SIZE;
  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(1));
  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const startRow = 1;
  const startCol = 1;
  const stack: Array<{ r: number; c: number }> = [{ r: startRow, c: startCol }];
  grid[startRow][startCol] = 0;
  visited[startRow][startCol] = true;

  const dirs = [
    { dr: -2, dc: 0 },
    { dr: 2, dc: 0 },
    { dr: 0, dc: -2 },
    { dr: 0, dc: 2 },
  ];

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const neighbors = shuffleInPlace([...dirs]).filter(({ dr, dc }) => {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      return nr > 0 && nr < size - 1 && nc > 0 && nc < size - 1 && !visited[nr][nc];
    });

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const pick = neighbors[0];
    const midR = cur.r + pick.dr / 2;
    const midC = cur.c + pick.dc / 2;
    const nextR = cur.r + pick.dr;
    const nextC = cur.c + pick.dc;

    grid[midR][midC] = 0;
    grid[nextR][nextC] = 0;
    visited[nextR][nextC] = true;
    stack.push({ r: nextR, c: nextC });
  }

  // Open a small 3x3 central sanctuary courtyard around (5,5) for the Floating Beacon of Light
  const mid = Math.floor(size / 2);
  for (let r = mid - 1; r <= mid + 1; r++) {
    for (let c = mid - 1; c <= mid + 1; c++) {
      grid[r][c] = 0;
    }
  }

  // Carve a few extra corridor loops (~18% braid) so movement feels fluid and exploratory
  for (let r = 1; r < size - 1; r++) {
    for (let c = 1; c < size - 1; c++) {
      if (grid[r][c] !== 1) continue;
      const horizOpen = grid[r][c - 1] === 0 && grid[r][c + 1] === 0 && grid[r - 1][c] === 1 && grid[r + 1][c] === 1;
      const vertOpen = grid[r - 1][c] === 0 && grid[r + 1][c] === 0 && grid[r][c - 1] === 1 && grid[r][c + 1] === 1;
      if ((horizOpen || vertOpen) && Math.random() < 0.22) {
        grid[r][c] = 0;
      }
    }
  }

  // BFS from spawn to ensure we only place resources on reachable cells outside the center sanctuary
  const distMap: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  const queue: Array<{ r: number; c: number }> = [{ r: startRow, c: startCol }];
  distMap[startRow][startCol] = 0;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const cardinals = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];
    for (const { dr, dc } of cardinals) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === 0 && distMap[nr][nc] === -1) {
        distMap[nr][nc] = distMap[cur.r][cur.c] + 1;
        queue.push({ r: nr, c: nc });
      }
    }
  }

  // Collect candidate floor cells excluding spawn and center 3x3 sanctuary
  const candidates: Array<{ r: number; c: number; d: number; quad: number }> = [];
  for (let r = 1; r < size - 1; r++) {
    for (let c = 1; c < size - 1; c++) {
      if (grid[r][c] !== 0 || distMap[r][c] < 2) continue;
      if (r === startRow && c === startCol) continue;
      if (Math.abs(r - mid) <= 1 && Math.abs(c - mid) <= 1) continue;
      const quad = (r < mid ? 0 : 2) + (c < mid ? 0 : 1);
      candidates.push({ r, c, d: distMap[r][c], quad });
    }
  }

  shuffleInPlace(candidates);

  // Pick well-distributed cells across all 4 quadrants with minimum spacing
  const chosen: Array<{ r: number; c: number }> = [];
  for (let targetQuad = 0; chosen.length < resourceCount && targetQuad < 16; targetQuad++) {
    const q = targetQuad % 4;
    const match = candidates.find(
      (cand) =>
        cand.quad === q &&
        !chosen.some((ex) => Math.abs(ex.r - cand.r) + Math.abs(ex.c - cand.c) < 2)
    );
    if (match) {
      chosen.push({ r: match.r, c: match.c });
    }
  }
  for (const cand of candidates) {
    if (chosen.length >= resourceCount) break;
    if (!chosen.some((ex) => ex.r === cand.r && ex.c === cand.c)) {
      chosen.push({ r: cand.r, c: cand.c });
    }
  }

  const waterLabels = ['Aqua Crystal', 'Spring Core', 'Rain Prism', 'Cistern Orb', 'Dew Drop'];
  const harvestLabels = ['Grain Crate', 'Orchard Pod', 'Bread Cache', 'Harvest Core', 'Meal Pack'];

  const resources: MazeResourceNode[] = chosen.map((cell, idx) => {
    const kind: MazeResourceKind = idx % 2 === 0 ? 'water' : 'harvest';
    const pos = cellToWorld(cell.r, cell.c, size, MAZE_CELL_SIZE);
    const labelPool = kind === 'water' ? waterLabels : harvestLabels;
    return {
      id: `res-${idx + 1}`,
      row: cell.r,
      col: cell.c,
      x: pos.x,
      z: pos.z,
      kind,
      label: labelPool[Math.floor(idx / 2) % labelPool.length],
      collected: false,
    };
  });

  const mysteryBoxCount = 3;
  const mysteryCells: Array<{ r: number; c: number }> = [];
  for (const cand of candidates) {
    if (mysteryCells.length >= mysteryBoxCount) break;
    const usedByResource = chosen.some((ex) => ex.r === cand.r && ex.c === cand.c);
    const tooCloseToBox = mysteryCells.some(
      (mb) => Math.abs(mb.r - cand.r) + Math.abs(mb.c - cand.c) < 3
    );
    if (!usedByResource && !tooCloseToBox) {
      mysteryCells.push({ r: cand.r, c: cand.c });
    }
  }

  const mysteryBoxes: MazeMysteryBoxNode[] = mysteryCells.map((cell, idx) => {
    const pos = cellToWorld(cell.r, cell.c, size, MAZE_CELL_SIZE);
    return {
      id: `mbox-${idx + 1}`,
      row: cell.r,
      col: cell.c,
      x: pos.x,
      z: pos.z,
      collected: false,
    };
  });

  const spawnPos = cellToWorld(startRow, startCol, size, MAZE_CELL_SIZE);
  const centerPos = cellToWorld(mid, mid, size, MAZE_CELL_SIZE);

  return {
    size,
    cellSize: MAZE_CELL_SIZE,
    wallHeight: MAZE_WALL_HEIGHT,
    grid,
    spawn: { ...spawnPos, row: startRow, col: startCol },
    center: { ...centerPos, row: mid, col: mid },
    resources,
    mysteryBoxes,
  };
}

/**
 * Smooth circle-vs-maze-wall sliding collision resolver.
 */
export function resolveMazeCollision(
  x: number,
  z: number,
  radius: number,
  layout: MazeLayout
): { x: number; z: number } {
  let rx = x;
  let rz = z;
  const halfCell = layout.cellSize * 0.5;
  const halfTotal = (layout.size * layout.cellSize) * 0.5 - radius - 0.1;

  rx = Math.max(-halfTotal, Math.min(halfTotal, rx));
  rz = Math.max(-halfTotal, Math.min(halfTotal, rz));

  // Resolve against nearby wall cells in 2 passes for crisp corner sliding
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 0; r < layout.size; r++) {
      for (let c = 0; c < layout.size; c++) {
        if (layout.grid[r][c] !== 1) continue;
        const center = cellToWorld(r, c, layout.size, layout.cellSize);
        const minX = center.x - halfCell;
        const maxX = center.x + halfCell;
        const minZ = center.z - halfCell;
        const maxZ = center.z + halfCell;

        const nearestX = Math.max(minX, Math.min(maxX, rx));
        const nearestZ = Math.max(minZ, Math.min(maxZ, rz));
        const dx = rx - nearestX;
        const dz = rz - nearestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const overlap = radius - dist;
            rx += (dx / dist) * overlap;
            rz += (dz / dist) * overlap;
          } else {
            const left = rx - minX;
            const right = maxX - rx;
            const top = rz - minZ;
            const bottom = maxZ - rz;
            const m = Math.min(left, right, top, bottom);
            if (m === left) rx = minX - radius;
            else if (m === right) rx = maxX + radius;
            else if (m === top) rz = minZ - radius;
            else rz = maxZ + radius;
          }
        }
      }
    }
  }

  return { x: rx, z: rz };
}
