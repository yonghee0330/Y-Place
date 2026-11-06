import { Rng } from '../core/rng';
// Y-Place과 작은 모임방. 가구·이동·클릭이 공유하는 공간 데이터.
// x: 왼쪽(-)→오른쪽(+), z: 뒤 창벽(-)→앞 입구(+). 단위 m, 바닥 y=0.
// 빌드·전환 시 applyLayout()으로 활성 공간 상수를 맞춘다.

export type SpaceId = 'shop' | 'circle';

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
  };
}

function makeShop(): SpaceLayout {
  const spawn = { x: 0.1, z: 1.6, ry: Math.PI };
  const armchairs = [{ x: -1.25, z: -1.48, ry: .18 }, { x: .12, z: -1.48, ry: -.25 }];
  return { ...emptyBase('shop', 'Y-Place', roomOf(5.5, 4.5, 2.8)),
    openings: [{ cx: -.85, w: 2.75, y0: .65, y1: 2.45, kind: 'window' }],
    shelves: [
      {x:-2.54,z:-.95,ry:Math.PI/2,w:1.65,wing:'A'},
      {x:-2.54,z:.75,ry:Math.PI/2,w:1.65,wing:'B'},
      {x:2.53,z:-.25,ry:-Math.PI/2,w:2.35,wing:'C',rail:true},
    ],
    islands: [{x:-.2,z:.08,ry:0,w:1.65,d:.8,h:.62,kind:'flat'}], chairs: [], armchairs,
    sideTable: {x:-.58,z:-1.65,ry:0,r:.23,h:.52},
    counter: {x:1.65,z:1.73,ry:Math.PI,w:1.45,d:.52,h:.94},
    bench: {x:-1.35,z:1.78,ry:Math.PI,w:1.4,d:.4,h:.43},
    rug: {x:-.65,z:-1.25,w:2.05,d:1.1},
    floorLamps: [{x:-1.95,z:-1.85,ry:0}],
    floorPlants: [{x:.65,z:-2,scale:.75},{x:2.32,z:1.16,scale:.7}],
    pendants: [{x:-.25,z:.05,drop:.65},{x:1.5,z:1.4,drop:.55}],
    seats: [
      ...armchairs.map((c,i)=>({...c,id:`read-${i+1}`,y:.43,approach:1 as const,from:{x:c.x,z:-.85}})),
      {id:'counter-1',x:1.68,z:1.05,ry:0,y:.72,approach:-1},
      {id:'bench-1',x:-1.7,z:1.78,ry:Math.PI,y:.49,approach:1},
      {id:'bench-2',x:-1,z:1.78,ry:Math.PI,y:.49,approach:1},
    ],
    spawn, spawns: [spawn,{x:.85,z:.65,ry:Math.PI},{x:-1.4,z:.65,ry:0}],
    portals: [{ to: 'circle', x: 1.65, z: -2.17, ry: 0, w: .86, d: .16, label: '작은 모임방' }],
  };
}
function makeCircle(): SpaceLayout {
  const r = new Rng(2018);
  const chairs = Array.from({ length: 5 }, (_, i) => {
    const angle = i * Math.PI * 2 / 5;
    const x = Math.sin(angle) * 1.08, z = Math.cos(angle) * 1.08;
    return { x, z, ry: Math.atan2(-x, -z) + r.range(-0.025, 0.025) };
  });
  const spawn = { x: -1.35, z: 1.45, ry: Math.PI };
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
    spawn, spawns: [spawn, { x: 1.5, z: 1.5, ry: Math.PI }],
    portals: [{ to: 'shop', x: -1.25, z: -2.02, ry: 0, w: 0.86, d: 0.16, label: 'Y-Place' }],
  };
}
export const SPACE_LAYOUTS: Record<SpaceId, SpaceLayout> = { shop: makeShop(), circle: makeCircle() };
export const SPACE_ORDER: SpaceId[] = ['shop', 'circle'];

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
export const SPACE_CAPACITY: Record<SpaceId, number> = { shop: 8, circle: 6 };

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
    const sofaIds = SEATS.filter((s) => s.id.startsWith('sofa-')).map((s) => s.id);
    void sofaIds;
  }
  if (isPresent(COUNTER)) rect(COUNTER.x, COUNTER.z, COUNTER.w, COUNTER.d, COUNTER.ry, COUNTER.h);
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
