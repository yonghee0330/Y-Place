// Y-Place 메타공간 실험실: 넓은 한 캠퍼스 안을 벽·문틀로 구역만 나눈다.
// 포털로 방을 갈아끼우지 않는다. x: 왼쪽(-)→오른쪽(+), z: 뒤(-)→앞(+). 단위 m.
import { Rng } from '../core/rng';

/** 'shop'은 중앙 광장(옛 로비 id — 방문자 저장값·채널 이름을 지키려고 유지). */
export type SpaceId =
  | 'shop'
  | 'bookshop'
  | 'circle'
  | 'gallery'
  | 'market'
  | 'challenge'
  | 'cowork'
  | 'tech';

export const SPACE_ORDER: SpaceId[] = [
  'shop', 'bookshop', 'circle', 'gallery', 'market', 'challenge', 'cowork', 'tech',
];

/** 메시는 캠퍼스 하나만 만든다. */
export const BUILD_SPACES: SpaceId[] = ['shop'];

const LABELS: Record<SpaceId, string> = {
  shop: '실험실 광장',
  bookshop: '책방 실험실',
  circle: '모임 실험실',
  gallery: '전시 실험실',
  market: '마켓 실험실',
  challenge: '챌린지 실험실',
  cowork: '공동 작업실',
  tech: '신기술 개발실',
};

/** 공동 작업·신기술 구역에서 작업 패널을 켠다. */
export function isWorkSpace(id: SpaceId): boolean {
  return id === 'cowork' || id === 'tech';
}

export interface RoomBounds {
  w: number; d: number; h: number;
  x0: number; x1: number; z0: number; z1: number;
}

export interface Opening { cx: number; w: number; y0: number; y1: number; kind: 'window' | 'door' }
export interface Placement { x: number; z: number; ry: number }
export interface Seat {
  id: string; x: number; z: number; ry: number; y: number; approach: 1 | -1;
  from?: { x: number; z: number };
}
export interface Collider {
  x0: number; x1: number; z0: number; z1: number; h: number;
  seatable: boolean;
  seats?: string[];
}
export interface PortalDef {
  to: SpaceId;
  x: number; z: number; ry: number;
  label: string;
  w: number; d: number;
  open?: boolean;
  signW?: number;
  choose?: SpaceId[];
}

export interface PartitionWall {
  x: number; z: number; ry: number; len: number; h: number;
  door?: { cx: number; w: number; h: number };
}

export interface ZoneBounds {
  id: SpaceId;
  x0: number; x1: number; z0: number; z1: number;
  spawn: { x: number; z: number; ry: number };
}

export interface SpaceLayout {
  id: SpaceId;
  label: string;
  room: RoomBounds;
  openings: Opening[];
  shelves: (Placement & { w: number; wing: 'A' | 'B' | 'C' | 'mid'; rail?: boolean; faceOut?: boolean })[];
  islands: (Placement & { w: number; d: number; h: number; kind: 'flat' | 'stand' })[];
  partitions: PartitionWall[];
  readingTable: (Placement & { w: number; d: number; h: number }) | null;
  roundTable: { x: number; z: number; r: number; h: number } | null;
  armchairs: Placement[];
  sideTable: (Placement & { r: number; h: number }) | null;
  chairs: Placement[];
  storeTable: (Placement & { w: number; d: number; h: number }) | null;
  storeChairs: Placement[];
  sofa: (Placement & { w: number; d: number }) | null;
  coffeeTable: (Placement & { w: number; d: number; h: number }) | null;
  rug: { x: number; z: number; w: number; d: number; round?: boolean } | null;
  bench: (Placement & { w: number; d: number; h: number }) | null;
  barTable: (Placement & { w: number; d: number; h: number }) | null;
  counter: (Placement & { w: number; d: number; h: number }) | null;
  massageChairs: Placement[];
  coffeeBar: (Placement & { w: number; d: number; h: number }) | null;
  cafeTable: { x: number; z: number; r: number; h: number } | null;
  workDesk: (Placement & { w: number; d: number; h: number }) | null;
  /** 공동 작업·신기술용 추가 책상(콜라이더·좌석만). workDesk는 대표 책상. */
  extraDesks: (Placement & { w: number; d: number; h: number; seatId: string })[];
  exhibits: (Placement & { w: number; h: number; y: number; seed: number; title: string })[];
  pedestals: { x: number; z: number; kind: 'knot' | 'stack' | 'ring' }[];
  floorLamps: Placement[];
  pendants: { x: number; z: number; drop: number }[];
  floorPlants: { x: number; z: number; scale: number }[];
  seats: Seat[];
  spawn: { x: number; z: number; ry: number };
  spawns: { x: number; z: number; ry: number }[];
  portals: PortalDef[];
}

export const WAINSCOT_H = 0.17;
export const SHELF = { h: 2.15, d: 0.32, board: 0.02, levels: 5, plinth: 0.08 } as const;

function roomOf(w: number, d: number, h = 3.1): RoomBounds {
  return { w, d, h, x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2 };
}

function shift<T extends { x: number; z: number }>(p: T, ox: number, oz: number): T {
  return { ...p, x: p.x + ox, z: p.z + oz };
}

/** 캠퍼스 외곽 24×16m. 구역은 칸막이 벽으로만 나눈다. */
const CAMPUS = roomOf(24, 16, 3.2);

/** 구역 AABB + 빠른 이동 스폰(월드 좌표). */
export const ZONE_BOUNDS: ZoneBounds[] = [
  { id: 'shop', x0: -3.6, x1: 3.6, z0: -1.6, z1: 4.4, spawn: { x: 0, z: 2.4, ry: Math.PI } },
  { id: 'bookshop', x0: -12, x1: -3.7, z0: -8, z1: -1.7, spawn: { x: -8, z: -3.2, ry: Math.PI } },
  { id: 'gallery', x0: -3.6, x1: 3.6, z0: -8, z1: -1.7, spawn: { x: -1.4, z: -3.0, ry: Math.PI } },
  { id: 'market', x0: 3.7, x1: 12, z0: -8, z1: -1.7, spawn: { x: 8, z: -3.2, ry: Math.PI } },
  { id: 'circle', x0: -12, x1: -3.7, z0: -1.6, z1: 4.4, spawn: { x: -9.8, z: 2.5, ry: Math.PI } },
  { id: 'challenge', x0: 3.7, x1: 12, z0: -1.6, z1: 4.4, spawn: { x: 9.8, z: 2.5, ry: Math.PI } },
  { id: 'cowork', x0: -12, x1: -0.2, z0: 4.5, z1: 8, spawn: { x: -6, z: 7.1, ry: Math.PI } },
  { id: 'tech', x0: 0.2, x1: 12, z0: 4.5, z1: 8, spawn: { x: 6, z: 7.1, ry: Math.PI } },
];

export function zoneSpawn(id: SpaceId): { x: number; z: number; ry: number } {
  return ZONE_BOUNDS.find((z) => z.id === id)?.spawn ?? ZONE_BOUNDS[0].spawn;
}

/** 발 위치로 구역을 고른다. 경계 밖이면 광장. */
export function detectZone(x: number, z: number): SpaceId {
  for (const zoned of ZONE_BOUNDS) {
    if (zoned.id === 'shop') continue;
    if (x >= zoned.x0 && x <= zoned.x1 && z >= zoned.z0 && z <= zoned.z1) return zoned.id;
  }
  return 'shop';
}

function wall(x: number, z: number, ry: number, len: number, doorCx = 0): PartitionWall {
  return { x, z, ry, len, h: 2.75, door: { cx: doorCx, w: 1.35, h: 2.15 } };
}

function makeCampus(): SpaceLayout {
  // --- 구역 원점(로컬 가구 → 월드) ---
  const BS = { x: -8.0, z: -5.0 };   // 책방
  const GA = { x: 0.0, z: -5.0 };    // 전시
  const MK = { x: 8.0, z: -5.0 };    // 마켓
  const CI = { x: -8.2, z: 1.2 };    // 모임
  const CH = { x: 8.2, z: 1.2 };     // 챌린지
  const CW = { x: -6.2, z: 6.1 };    // 공동 작업
  const TE = { x: 6.2, z: 6.1 };     // 신기술

  const massageChairs = [
    { x: -1.6, z: -0.55, ry: 0.1 },
    { x: -0.35, z: -0.55, ry: -0.1 },
  ];
  const sofa = { x: 1.55, z: 2.05, ry: Math.PI, w: 1.55, d: 0.78 };

  // 책방 가구(로컬 → 월드)
  const bsShelves = [
    { x: -2.1, z: -2.45, ry: 0, w: 1.65, wing: 'A' as const },
    { x: 0, z: -2.45, ry: 0, w: 1.65, wing: 'A' as const, faceOut: true },
    { x: 2.1, z: -2.45, ry: 0, w: 1.65, wing: 'A' as const },
    { x: -3.2, z: -0.7, ry: Math.PI / 2, w: 1.5, wing: 'B' as const },
    { x: -3.2, z: 0.85, ry: Math.PI / 2, w: 1.2, wing: 'B' as const, faceOut: true },
  ].map((s) => shift(s, BS.x, BS.z));
  const bsIslands = [
    { x: -1.0, z: -0.2, ry: 0, w: 1.25, d: 0.72, h: 0.78, kind: 'flat' as const },
    { x: 1.0, z: -0.2, ry: 0, w: 1.25, d: 0.72, h: 0.92, kind: 'stand' as const },
  ].map((s) => shift(s, BS.x, BS.z));
  const bsArm = shift({ x: -2.4, z: 1.55, ry: Math.PI * 0.78 }, BS.x, BS.z);
  const bsCounter = shift({ x: 2.85, z: 1.35, ry: -Math.PI / 2, w: 1.35, d: 0.52, h: 0.95 }, BS.x, BS.z);

  // 전시
  const wallPad = 0.04;
  const exhibits = [
    { x: -2.1, z: -2.35, ry: 0, y: 1.55, w: 1.0, h: 0.75, seed: 11, title: '실험 01 · 창가의 오후' },
    { x: 0, z: -2.35, ry: 0, y: 1.6, w: 1.25, h: 0.9, seed: 23, title: '실험 02 · 겹쳐 읽기' },
    { x: 2.1, z: -2.35, ry: 0, y: 1.55, w: 1.0, h: 0.75, seed: 37, title: '실험 03 · 서가의 리듬' },
    { x: -3.25, z: -0.6, ry: Math.PI / 2, y: 1.55, w: 0.8, h: 1.0, seed: 41, title: '실험 04 · 작은 모임' },
    { x: 3.25, z: -0.6, ry: -Math.PI / 2, y: 1.55, w: 0.8, h: 1.0, seed: 67, title: '실험 06 · 문과 문 사이' },
  ].map((e) => shift({ ...e, z: e.z + wallPad * 0 }, GA.x, GA.z));
  const pedestals = [
    { x: -1.4, z: -0.55, kind: 'knot' as const },
    { x: 1.4, z: -0.55, kind: 'stack' as const },
    { x: 0, z: 0.85, kind: 'ring' as const },
  ].map((p) => shift(p, GA.x, GA.z));
  const gaBench = shift({ x: 0, z: 0.9, ry: Math.PI, w: 1.45, d: 0.42, h: 0.43 }, GA.x, GA.z);

  // 마켓: 매대 3 + 스툴
  const mkIslands = [
    { x: -1.5, z: -0.4, ry: 0, w: 1.4, d: 0.7, h: 0.85, kind: 'stand' as const },
    { x: 0.2, z: -0.4, ry: 0, w: 1.4, d: 0.7, h: 0.85, kind: 'flat' as const },
    { x: 1.8, z: 0.9, ry: Math.PI / 2, w: 1.2, d: 0.65, h: 0.9, kind: 'stand' as const },
  ].map((s) => shift(s, MK.x, MK.z));
  // 모임 원탁
  const circleR = new Rng(2018);
  const circleChairs = Array.from({ length: 5 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 5;
    const x = Math.sin(angle) * 1.05;
    const z = Math.cos(angle) * 1.05;
    return shift(
      { x, z, ry: Math.atan2(-x, -z) + circleR.range(-0.02, 0.02) },
      CI.x, CI.z,
    );
  });
  const roundTable = { x: CI.x, z: CI.z, r: 0.62, h: 0.73 };

  // 챌린지: 보드 쪽 벤치 + 중앙 스탠드 테이블
  const chBench = shift({ x: 0, z: 1.5, ry: Math.PI, w: 1.6, d: 0.42, h: 0.43 }, CH.x, CH.z);
  const chIsland = shift({ x: 0, z: -0.2, ry: 0, w: 1.1, d: 0.7, h: 0.95, kind: 'stand' as const }, CH.x, CH.z);

  // 공동 작업 책상 3
  const cwDesks = [
    { x: -2.2, z: -0.35, ry: 0, w: 1.2, d: 0.6, h: 0.73, seatId: 'desk-1' },
    { x: 0.1, z: -0.35, ry: 0, w: 1.2, d: 0.6, h: 0.73, seatId: 'desk-2' },
    { x: 2.4, z: -0.35, ry: 0, w: 1.2, d: 0.6, h: 0.73, seatId: 'desk-3' },
  ].map((d) => shift(d, CW.x, CW.z));

  // 신기술: 실험 벤치 2 + 대표 책상
  const teDesks = [
    { x: -1.6, z: -0.2, ry: 0, w: 1.35, d: 0.7, h: 0.78, seatId: 'desk-tech-1' },
    { x: 1.5, z: -0.2, ry: 0, w: 1.35, d: 0.7, h: 0.78, seatId: 'desk-tech-2' },
  ].map((d) => shift(d, TE.x, TE.z));

  const seats: Seat[] = [
    ...massageChairs.map((c, i) => ({
      ...c, id: `massage-${i + 1}`, y: 0.47, approach: 1 as const, from: { x: c.x, z: c.z + 0.9 },
    })),
    ...[0.4, 0, -0.4].map((dx, i) => ({
      id: `sofa-${i + 1}`, x: sofa.x + dx, z: sofa.z - 0.09, ry: Math.PI, y: 0.49, approach: 1 as const,
      from: { x: sofa.x + dx, z: sofa.z + 0.85 },
    })),
    { id: 'bench-1', x: -2.35, z: 3.55, ry: Math.PI, y: 0.49, approach: 1 as const },
    { id: 'bench-2', x: -1.7, z: 3.55, ry: Math.PI, y: 0.49, approach: 1 as const },
    { id: 'cafe-1', x: -2.55, z: 0.55, ry: 0, y: 0.475, approach: -1 as const },
    { id: 'arm-bs', ...bsArm, y: 0.44, approach: 1 as const },
    ...circleChairs.map((c, i) => ({
      ...c, id: `circle-${i + 1}`, y: 0.475, approach: -1 as const,
      from: { x: CI.x + (c.x - CI.x) * 1.35, z: CI.z + (c.z - CI.z) * 1.35 },
    })),
    { id: 'bench-ga-1', x: gaBench.x - 0.35, z: gaBench.z, ry: Math.PI, y: 0.49, approach: 1 as const },
    { id: 'bench-ga-2', x: gaBench.x + 0.35, z: gaBench.z, ry: Math.PI, y: 0.49, approach: 1 as const },
    { id: 'bench-ch-1', x: chBench.x - 0.4, z: chBench.z, ry: Math.PI, y: 0.49, approach: 1 as const },
    { id: 'bench-ch-2', x: chBench.x + 0.4, z: chBench.z, ry: Math.PI, y: 0.49, approach: 1 as const },
    ...cwDesks.map((d) => ({
      id: d.seatId, x: d.x - 0.06, z: d.z + 0.55, ry: Math.PI, y: 0.475, approach: -1 as const,
    })),
    ...teDesks.map((d) => ({
      id: d.seatId, x: d.x - 0.06, z: d.z + 0.58, ry: Math.PI, y: 0.475, approach: -1 as const,
    })),
  ];

  const spawn = ZONE_BOUNDS[0].spawn;

  // 칸막이: 가로·세로로 구역을 나누고 문틀만 비운다
  const H = 2.75;
  const partitions: PartitionWall[] = [
    // 북열(책방|전시|마켓) 남쪽 경계
    wall(-8, -1.7, 0, 8.2, 0),
    wall(0, -1.7, 0, 7.0, 0),
    wall(8, -1.7, 0, 8.2, 0),
    // 북열 세로 칸막이
    wall(-3.7, -4.85, Math.PI / 2, 6.2, 0.2),
    wall(3.7, -4.85, Math.PI / 2, 6.2, -0.2),
    // 중열 세로(모임|광장|챌린지)
    wall(-3.7, 1.4, Math.PI / 2, 5.8, 0),
    wall(3.7, 1.4, Math.PI / 2, 5.8, 0),
    // 남열(공동|신기술) 북쪽 경계
    wall(-6.1, 4.5, 0, 11.5, -2.0),
    wall(6.1, 4.5, 0, 11.5, 2.0),
    // 공동|신기술 사이
    wall(0, 6.25, Math.PI / 2, 3.3, 0),
  ];
  void H;

  // 빠른 이동용 문 표시(클릭하면 구역으로 워프). 문틀은 open.
  const portals: PortalDef[] = [
    { to: 'bookshop', x: -8, z: -1.55, ry: Math.PI, w: 1.2, d: 0.14, label: '책방 실험실', open: true },
    { to: 'gallery', x: 0, z: -1.55, ry: Math.PI, w: 1.2, d: 0.14, label: '전시 실험실', open: true },
    { to: 'market', x: 8, z: -1.55, ry: Math.PI, w: 1.2, d: 0.14, label: '마켓 실험실', open: true },
    { to: 'circle', x: -3.55, z: 1.2, ry: -Math.PI / 2, w: 1.15, d: 0.14, label: '모임 실험실', open: true },
    { to: 'challenge', x: 3.55, z: 1.2, ry: Math.PI / 2, w: 1.15, d: 0.14, label: '챌린지 실험실', open: true },
    { to: 'cowork', x: -6, z: 4.35, ry: 0, w: 1.2, d: 0.14, label: '공동 작업실', open: true },
    { to: 'tech', x: 6, z: 4.35, ry: 0, w: 1.2, d: 0.14, label: '신기술 개발실', open: true },
    { to: 'shop', x: 0, z: 4.35, ry: Math.PI, w: 1.3, d: 0.14, label: '실험실 광장', open: true },
  ];

  return {
    id: 'shop',
    label: LABELS.shop,
    room: CAMPUS,
    openings: [
      { cx: -1.4, w: 2.4, y0: 0.7, y1: 2.55, kind: 'window' },
      { cx: 1.4, w: 2.4, y0: 0.7, y1: 2.55, kind: 'window' },
    ],
    shelves: [
      ...bsShelves,
      // 마켓 뒷벽 선반
      shift({ x: -1.4, z: -2.45, ry: 0, w: 1.5, wing: 'A' as const }, MK.x, MK.z),
      shift({ x: 0.3, z: -2.45, ry: 0, w: 1.5, wing: 'A' as const, faceOut: true }, MK.x, MK.z),
      // 신기술 벽 선반
      shift({ x: 3.4, z: 0.2, ry: -Math.PI / 2, w: 1.4, wing: 'C' as const }, TE.x, TE.z),
    ],
    islands: [...bsIslands, ...mkIslands, chIsland],
    partitions,
    readingTable: null,
    roundTable,
    armchairs: [bsArm],
    sideTable: shift({ x: -2.9, z: 0.9, ry: 0, r: 0.18, h: 0.5 }, BS.x, BS.z),
    chairs: circleChairs,
    storeTable: null,
    storeChairs: [],
    sofa,
    coffeeTable: { x: 1.55, z: 1.05, ry: 0, w: 0.75, d: 0.4, h: 0.4 },
    rug: { x: 1.55, z: 1.5, w: 2.4, d: 1.8 },
    bench: gaBench,
    barTable: null,
    counter: bsCounter,
    massageChairs,
    coffeeBar: { x: -3.1, z: 1.5, ry: Math.PI / 2, w: 1.4, d: 0.48, h: 0.9 },
    cafeTable: { x: -2.55, z: 1.15, r: 0.28, h: 0.68 },
    workDesk: cwDesks[0],
    extraDesks: [...cwDesks.slice(1), ...teDesks],
    exhibits,
    pedestals,
    floorLamps: [
      { x: -2.8, z: -0.9, ry: 0 },
      { x: 2.6, z: 2.0, ry: 0 },
      shift({ x: -3.0, z: 1.9, ry: 0 }, BS.x, BS.z),
      shift({ x: -2.9, z: -1.7, ry: 0 }, GA.x, GA.z),
      shift({ x: 2.9, z: -1.7, ry: 0 }, GA.x, GA.z),
      shift({ x: 2.8, z: 1.6, ry: 0 }, CH.x, CH.z),
    ],
    pendants: [
      { x: 1.35, z: 1.1, drop: 0.7 },
      { x: -2.6, z: 1.3, drop: 0.7 },
      shift({ x: -1.0, z: -0.2, drop: 0.75 }, BS.x, BS.z),
      shift({ x: 1.0, z: -0.2, drop: 0.75 }, BS.x, BS.z),
      { x: roundTable.x, z: roundTable.z, drop: 0.65 },
      shift({ x: 0, z: 0.2, drop: 0.85 }, GA.x, GA.z),
      shift({ x: 0, z: -0.2, drop: 0.7 }, CH.x, CH.z),
      shift({ x: 0.1, z: -0.2, drop: 0.55 }, CW.x, CW.z),
      shift({ x: 0, z: -0.1, drop: 0.55 }, TE.x, TE.z),
    ],
    floorPlants: [
      { x: 0.2, z: -1.0, scale: 0.8 },
      { x: 3.2, z: 3.6, scale: 0.75 },
      { x: -3.2, z: 3.6, scale: 0.8 },
      shift({ x: 2.9, z: 1.9, scale: 0.7 }, BS.x, BS.z),
      shift({ x: -2.9, z: 1.7, scale: 0.65 }, GA.x, GA.z),
      shift({ x: 2.9, z: 1.7, scale: 0.65 }, GA.x, GA.z),
      shift({ x: -2.6, z: 1.5, scale: 0.7 }, CI.x, CI.z),
      shift({ x: 2.8, z: -1.5, scale: 0.7 }, MK.x, MK.z),
    ],
    seats,
    spawn,
    spawns: [spawn, { x: 1.4, z: 2.5, ry: Math.PI }, { x: -1.4, z: 2.5, ry: Math.PI }],
    portals,
  };
}

const CAMPUS_LAYOUT = makeCampus();
export const SPACE_LAYOUTS: Record<SpaceId, SpaceLayout> = Object.fromEntries(
  SPACE_ORDER.map((id) => [id, CAMPUS_LAYOUT]),
) as Record<SpaceId, SpaceLayout>;

// ---------- 활성 구역(라벨·기능) / 캠퍼스 레이아웃 상수 ----------
let activeId: SpaceId = 'shop';

export function currentSpaceId(): SpaceId {
  return activeId;
}

export function currentSpace(): SpaceLayout {
  return CAMPUS_LAYOUT;
}

/** 구역별 정원(NPC 제외). */
export const SPACE_CAPACITY: Record<SpaceId, number> = {
  shop: 2, bookshop: 2, circle: 2, gallery: 2,
  market: 2, challenge: 2, cowork: 2, tech: 2,
};

export function spaceCapacity(id: SpaceId = activeId): number {
  return SPACE_CAPACITY[id];
}

export function spaceLabel(id: SpaceId = activeId): string {
  return LABELS[id];
}

/** 구역만 바꾸고, 가구 상수는 항상 캠퍼스를 쓴다. */
export function setActiveZone(id: SpaceId): void {
  activeId = id;
}

/** 활성 레이아웃 필드를 모듈 export 상수의 내용에 반영 */
export function applyLayout(id: SpaceId = 'shop'): SpaceLayout {
  activeId = id;
  const L = CAMPUS_LAYOUT;
  Object.assign(ROOM, L.room);
  BACK_OPENINGS.splice(0, BACK_OPENINGS.length, ...L.openings);
  SHELVES.splice(0, SHELVES.length, ...L.shelves);
  ISLANDS.splice(0, ISLANDS.length, ...L.islands);
  PARTITIONS.splice(0, PARTITIONS.length, ...L.partitions);
  ARMCHAIRS.splice(0, ARMCHAIRS.length, ...L.armchairs);
  assignOrClear(SIDE_TABLE, L.sideTable);
  CHAIRS.splice(0, CHAIRS.length, ...L.chairs);
  STORE_CHAIRS.splice(0, STORE_CHAIRS.length, ...(L.storeChairs ?? []));
  FLOOR_LAMPS.splice(0, FLOOR_LAMPS.length, ...L.floorLamps);
  PENDANTS.splice(0, PENDANTS.length, ...L.pendants);
  FLOOR_PLANTS.splice(0, FLOOR_PLANTS.length, ...L.floorPlants);
  SEATS.splice(0, SEATS.length, ...L.seats);
  SPAWNS.splice(0, SPAWNS.length, ...L.spawns);
  Object.assign(SPAWN, zoneSpawn(id));

  assignOrClear(ROUND_TABLE, L.roundTable);
  assignOrClear(READING_TABLE, L.readingTable);
  assignOrClear(STORE_TABLE, L.storeTable);
  assignOrClear(SOFA, L.sofa);
  assignOrClear(COFFEE_TABLE, L.coffeeTable);
  assignOrClear(RUG, L.rug);
  assignOrClear(BENCH, L.bench);
  assignOrClear(BAR_TABLE, L.barTable);
  assignOrClear(COUNTER, L.counter);
  MASSAGE_CHAIRS.splice(0, MASSAGE_CHAIRS.length, ...L.massageChairs);
  assignOrClear(COFFEE_BAR, L.coffeeBar);
  assignOrClear(CAFE_TABLE, L.cafeTable);
  // 작업 책상: 구역에 따라 대표 책상 선택
  if (id === 'tech') {
    const techDesk = L.extraDesks.find((d) => d.seatId.startsWith('desk-tech')) ?? L.extraDesks[0];
    assignOrClear(WORK_DESK, techDesk ?? L.workDesk);
  } else if (id === 'cowork') {
    assignOrClear(WORK_DESK, L.workDesk);
  } else {
    assignOrClear(WORK_DESK, L.workDesk);
  }
  EXTRA_DESKS.splice(0, EXTRA_DESKS.length, ...L.extraDesks);
  PORTALS.splice(0, PORTALS.length, ...L.portals);
  EXHIBITS.splice(0, EXHIBITS.length, ...L.exhibits);
  PEDESTALS.splice(0, PEDESTALS.length, ...L.pedestals);
  return L;
}

function assignOrClear<T extends object>(target: T, src: Partial<T> | null | undefined): void {
  if (!src) {
    for (const k of Object.keys(target) as (keyof T)[]) delete (target as Record<string, unknown>)[k as string];
    (target as { _empty?: boolean })._empty = true;
    return;
  }
  delete (target as { _empty?: boolean })._empty;
  for (const k of Object.keys(target) as string[]) {
    if (!(k in src)) delete (target as Record<string, unknown>)[k];
  }
  Object.assign(target, src);
}

export function isPresent(obj: object | null | undefined): boolean {
  if (!obj) return false;
  const o = obj as { _empty?: boolean; w?: number; rows?: number };
  if (o._empty) return false;
  if (typeof o.w === 'number' && o.w < 0.05) return false;
  if (typeof o.rows === 'number' && o.rows < 1) return false;
  return true;
}

const HUB = CAMPUS_LAYOUT;
export const ROOM: RoomBounds = { ...HUB.room };
export const BACK_OPENINGS: Opening[] = [...HUB.openings];
export const SHELVES = [...HUB.shelves];
export const ISLANDS = [...HUB.islands];
export const PARTITIONS: PartitionWall[] = [...HUB.partitions];
export const ISLAND = ISLANDS[0];
export const READING_TABLE: Placement & { w: number; d: number; h: number } = { x: 0, z: 0, ry: 0, w: 0, d: 0, h: 0, _empty: true } as never;
export const ROUND_TABLE = { ...(HUB.roundTable!) };
export const ARMCHAIRS: Placement[] = [...HUB.armchairs];
export const SIDE_TABLE = { ...(HUB.sideTable!) };
export const CHAIRS: Placement[] = [...HUB.chairs];
export const STORE_TABLE: Placement & { w: number; d: number; h: number } = { x: 0, z: 0, ry: 0, w: 0, d: 0, h: 0, _empty: true } as never;
export const STORE_CHAIRS: Placement[] = [];
export const SOFA: Placement & { w: number; d: number } = { ...(HUB.sofa!) };
export const COFFEE_TABLE: Placement & { w: number; d: number; h: number } = { ...(HUB.coffeeTable!) };
export const RUG = { ...HUB.rug! };
export const BENCH: Placement & { w: number; d: number; h: number } = { ...(HUB.bench!) };
export const BAR_TABLE: Placement & { w: number; d: number; h: number } = { x: 0, z: 0, ry: 0, w: 0, d: 0, h: 0, _empty: true } as never;
export const COUNTER: Placement & { w: number; d: number; h: number } = { ...(HUB.counter!) };
export const MASSAGE_CHAIRS: Placement[] = [...HUB.massageChairs];
export const COFFEE_BAR = { ...(HUB.coffeeBar!) };
export const CAFE_TABLE = { ...(HUB.cafeTable!) };
export const WORK_DESK: Placement & { w: number; d: number; h: number } = { ...(HUB.workDesk!) };
export const EXTRA_DESKS: (Placement & { w: number; d: number; h: number; seatId: string })[] = [...HUB.extraDesks];
export const FLOOR_LAMPS: Placement[] = [...HUB.floorLamps];
export const PENDANTS: { x: number; z: number; drop: number }[] = [...HUB.pendants];
export const FLOOR_PLANTS: { x: number; z: number; scale: number }[] = [...HUB.floorPlants];
export const SEATS: Seat[] = [...HUB.seats];
export const SPAWN = { ...HUB.spawn };
export const SPAWNS: { x: number; z: number; ry: number }[] = [...HUB.spawns];
export const PORTALS: PortalDef[] = [...HUB.portals];
export const EXHIBITS: SpaceLayout['exhibits'] = [...HUB.exhibits];
export const PEDESTALS: SpaceLayout['pedestals'] = [...HUB.pedestals];

applyLayout('shop');

export function seatApproach(s: Seat, dist = 0.5): { x: number; z: number } {
  if (s.from) return s.from;
  return { x: s.x + Math.sin(s.ry) * dist * s.approach, z: s.z + Math.cos(s.ry) * dist * s.approach };
}

export function colliders(): Collider[] {
  const list: Collider[] = [];
  const rect = (
    cx: number, cz: number, w: number, d: number, ry: number, h: number,
    seats?: string[],
  ) => {
    if (w <= 0.01 || d <= 0.01) return;
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
    list.push({
      x0: cx - hw, x1: cx + hw, z0: cz - hd, z1: cz + hd, h,
      seatable: !!seats, seats,
    });
  };
  for (const s of SHELVES) rect(s.x, s.z, s.w, SHELF.d, s.ry, SHELF.h);
  for (const p of PARTITIONS) {
    const thick = 0.12;
    if (!p.door) {
      rect(p.x, p.z, p.len, thick, p.ry, p.h);
      continue;
    }
    const cos = Math.cos(p.ry), sin = Math.sin(p.ry);
    const left = -p.len / 2, right = p.len / 2;
    const d0 = p.door.cx - p.door.w / 2, d1 = p.door.cx + p.door.w / 2;
    const seg = (a: number, b: number) => {
      const len = b - a;
      if (len < 0.08) return;
      const mid = (a + b) / 2;
      rect(p.x + mid * cos, p.z + mid * sin, len, thick, p.ry, p.h);
    };
    seg(left, d0);
    seg(d1, right);
  }
  for (const isl of ISLANDS) rect(isl.x, isl.z, isl.w, isl.d, isl.ry, isl.h);
  if (isPresent(STORE_TABLE)) rect(STORE_TABLE.x, STORE_TABLE.z, STORE_TABLE.w, STORE_TABLE.d, 0, STORE_TABLE.h);
  STORE_CHAIRS.forEach((c, i) => rect(c.x, c.z, 0.36, 0.36, 0, 0.84, [`store-${i + 1}`]));
  if (isPresent(READING_TABLE)) {
    rect(READING_TABLE.x, READING_TABLE.z, READING_TABLE.w, READING_TABLE.d, 0, READING_TABLE.h);
  }
  if (isPresent(ROUND_TABLE)) rect(ROUND_TABLE.x, ROUND_TABLE.z, ROUND_TABLE.r * 2, ROUND_TABLE.r * 2, 0, ROUND_TABLE.h);
  for (const seat of SEATS) rect(seat.x, seat.z, 0.44, 0.44, seat.ry, seat.y + 0.04, [seat.id]);
  if (isPresent(SOFA)) {
    const off = SOFA.d / 2 - 0.1;
    rect(SOFA.x - Math.sin(SOFA.ry) * off, SOFA.z - Math.cos(SOFA.ry) * off, SOFA.w, 0.2, SOFA.ry, 0.8);
  }
  if (isPresent(COUNTER)) rect(COUNTER.x, COUNTER.z, COUNTER.w, COUNTER.d, COUNTER.ry, COUNTER.h);
  if (isPresent(COFFEE_BAR)) rect(COFFEE_BAR.x, COFFEE_BAR.z, COFFEE_BAR.w, COFFEE_BAR.d, COFFEE_BAR.ry, COFFEE_BAR.h);
  if (isPresent(CAFE_TABLE)) rect(CAFE_TABLE.x, CAFE_TABLE.z, CAFE_TABLE.r * 2, CAFE_TABLE.r * 2, 0, CAFE_TABLE.h);
  if (isPresent(WORK_DESK)) rect(WORK_DESK.x, WORK_DESK.z, WORK_DESK.w, WORK_DESK.d, WORK_DESK.ry, WORK_DESK.h);
  for (const d of EXTRA_DESKS) rect(d.x, d.z, d.w, d.d, d.ry, d.h);
  for (const m of MASSAGE_CHAIRS) {
    rect(m.x - Math.sin(m.ry) * 0.42, m.z - Math.cos(m.ry) * 0.42, 0.84, 0.36, m.ry, 1.25);
  }
  if (isPresent(BENCH)) rect(BENCH.x, BENCH.z, BENCH.w, BENCH.d * 0.3, BENCH.ry, BENCH.h);
  if (isPresent(BAR_TABLE)) {
    rect(BAR_TABLE.x, BAR_TABLE.z, BAR_TABLE.w, BAR_TABLE.d, 0, BAR_TABLE.h);
    for (const s of SEATS.filter((seat) => seat.id.startsWith('bar-') || seat.id.startsWith('counter-'))) {
      rect(s.x, s.z, 0.4, 0.4, 0, 0.95, [s.id]);
    }
  }
  if (isPresent(SIDE_TABLE)) rect(SIDE_TABLE.x, SIDE_TABLE.z, SIDE_TABLE.r * 2, SIDE_TABLE.r * 2, 0, SIDE_TABLE.h);
  if (isPresent(COFFEE_TABLE)) rect(COFFEE_TABLE.x, COFFEE_TABLE.z, COFFEE_TABLE.w, COFFEE_TABLE.d, COFFEE_TABLE.ry, COFFEE_TABLE.h);
  for (const l of FLOOR_LAMPS) rect(l.x, l.z, 0.34, 0.34, 0, 1.5);
  for (const p of PEDESTALS) rect(p.x, p.z, 0.5, 0.5, 0, 1.35);
  for (const p of FLOOR_PLANTS) rect(p.x, p.z, 0.45 * p.scale, 0.45 * p.scale, 0, 1.0 * p.scale);
  return list;
}
