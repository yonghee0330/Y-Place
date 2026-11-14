import { Rng } from '../core/rng';
// Y-Place: 라운지(쉬어 가는 홀)·작은 모임방·1인 작업실 4개. 가구·이동·클릭이 공유하는 공간 데이터.
// x: 왼쪽(-)→오른쪽(+), z: 뒤 창벽(-)→앞 입구(+). 단위 m, 바닥 y=0.
// 빌드·전환 시 applyLayout()으로 활성 공간 상수를 맞춘다.

export type WorkId = 'work1' | 'work2' | 'work3' | 'work4';
/** 'shop'은 라운지다(방문자 저장값·채널 이름을 지키려고 옛 id를 그대로 쓴다). */
export type SpaceId = 'shop' | 'circle' | WorkId;
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
  shelves: (Placement & { w: number; wing: 'A' | 'B' | 'C' | 'mid'; rail?: boolean })[];
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
    massageChairs: [], coffeeBar: null, cafeTable: null, workDesk: null,
  };
}

function makeShop(): SpaceLayout {
  // 라운지(쉬어 가는 홀). 뒷벽에서 1.2m 이상 떨어져야 따라가기 카메라가 아바타 뒤에 설 자리가 생긴다
  const spawn = { x: 0.1, z: 1.05, ry: Math.PI };
  const massageChairs = [{ x: -1.3, z: -1.42, ry: 0.12 }, { x: -0.05, z: -1.42, ry: -0.12 }];
  const sofa = { x: 0.95, z: 0.3, ry: Math.PI, w: 1.6, d: 0.8 };
  // 오른쪽 벽에 '개인 작업실' 문 하나. 누르면 작업실 1~4 중에서 고른다
  const workDoor: PortalDef = { to: 'work1', x: 2.67, z: 0.35, ry: -Math.PI / 2, w: 0.86, d: 0.16, label: '개인 작업실', choose: [...WORK_IDS] };
  return { ...emptyBase('shop', '라운지', roomOf(5.5, 4.5, 2.8)),
    openings: [{ cx: -.85, w: 2.75, y0: .65, y1: 2.45, kind: 'window' }],
    shelves: [{ x: -2.54, z: -.95, ry: Math.PI / 2, w: 1.65, wing: 'A' }],
    islands: [], chairs: [], massageChairs, sofa,
    coffeeTable: { x: 0.95, z: -0.82, ry: 0, w: 0.8, d: 0.4, h: 0.4 },
    coffeeBar: { x: -2.47, z: 0.95, ry: Math.PI / 2, w: 1.5, d: 0.5, h: 0.9 },
    cafeTable: { x: -1.2, z: 0.72, r: 0.3, h: 0.68 },
    sideTable: { x: -.68, z: -1.75, ry: 0, r: .2, h: .5 },
    bench: { x: -1.2, z: 1.85, ry: Math.PI, w: 1.3, d: .4, h: .43 },
    rug: { x: -.68, z: -1.3, w: 2.5, d: 1.5 },
    floorLamps: [{ x: -1.95, z: -1.9, ry: 0 }],
    floorPlants: [{ x: .68, z: -2, scale: .75 }, { x: 2.3, z: 1.98, scale: .7 }, { x: 2.32, z: -1.0, scale: .85 }],
    pendants: [{ x: .95, z: -.2, drop: .6 }, { x: -1.55, z: 1.1, drop: .6 }],
    seats: [
      ...massageChairs.map((c, i) => ({ ...c, id: `massage-${i + 1}`, y: 0.47, approach: 1 as const, from: { x: c.x, z: -0.52 } })),
      // 소파는 창 쪽(-z)을 본다
      ...[0.42, 0, -0.42].map((dx, i) => ({ id: `sofa-${i + 1}`, x: sofa.x + dx, z: sofa.z - 0.09, ry: Math.PI, y: 0.49, approach: 1 as const })),
      { id: 'bench-1', x: -1.52, z: 1.85, ry: Math.PI, y: .49, approach: 1 },
      { id: 'bench-2', x: -.88, z: 1.85, ry: Math.PI, y: .49, approach: 1 },
      { id: 'cafe-1', x: -1.2, z: 0.14, ry: 0, y: .475, approach: -1 },
    ],
    spawn, spawns: [spawn, { x: 1.45, z: 1.05, ry: Math.PI }, { x: -.45, z: .95, ry: Math.PI }],
    portals: [{ to: 'circle', x: 1.65, z: -2.17, ry: 0, w: .86, d: .16, label: '작은 모임방' }, workDoor],
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
    portals: [{ to: 'shop', x: -1.25, z: -2.02, ry: 0, w: 0.86, d: 0.16, label: '라운지' }],
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
    portals: [{ to: 'shop', x: -0.85, z: -1.52, ry: 0, w: 0.8, d: 0.16, label: '라운지' }],
  };
}
export const SPACE_LAYOUTS: Record<SpaceId, SpaceLayout> = {
  shop: makeShop(), circle: makeCircle(),
  work1: makeWork('work1', 1), work2: makeWork('work2', 2), work3: makeWork('work3', 3), work4: makeWork('work4', 4),
};
export const SPACE_ORDER: SpaceId[] = ['shop', 'circle', ...WORK_IDS];

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
export const SPACE_CAPACITY: Record<SpaceId, number> = { shop: 8, circle: 6, work1: 1, work2: 1, work3: 1, work4: 1 };

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
  for (const p of FLOOR_PLANTS) rect(p.x, p.z, 0.45 * p.scale, 0.45 * p.scale, 0, 1.0 * p.scale);
  // 포털은 막지 않음(통과·클릭 트리거). 내비에서는 열어 둔다.
  return list;
}
