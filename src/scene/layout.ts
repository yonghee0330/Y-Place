import { Rng } from '../core/rng';
// Y-Place 메타공간 실험실: 넓은 로비에서 책방·서재·모임방·작업실·전시실로 갈라지는 시험용 방들.
// 가구·이동·클릭이 공유하는 공간 데이터.
// x: 왼쪽(-)→오른쪽(+), z: 뒤 창벽(-)→앞 입구(+). 단위 m, 바닥 y=0.
// 빌드·전환 시 applyLayout()으로 활성 공간 상수를 맞춘다.

export type WorkId = 'work1' | 'work2' | 'work3' | 'work4';
/** 'shop'은 실험실 로비다(방문자 저장값·채널 이름을 지키려고 옛 id를 그대로 쓴다). */
export type SpaceId = 'shop' | 'bookshop' | 'library' | 'circle' | 'gallery' | WorkId;
export const WORK_IDS: WorkId[] = ['work1', 'work2', 'work3', 'work4'];
const WORK_LABELS: Record<WorkId, string> = { work1: '작업실 1', work2: '작업실 2', work3: '작업실 3', work4: '작업실 4' };
export function isWorkSpace(id: SpaceId): id is WorkId {
  return (WORK_IDS as SpaceId[]).includes(id);
}

export interface RoomBounds {
  w: number; d: number; h: number;
  x0: number; x1: number; z0: number; z1: number;
}

export interface Opening { cx: number; w: number; y0: number; y1: number; kind: 'window' | 'door' }
export interface Placement { x: number; z: number; ry: number }
export interface Seat {
  id: string; x: number; z: number; ry: number; y: number; approach: 1 | -1;
  /** 좁은 곳의 좌석: 다가가는 지점을 직접 지정(없으면 앞/뒤 0.5m) */
  from?: { x: number; z: number };
}
export interface Collider {
  x0: number; x1: number; z0: number; z1: number; h: number;
  seatable: boolean;
  seats?: string[];
}
export interface PortalDef {
  /** 이 문으로 연결되는 공간 */
  to: SpaceId;
  x: number; z: number; ry: number;
  label: string;
  /** 클릭/트리거 박스 크기 */
  w: number; d: number;
  /** true면 문짝 없이 문틀만 생성 */
  open?: boolean;
  /** 문 위 간판 폭(문이 나란히 붙어 있을 때 겹치지 않게 줄인다) */
  signW?: number;
  /**
   * 문 하나로 여러 방에 들어갈 때: 누르면 이 목록에서 고른다(간판은 label을 쓴다).
   * 나중에 방 주인이 정해지면 고르는 대신 자기 방으로 바로 보낸다(app.ts의 resolveWorkRoom).
   */
  choose?: SpaceId[];
}

export interface PartitionWall {
  x: number; z: number; ry: number; len: number; h: number;
  door?: { cx: number; w: number; h: number };
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
  /** w·d는 사각형 크기. round면 지름 w(또는 min(w,d))인 원형 카페트 */
  rug: { x: number; z: number; w: number; d: number; round?: boolean } | null;
  bench: (Placement & { w: number; d: number; h: number }) | null;
  /** 창가 바테이블(높은 테이블) */
  barTable: (Placement & { w: number; d: number; h: number }) | null;
  counter: (Placement & { w: number; d: number; h: number }) | null;
  /** 안마 의자(앉은 사람은 +z) */
  massageChairs: Placement[];
  /** 커피 코너 수납장 카운터(손님 쪽이 +z) */
  coffeeBar: (Placement & { w: number; d: number; h: number }) | null;
  /** 커피 코너의 작은 원형 테이블 */
  cafeTable: { x: number; z: number; r: number; h: number } | null;
  /** 1인 작업실 책상(앉는 쪽이 +z) */
  workDesk: (Placement & { w: number; d: number; h: number }) | null;
  /** 전시실 벽 작품(앞면 +z). seed로 그림이 정해진다 */
  exhibits: (Placement & { w: number; h: number; y: number; seed: number; title: string })[];
  /** 전시 받침대 위 조형물 */
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

function roomOf(w: number, d: number, h = 2.9): RoomBounds {
  return { w, d, h, x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2 };
}

function emptyBase(id: SpaceId, label: string, room: RoomBounds): Omit<SpaceLayout,
  'openings' | 'shelves' | 'islands' | 'seats' | 'spawn' | 'spawns' | 'portals' | 'pendants' | 'floorLamps' | 'floorPlants' | 'chairs'
> {
  return {
    id, label, room,
    partitions: [],
    sofa: null, coffeeTable: null, rug: null, bench: null, barTable: null, counter: null,
    armchairs: [], sideTable: null, roundTable: null, readingTable: null, storeTable: null, storeChairs: [],
    massageChairs: [], coffeeBar: null, cafeTable: null, workDesk: null, exhibits: [], pedestals: [],
  };
}

function makeShop(): SpaceLayout {
  // 실험실 로비: 10×7m. 뒤 창가에 쉬는 자리, 왼쪽 커피 코너, 벽마다 실험실 문.
  // 입장 자리는 앞벽에서 1.6m — 따라가기 카메라가 아바타 뒤에 설 자리가 있다
  const spawn = { x: 0, z: 1.9, ry: Math.PI };
  const massageChairs = [{ x: -2.2, z: -2.65, ry: 0.12 }, { x: -0.95, z: -2.65, ry: -0.12 }];
  const sofa = { x: 1.55, z: 0.35, ry: Math.PI, w: 1.6, d: 0.8 };
  const B = 3.5, R = 5;
  // 오른쪽 벽: 서재·모임방·개인 작업실, 뒷벽 양 끝: 책방·전시실
  const workDoor: PortalDef = { to: 'work1', x: R - 0.08, z: 2.05, ry: -Math.PI / 2, w: 0.86, d: 0.16, label: '개인 작업실', choose: [...WORK_IDS] };
  return { ...emptyBase('shop', '실험실 로비', roomOf(10, 7, 3.0)),
    openings: [{ cx: -1.55, w: 2.5, y0: .65, y1: 2.5, kind: 'window' }, { cx: 1.55, w: 2.5, y0: .65, y1: 2.5, kind: 'window' }],
    shelves: [{ x: -R + 0.21, z: -2.3, ry: Math.PI / 2, w: 1.65, wing: 'A' }],
    islands: [], chairs: [], massageChairs, sofa,
    coffeeTable: { x: 1.55, z: -0.8, ry: 0, w: 0.8, d: 0.4, h: 0.4 },
    coffeeBar: { x: -R + 0.28, z: 0.65, ry: Math.PI / 2, w: 1.5, d: 0.5, h: 0.9 },
    cafeTable: { x: -3.25, z: 0.45, r: 0.3, h: 0.68 },
    sideTable: { x: -1.58, z: -3.0, ry: 0, r: .2, h: .5 },
    bench: { x: -2.6, z: B - 0.4, ry: Math.PI, w: 1.3, d: .4, h: .43 },
    rug: { x: 1.55, z: -0.25, w: 2.6, d: 2.0 },
    floorLamps: [{ x: -3.1, z: -3.05, ry: 0 }, { x: 3.0, z: 0.9, ry: 0 }],
    floorPlants: [{ x: 0.35, z: -3.1, scale: .8 }, { x: 4.45, z: 3.05, scale: .75 }, { x: -4.5, z: 3.05, scale: .85 }, { x: 4.5, z: -3.05, scale: .7 }],
    pendants: [{ x: 1.55, z: -0.2, drop: .7 }, { x: -3.3, z: 0.6, drop: .7 }, { x: -1.55, z: -2.3, drop: .8 }],
    seats: [
      ...massageChairs.map((c, i) => ({ ...c, id: `massage-${i + 1}`, y: 0.47, approach: 1 as const, from: { x: c.x, z: c.z + 0.9 } })),
      // 소파는 창 쪽(-z)을 본다
      ...[0.42, 0, -0.42].map((dx, i) => ({ id: `sofa-${i + 1}`, x: sofa.x + dx, z: sofa.z - 0.09, ry: Math.PI, y: 0.49, approach: 1 as const })),
      { id: 'bench-1', x: -2.92, z: B - 0.4, ry: Math.PI, y: .49, approach: 1 },
      { id: 'bench-2', x: -2.28, z: B - 0.4, ry: Math.PI, y: .49, approach: 1 },
      { id: 'cafe-1', x: -3.25, z: -0.13, ry: 0, y: .475, approach: -1 },
    ],
    spawn, spawns: [spawn, { x: 1.3, z: 2.0, ry: Math.PI }, { x: -1.3, z: 2.0, ry: Math.PI }],
    portals: [
      { to: 'bookshop', x: -3.9, z: -B + 0.08, ry: 0, w: .86, d: .16, label: '책방 실험실' },
      { to: 'gallery', x: 3.9, z: -B + 0.08, ry: 0, w: .86, d: .16, label: '전시실' },
      { to: 'library', x: R - 0.08, z: -1.75, ry: -Math.PI / 2, w: .86, d: .16, label: '서재' },
      { to: 'circle', x: R - 0.08, z: 0.15, ry: -Math.PI / 2, w: .86, d: .16, label: '작은 모임방' },
      workDoor,
    ],
  };
}
/** 책방 실험실: 벽 서가 + 가운데 매대 두 개 + 계산대 + 읽는 의자. 7×5.5m */
function makeBookshop(): SpaceLayout {
  const L = -3.5, R = 3.5, B = -2.75, F = 2.75;
  const spawn = { x: -1.6, z: 1.6, ry: Math.PI };
  const arm = { x: -2.55, z: 1.75, ry: Math.PI * 0.78 };
  return { ...emptyBase('bookshop', '책방 실험실', roomOf(7, 5.5, 2.9)),
    openings: [],
    shelves: [
      { x: -2.1, z: B + 0.21, ry: 0, w: 1.65, wing: 'A' },
      { x: 0, z: B + 0.21, ry: 0, w: 1.65, wing: 'A', faceOut: true },
      { x: 2.1, z: B + 0.21, ry: 0, w: 1.65, wing: 'A' },
      { x: L + 0.21, z: -0.85, ry: Math.PI / 2, w: 1.65, wing: 'B' },
      { x: L + 0.21, z: 0.85, ry: Math.PI / 2, w: 1.2, wing: 'B', faceOut: true },
      { x: R - 0.21, z: -0.85, ry: -Math.PI / 2, w: 1.65, wing: 'C' },
    ],
    islands: [
      { x: -1.05, z: -0.35, ry: 0, w: 1.3, d: 0.75, h: 0.78, kind: 'flat' },
      { x: 1.05, z: -0.35, ry: 0, w: 1.3, d: 0.75, h: 0.92, kind: 'stand' },
    ],
    chairs: [],
    counter: { x: R - 0.5, z: 1.55, ry: -Math.PI / 2, w: 1.4, d: 0.55, h: 0.95 },
    armchairs: [arm],
    sideTable: { x: -3.05, z: 1.05, ry: 0, r: .18, h: .5 },
    rug: { x: 0, z: -0.35, w: 3.6, d: 1.9 },
    floorLamps: [{ x: -3.1, z: 2.35, ry: 0 }, { x: 2.85, z: 0.55, ry: 0 }],
    floorPlants: [{ x: 3.05, z: 2.35, scale: .75 }, { x: -3.1, z: -0.2, scale: .62 }],
    pendants: [{ x: -1.05, z: -0.35, drop: .75 }, { x: 1.05, z: -0.35, drop: .75 }, { x: 2.6, z: 1.55, drop: .6 }],
    seats: [{ id: 'arm-1', ...arm, y: 0.44, approach: 1 }],
    spawn, spawns: [spawn, { x: -0.6, z: 1.7, ry: Math.PI }],
    portals: [{ to: 'shop', x: -1.6, z: F - 0.08, ry: Math.PI, w: .86, d: .16, label: '로비' }],
  };
}
/** 서재: 세 벽을 채운 서가와 긴 열람 테이블, 구석의 안락의자. 6×5m */
function makeLibrary(): SpaceLayout {
  const L = -3, R = 3, B = -2.5, F = 2.5;
  // 앞벽에서 1.5m: 카메라가 뒤에 설 자리
  const spawn = { x: 1.8, z: 1.0, ry: Math.PI };
  const table = { x: 0, z: -0.1, ry: 0, w: 1.9, d: 0.85, h: 0.75 };
  const chairs = [
    { x: -0.5, z: table.z - 0.7, ry: 0 }, { x: 0.5, z: table.z - 0.7, ry: 0 },
    { x: -0.5, z: table.z + 0.7, ry: Math.PI }, { x: 0.5, z: table.z + 0.7, ry: Math.PI },
  ];
  const arm = { x: -2.3, z: 1.6, ry: Math.PI * 0.8 };
  return { ...emptyBase('library', '서재', roomOf(6, 5, 2.8)),
    openings: [],
    shelves: [
      { x: -1.85, z: B + 0.21, ry: 0, w: 1.65, wing: 'A' },
      { x: 0, z: B + 0.21, ry: 0, w: 1.65, wing: 'A', faceOut: true },
      { x: 1.85, z: B + 0.21, ry: 0, w: 1.65, wing: 'A' },
      { x: L + 0.21, z: -1.05, ry: Math.PI / 2, w: 1.65, wing: 'B', faceOut: true },
      { x: L + 0.21, z: 0.55, ry: Math.PI / 2, w: 1.2, wing: 'B' },
      { x: R - 0.21, z: -1.05, ry: -Math.PI / 2, w: 1.65, wing: 'C' },
      { x: R - 0.21, z: 0.55, ry: -Math.PI / 2, w: 1.2, wing: 'C', faceOut: true },
    ],
    islands: [], chairs,
    readingTable: table,
    armchairs: [arm],
    sideTable: { x: -2.6, z: 0.95, ry: 0, r: .18, h: .5 },
    rug: { x: 0, z: -0.1, w: 3.0, d: 2.2 },
    floorLamps: [{ x: -2.65, z: 2.1, ry: 0 }, { x: 2.55, z: -0.85, ry: 0 }],
    floorPlants: [{ x: 2.6, z: 2.1, scale: .7 }, { x: -2.7, z: -1.9, scale: .58 }],
    pendants: [{ x: -0.5, z: -0.1, drop: .8 }, { x: 0.5, z: -0.1, drop: .8 }],
    seats: [
      ...chairs.map((c, i) => ({ ...c, id: `chair-${i + 1}`, y: 0.475, approach: -1 as const })),
      { id: 'arm-1', ...arm, y: 0.44, approach: 1 },
    ],
    spawn, spawns: [spawn, { x: 1.2, z: 1.3, ry: Math.PI }],
    portals: [{ to: 'shop', x: 1.8, z: F - 0.08, ry: Math.PI, w: .86, d: .16, label: '로비' }],
  };
}
/** 전시실: 벽에 작품, 가운데 벤치, 받침대 위 조형물. 7×5m, 천장이 조금 높다 */
function makeGallery(): SpaceLayout {
  const L = -3.5, R = 3.5, B = -2.5, F = 2.5;
  // 앞벽에서 1.6m, 벤치 옆: 들어서면 뒷벽 작품이 정면에 보인다
  const spawn = { x: -1.6, z: 0.9, ry: Math.PI };
  const wall = 0.03;
  return { ...emptyBase('gallery', '전시실', roomOf(7, 5, 3.2)),
    openings: [], shelves: [], islands: [], chairs: [],
    bench: { x: 0, z: 0.55, ry: Math.PI, w: 1.5, d: .42, h: .43 },
    exhibits: [
      { x: -2.2, z: B + wall, ry: 0, y: 1.55, w: 1.0, h: 0.75, seed: 11, title: '실험 01 · 창가의 오후' },
      { x: 0, z: B + wall, ry: 0, y: 1.6, w: 1.3, h: 0.95, seed: 23, title: '실험 02 · 겹쳐 읽기' },
      { x: 2.2, z: B + wall, ry: 0, y: 1.55, w: 1.0, h: 0.75, seed: 37, title: '실험 03 · 서가의 리듬' },
      { x: L + wall, z: -0.8, ry: Math.PI / 2, y: 1.55, w: 0.8, h: 1.0, seed: 41, title: '실험 04 · 작은 모임' },
      { x: L + wall, z: 1.0, ry: Math.PI / 2, y: 1.55, w: 0.8, h: 0.6, seed: 53, title: '실험 05 · 밤의 책상' },
      { x: R - wall, z: -0.8, ry: -Math.PI / 2, y: 1.55, w: 0.8, h: 1.0, seed: 67, title: '실험 06 · 문과 문 사이' },
      { x: R - wall, z: 1.0, ry: -Math.PI / 2, y: 1.55, w: 0.8, h: 0.6, seed: 79, title: '실험 07 · 빗소리' },
      { x: 1.3, z: F - wall, ry: Math.PI, y: 1.55, w: 1.1, h: 0.8, seed: 83, title: '실험 08 · 다음 전시' },
    ],
    pedestals: [
      { x: -1.6, z: -0.75, kind: 'knot' },
      { x: 1.6, z: -0.75, kind: 'stack' },
      { x: 2.4, z: 1.5, kind: 'ring' },
      { x: -2.5, z: 1.45, kind: 'ring' },
    ],
    rug: { x: 0, z: 0.55, w: 2.4, d: 1.5 },
    floorLamps: [{ x: -3.15, z: -1.9, ry: 0 }, { x: 3.15, z: -1.9, ry: 0 }],
    floorPlants: [{ x: -3.05, z: 2.1, scale: .7 }, { x: 3.1, z: 2.05, scale: .65 }],
    pendants: [{ x: -1.6, z: -0.75, drop: .9 }, { x: 1.6, z: -0.75, drop: .9 }, { x: 0, z: 0.6, drop: .8 }, { x: -2.5, z: 1.45, drop: .85 }],
    seats: [
      { id: 'bench-1', x: -0.37, z: 0.55, ry: Math.PI, y: .49, approach: 1 },
      { id: 'bench-2', x: 0.37, z: 0.55, ry: Math.PI, y: .49, approach: 1 },
    ],
    spawn, spawns: [spawn, { x: -2.2, z: 1.2, ry: Math.PI }],
    portals: [{ to: 'shop', x: -2.2, z: F - 0.08, ry: Math.PI, w: .86, d: .16, label: '로비' }],
  };
}
function makeCircle(): SpaceLayout {
  const r = new Rng(2018);
  const chairs = Array.from({ length: 5 }, (_, i) => {
    const angle = i * Math.PI * 2 / 5;
    const x = Math.sin(angle) * 1.08, z = Math.cos(angle) * 1.08;
    return { x, z, ry: Math.atan2(-x, -z) + r.range(-0.025, 0.025) };
  });
  // 뒷벽에서 떨어뜨려 카메라가 아바타 뒤에 서게 한다(의자와도 0.7m 이상)
  const spawn = { x: -1.45, z: 0.95, ry: Math.PI };
  return { ...emptyBase('circle', '작은 모임방', roomOf(4.2, 4.2, 2.7)),
    openings: [],
    shelves: [{ x: 1.88, z: -0.95, ry: -Math.PI / 2, w: 1.2, wing: 'C' }],
    islands: [], chairs,
    roundTable: { x: 0, z: 0, r: 0.65, h: 0.73 },
    rug: { x: 0, z: 0, w: 2.65, d: 2.65, round: true },
    seats: chairs.map((c, i) => ({ ...c, id: `circle-${i+1}`, y: 0.475, approach: -1,
      from: { x: c.x * 1.35, z: c.z * 1.35 } })),
    floorLamps: [], floorPlants: [{x: -1.7, z: -0.7, scale: 0.8}],
    pendants: [{ x: 0, z: 0, drop: 0.65 }],
    spawn, spawns: [spawn, { x: 1.45, z: 0.95, ry: Math.PI }],
    portals: [{ to: 'shop', x: -1.25, z: -2.02, ry: 0, w: 0.86, d: 0.16, label: '로비' }],
  };
}
/** 1인 작업실. 방마다 책상 위치·소품이 조금씩 다르다(n = 1..4). */
function makeWork(id: WorkId, n: number): SpaceLayout {
  const r = new Rng(4100 + n * 37);
  const deskX = 0.3 + r.range(-0.05, 0.08);
  const spawn = { x: -0.55, z: 0.3, ry: Math.PI };
  return { ...emptyBase(id, WORK_LABELS[id], roomOf(2.8, 3.2, 2.6)),
    openings: [],
    shelves: [{ x: 1.18, z: 0.45 + r.range(-0.1, 0.1), ry: -Math.PI / 2, w: 1.0, wing: 'C' }],
    islands: [], chairs: [],
    workDesk: { x: deskX, z: -1.22, ry: 0, w: 1.25, d: 0.62, h: 0.73 },
    rug: { x: deskX, z: -0.45, w: 1.5, d: 1.25 },
    seats: [{ id: 'desk-1', x: deskX - 0.08, z: -0.62, ry: Math.PI, y: 0.475, approach: -1 }],
    floorLamps: n % 2 ? [{ x: -1.08, z: 1.2, ry: 0 }] : [],
    floorPlants: [n % 2 ? { x: 1.05, z: 1.3, scale: 0.7 } : { x: -1.05, z: 1.25, scale: 0.75 }],
    pendants: [{ x: deskX - 0.1, z: -0.4, drop: 0.5 }],
    spawn, spawns: [spawn],
    portals: [{ to: 'shop', x: -0.85, z: -1.52, ry: 0, w: 0.8, d: 0.16, label: '로비' }],
  };
}
export const SPACE_LAYOUTS: Record<SpaceId, SpaceLayout> = {
  shop: makeShop(), bookshop: makeBookshop(), library: makeLibrary(), circle: makeCircle(), gallery: makeGallery(),
  work1: makeWork('work1', 1), work2: makeWork('work2', 2), work3: makeWork('work3', 3), work4: makeWork('work4', 4),
};
export const SPACE_ORDER: SpaceId[] = ['shop', 'bookshop', 'library', 'circle', 'gallery', ...WORK_IDS];

// ---------- 활성 레이아웃(빌드·내비·클릭이 읽음) ----------
let activeId: SpaceId = 'shop';

/** 활성 공간 id */
export function currentSpaceId(): SpaceId {
  return activeId;
}

export function currentSpace(): SpaceLayout {
  return SPACE_LAYOUTS[activeId];
}

/** 공간별 최대 인원. 차면 들어올 수 없다. */
export const SPACE_CAPACITY: Record<SpaceId, number> = { shop: 12, bookshop: 8, library: 6, circle: 6, gallery: 8, work1: 1, work2: 1, work3: 1, work4: 1 };

export function spaceCapacity(id: SpaceId = activeId): number {
  return SPACE_CAPACITY[id];
}

export function spaceLabel(id: SpaceId = activeId): string {
  return SPACE_LAYOUTS[id].label;
}

/** 활성 레이아웃 필드를 모듈 export 상수의 내용에 반영 */
export function applyLayout(id: SpaceId): SpaceLayout {
  activeId = id;
  const L = SPACE_LAYOUTS[id];
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
  Object.assign(SPAWN, L.spawn);

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
  assignOrClear(WORK_DESK, L.workDesk);
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
  // 이전 공간에만 있던 옵션(round 등)이 남지 않게 지움
  for (const k of Object.keys(target) as string[]) {
    if (!(k in src)) delete (target as Record<string, unknown>)[k];
  }
  Object.assign(target, src);
}

/** 활성 레이아웃에 해당 가구가 있는지(비어 표시면 false). */
export function isPresent(obj: object | null | undefined): boolean {
  if (!obj) return false;
  const o = obj as { _empty?: boolean; w?: number; rows?: number };
  if (o._empty) return false;
  if (typeof o.w === 'number' && o.w < 0.05) return false;
  if (typeof o.rows === 'number' && o.rows < 1) return false;
  return true;
}

// 허브로 초기화한 mutable export (기존 import 호환)
const HUB = SPACE_LAYOUTS.shop;
export const ROOM: RoomBounds = { ...HUB.room };
export const BACK_OPENINGS: Opening[] = [...HUB.openings];
export const SHELVES = [...HUB.shelves];
export const ISLANDS = [...HUB.islands];
export const PARTITIONS: PartitionWall[] = [...HUB.partitions];
export const ISLAND = ISLANDS[0];
export const READING_TABLE: Placement & { w: number; d: number; h: number } = { ...(HUB.readingTable!) };
export const ROUND_TABLE = { _empty: true } as unknown as NonNullable<SpaceLayout['roundTable']>;
export const ARMCHAIRS: Placement[] = [];
export const SIDE_TABLE = { _empty: true } as unknown as NonNullable<SpaceLayout['sideTable']>;
export const CHAIRS: Placement[] = [...HUB.chairs];
export const STORE_TABLE: Placement & { w: number; d: number; h: number } = { x: 0, z: 0, ry: 0, w: 0, d: 0, h: 0, _empty: true } as never;
export const STORE_CHAIRS: Placement[] = [];
export const SOFA: Placement & { w: number; d: number } = { ...(HUB.sofa!) };
export const COFFEE_TABLE: Placement & { w: number; d: number; h: number } = { ...(HUB.coffeeTable!) };
export const RUG = { ...HUB.rug! };
export const BENCH: Placement & { w: number; d: number; h: number } = { x: 0, z: 0, ry: 0, w: 0, d: 0, h: 0, _empty: true } as never;
export const BAR_TABLE: Placement & { w: number; d: number; h: number } = { ...(HUB.barTable!) };
export const COUNTER: Placement & { w: number; d: number; h: number } = { ...(HUB.counter!) };
export const MASSAGE_CHAIRS: Placement[] = [];
export const COFFEE_BAR = { _empty: true } as unknown as NonNullable<SpaceLayout['coffeeBar']>;
export const CAFE_TABLE = { _empty: true } as unknown as NonNullable<SpaceLayout['cafeTable']>;
export const WORK_DESK = { _empty: true } as unknown as NonNullable<SpaceLayout['workDesk']>;
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
  // 全 좌석: 의자 방석 높이의 개별 클릭 상자. 큰 가구가 뒷좌석 클릭을 가리지 않는다.
  for (const seat of SEATS) rect(seat.x, seat.z, 0.44, 0.44, seat.ry, seat.y + 0.04, [seat.id]);
  if (isPresent(SOFA)) {
    // 소파 등받이는 지나갈 수 없다(앉는 자리는 좌석 상자가 따로 있다)
    const off = SOFA.d / 2 - 0.1;
    rect(SOFA.x - Math.sin(SOFA.ry) * off, SOFA.z - Math.cos(SOFA.ry) * off, SOFA.w, 0.2, SOFA.ry, 0.8);
  }
  if (isPresent(COUNTER)) rect(COUNTER.x, COUNTER.z, COUNTER.w, COUNTER.d, COUNTER.ry, COUNTER.h);
  if (isPresent(COFFEE_BAR)) rect(COFFEE_BAR.x, COFFEE_BAR.z, COFFEE_BAR.w, COFFEE_BAR.d, COFFEE_BAR.ry, COFFEE_BAR.h);
  if (isPresent(CAFE_TABLE)) rect(CAFE_TABLE.x, CAFE_TABLE.z, CAFE_TABLE.r * 2, CAFE_TABLE.r * 2, 0, CAFE_TABLE.h);
  if (isPresent(WORK_DESK)) rect(WORK_DESK.x, WORK_DESK.z, WORK_DESK.w, WORK_DESK.d, WORK_DESK.ry, WORK_DESK.h);
  // 안마 의자: 앉는 자리(좌석 상자) 양옆의 몸통과 등받이는 지나갈 수 없다
  for (const m of MASSAGE_CHAIRS) {
    rect(m.x - Math.sin(m.ry) * 0.42, m.z - Math.cos(m.ry) * 0.42, 0.84, 0.36, m.ry, 1.25);
  }
  if (isPresent(BENCH)) {
    const ids = SEATS.filter((s) => s.id.startsWith('bench-')).map((s) => s.id);
    void ids;
  }
  if (isPresent(BAR_TABLE)) {
    rect(BAR_TABLE.x, BAR_TABLE.z, BAR_TABLE.w, BAR_TABLE.d, 0, BAR_TABLE.h);
    // 바 스툴은 따로(앉기 히트)
    for (const s of SEATS.filter((seat) => seat.id.startsWith('bar-') || seat.id.startsWith('counter-'))) {
      rect(s.x, s.z, 0.4, 0.4, 0, 0.95, [s.id]);
    }
  }
  if (isPresent(SIDE_TABLE)) rect(SIDE_TABLE.x,SIDE_TABLE.z,SIDE_TABLE.r*2,SIDE_TABLE.r*2,0,SIDE_TABLE.h);
  if (isPresent(COFFEE_TABLE)) rect(COFFEE_TABLE.x, COFFEE_TABLE.z, COFFEE_TABLE.w, COFFEE_TABLE.d, COFFEE_TABLE.ry, COFFEE_TABLE.h);
  for (const l of FLOOR_LAMPS) rect(l.x, l.z, 0.34, 0.34, 0, 1.5);
  for (const p of PEDESTALS) rect(p.x, p.z, 0.5, 0.5, 0, 1.35);
  if (isPresent(BENCH)) rect(BENCH.x, BENCH.z, BENCH.w, BENCH.d * 0.3, BENCH.ry, BENCH.h);
  for (const p of FLOOR_PLANTS) rect(p.x, p.z, 0.45 * p.scale, 0.45 * p.scale, 0, 1.0 * p.scale);
  // 포털은 막지 않음(통과·클릭 트리거). 내비에서는 열어 둔다.
  return list;
}
