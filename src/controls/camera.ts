// 카메라: 캡처용 고정 시점(?cam=overview|avatar|window)과 아바타를 따라가는 3인칭 오빗.
// 시선·줌은 현재 방(ROOM) 안으로 묶고, 서가·가구에 가리면 거리를 줄여 등 뒤 장면이 시야를 막지 않게 한다.
import * as THREE from 'three';
import type { CamPreset } from '../core/params';
import { ROOM, colliders } from '../scene/layout';

export const CAM_PRESETS: Record<CamPreset, { pos: [number, number, number]; target: [number, number, number]; fov: number }> = {
  // 입구 쪽에서 허브 중앙을 내려다봄
  overview: { pos: [2.8, 2.4, 3.2], target: [0, 0.9, 0.2], fov: 58 },
  window: { pos: [0.4, 1.5, -0.6], target: [0.15, 1.2, -3.2], fov: 52 },
  avatar: { pos: [1.2, 2.0, 3.4], target: [0.2, 0.85, 2.2], fov: 50 },
};
/** 세로 화면(모바일)용 시점 */
const PORTRAIT: Partial<typeof CAM_PRESETS> = {
  overview: { pos: [2.2, 2.2, 2.8], target: [0, 0.95, 0.1], fov: 66 },
};

export function createCamera(aspect: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(CAM_PRESETS.overview.fov, aspect, 0.05, 80);
  applyPreset(cam, 'overview');
  return cam;
}

export function applyPreset(cam: THREE.PerspectiveCamera, preset: CamPreset): THREE.Vector3 {
  const portrait = cam.aspect < 0.8;
  const p = { ...((portrait && PORTRAIT[preset]) || CAM_PRESETS[preset]) };
  // 구도 조정용: ?campos=x,y,z&camtgt=x,y,z 로 덮어쓴다.
  const q = new URLSearchParams(location.search);
  const vec = (k: string) => q.get(k)?.split(',').map(Number) as [number, number, number] | undefined;
  const cp = vec('campos'), ct = vec('camtgt');
  if (cp?.length === 3 && cp.every(Number.isFinite)) p.pos = cp;
  if (ct?.length === 3 && ct.every(Number.isFinite)) p.target = ct;
  cam.position.set(...p.pos);
  cam.fov = p.fov;
  const target = new THREE.Vector3(...p.target);
  cam.lookAt(target);
  // 세로 화면 전용 시점이 없으면 시야각을 넓혀 서점이 잘리지 않게 한다.
  if (portrait && !PORTRAIT[preset]) cam.fov = p.fov * 1.3;
  cam.updateProjectionMatrix();
  return target;
}


const DEG = Math.PI / 180;
/** 음수면 아바타보다 아래에서 위를 올려다봄(선반·천장 탐색) */
const MIN_PITCH = -12 * DEG, MAX_PITCH = 68 * DEG;
const DEFAULT_PITCH = 22 * DEG;
/** 벽·가구 때문에 뒤로 못 물러날 때 이 각도까지 위로 올라가 내려다본다 */
const LIFT_PITCH = 48 * DEG;
export const MIN_DIST = 1.2;

/** 현재 방 크기에 맞는 최대 오빗 거리 — 방 대각선의 ~48%. */
export function maxOrbitDist(): number {
  const span = Math.hypot(ROOM.w, ROOM.d);
  return THREE.MathUtils.clamp(span * 0.48, 3.0, 8.0);
}

/** 방 안에서 아바타·공간을 잘 담는 기본 거리. */
export function idealOrbitDist(): number {
  const span = Math.hypot(ROOM.w, ROOM.d);
  return THREE.MathUtils.clamp(span * 0.32, 2.2, 4.2);
}

/**
 * 3인칭 오빗 카메라. 아바타를 부드럽게 따라가고(댐핑), 드래그로 돌리고, 휠·핀치로 줌.
 * 거리는 방 크기·가구(서가 등)에 묶고, 벽·천장 밖으로 거의 나가지 않는다.
 */
export class FollowCamera {
  yaw: number;
  pitch = DEFAULT_PITCH;
  distance = 3.2;
  readonly target = new THREE.Vector3();
  private goal = new THREE.Vector3();
  private shown = { yaw: 0, pitch: DEFAULT_PITCH, dist: 3.2 };
  reducedMotion = false;

  constructor(private cam: THREE.PerspectiveCamera, yaw: number) {
    this.yaw = yaw;
    this.shown.yaw = yaw;
  }

  /** 바라볼 높이(아바타 발 기준). 세로 화면에서는 더 위를 봐서 바닥이 화면을 덮지 않게 한다. */
  lookHeight = 0.86;

  /** 따라갈 점 */
  follow(p: THREE.Vector3, snap = false): void {
    // 아바타를 정확히 중심에 두어야 어느 방향으로 돌려도 아바타를 축으로 공간이 돈다
    this.goal.set(p.x, p.y + this.lookHeight, p.z);
    if (snap) {
      this.target.copy(this.goal);
      this.colDist = Infinity;
      this.lift = 0;
    }
  }

  /** 드래그 회전. 손을 떼면 짧게 관성으로 미끄러지며 멈춘다. */
  rotate(dx: number, dy: number): void {
    const now = performance.now();
    const gap = Math.max(8, now - this.lastDrag);
    this.lastDrag = now;
    const yawStep = -dx * 0.0062;
    const pitchStep = dy * 0.0065;
    this.yaw += yawStep;
    this.pitch = THREE.MathUtils.clamp(this.pitch + pitchStep, MIN_PITCH, MAX_PITCH);
    // 관성 속도(rad/s). 이벤트 간격이 길면 멈췄다가 놓은 것으로 본다.
    this.yawVel = gap < 80 ? THREE.MathUtils.clamp(yawStep / (gap / 1000), -6, 6) : 0;
    this.pitchVel = gap < 80 ? THREE.MathUtils.clamp(pitchStep / (gap / 1000), -4, 4) : 0;
  }

  /** 키보드(Q·E) 연속 회전. dir: -1 왼쪽, 1 오른쪽 */
  spin(dir: number, dt: number): void {
    if (!dir) return;
    this.yaw += dir * 1.9 * dt;
    this.yawVel = 0;
  }

  /** 키보드(R·F) 상하 기울기. dir: +1 위에서 내려다봄, -1 수평·올려다봄 */
  tilt(dir: number, dt: number): void {
    if (!dir) return;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dir * 1.35 * dt, MIN_PITCH, MAX_PITCH);
    this.pitchVel = 0;
  }

  zoom(factor: number): void {
    this.distance = THREE.MathUtils.clamp(this.distance * factor, MIN_DIST, maxOrbitDist());
  }

  /** 공간 전환 시: 거리·각도를 그 방에 맞게 다시 잡는다. */
  fitToSpace(preferIdeal = true): void {
    const max = maxOrbitDist();
    if (preferIdeal || this.distance > max) this.distance = idealOrbitDist();
    this.distance = THREE.MathUtils.clamp(this.distance, MIN_DIST, max);
    if (preferIdeal) this.pitch = DEFAULT_PITCH;
    this.pitch = THREE.MathUtils.clamp(this.pitch, MIN_PITCH, MAX_PITCH);
    this.shown.dist = this.distance;
    this.shown.pitch = this.pitch;
  }

  /** 읽기 모드: 아바타 어깨 너머에서 책과 서점이 함께 보이는 구도. 끝나면 원래 오빗으로 돌아간다. */
  setFocus(pose: { pos: THREE.Vector3; look: THREE.Vector3 } | null): void {
    this.focusPose = pose;
  }

  get focused(): boolean {
    return this.focusPose !== null;
  }

  private focusPose: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  private focusBlend = 0;
  private lastFocus: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  /** 벽·가구로 줄어든 실제 거리(부드럽게 변함) */
  private colDist = Infinity;
  /** 뒤가 막혔을 때 위로 올라가는 정도(0..1, 부드럽게 변함) */
  private lift = 0;
  private yawVel = 0;
  private pitchVel = 0;
  private lastDrag = 0;
  private readonly lookAtScratch = new THREE.Vector3();

  update(dt: number): void {
    const k = (rate: number) => (this.reducedMotion ? 1 : 1 - Math.exp(-rate * dt));
    const maxD = maxOrbitDist();
    // 방이 바뀌었거나 줌이 한도를 넘으면 끌어당긴다
    if (this.distance > maxD) this.distance = maxD;
    // 손을 뗀 뒤 관성 회전(드래그 중에는 rotate가 매번 덮어씀)
    if (performance.now() - this.lastDrag > 60 && !this.reducedMotion) {
      if (Math.abs(this.yawVel) > 0.01) {
        this.yaw += this.yawVel * dt;
        this.yawVel *= Math.exp(-5 * dt);
      } else this.yawVel = 0;
      if (Math.abs(this.pitchVel) > 0.01) {
        this.pitch = THREE.MathUtils.clamp(this.pitch + this.pitchVel * dt, MIN_PITCH, MAX_PITCH);
        this.pitchVel *= Math.exp(-6 * dt);
      } else this.pitchVel = 0;
    } else if (performance.now() - this.lastDrag > 60) {
      this.yawVel = 0;
      this.pitchVel = 0;
    }
    this.target.lerp(this.goal, k(7));
    const dy = Math.atan2(Math.sin(this.yaw - this.shown.yaw), Math.cos(this.yaw - this.shown.yaw));
    this.shown.yaw += dy * k(10);
    this.shown.pitch += (this.pitch - this.shown.pitch) * k(10);
    this.shown.dist += (this.distance - this.shown.dist) * k(6);

    // 벽·천장 + 가구까지 남은 거리
    const slack = 0.12;
    let wallFree = Infinity;
    const room = (pitch: number, out: THREE.Vector3) => {
      out.set(Math.sin(this.shown.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.shown.yaw) * Math.cos(pitch));
      wallFree = roomExit(this.target, out, slack) - 0.18;
      return Math.min(wallFree, furnitureExit(this.target, out, this.shown.dist) - 0.32);
    };
    const dir = new THREE.Vector3();
    const want = this.shown.dist;
    // 뒤가 막혀 있으면 방향을 휙 바꾸지 않고, 그 자리에서 위로 올라가 내려다본다
    const free0 = room(this.shown.pitch, dir);
    const liftGoal = this.focusPose ? 0 : THREE.MathUtils.clamp((Math.min(want, 1.55) - free0) / 1.25, 0, 1);
    this.lift += (liftGoal - this.lift) * k(liftGoal > this.lift ? 5 : 2.2);
    const pitch = THREE.MathUtils.lerp(this.shown.pitch, Math.max(this.shown.pitch, LIFT_PITCH), this.lift);
    const free = room(pitch, dir);
    const hitD = Math.min(want, Math.max(0.7, free));
    // 막힐 땐 빠르게 당기고, 트일 땐 천천히 물러난다(카메라가 툭툭 튀지 않게)
    if (!Number.isFinite(this.colDist)) this.colDist = hitD;
    this.colDist += (hitD - this.colDist) * k(hitD < this.colDist ? 11 : 3.2);
    // 벽 밖으로는 절대 나가지 않게 즉시 막고, 가구 가림은 위 감쇠로만 따라간다(가장자리를 지날 때 튀지 않게)
    const d = Math.min(this.colDist, Math.max(0.7, wallFree));
    const orbitPos = this.target.clone().addScaledVector(dir, d);
    // 방 안에 남도록 한 번 더 클램프
    clampInsideRoom(orbitPos, 0.18);

    const zoomT = THREE.MathUtils.clamp((this.shown.dist - MIN_DIST) / Math.max(0.01, maxD - MIN_DIST), 0, 1);
    const nearFov = this.cam.aspect < 0.8 ? 82 : 62;
    // 줌 아웃해도 과하게 넓어지지 않게(공간 왜곡·허공 노출 완화)
    this.cam.fov = nearFov + zoomT * 8;
    this.cam.updateProjectionMatrix();
    // 피치에 따라 시선을 위·아래로, 수평에 가까우면 아바타 앞으로 밀어 머리가 덜 가리게
    const lookBias = THREE.MathUtils.mapLinear(this.shown.pitch, MIN_PITCH, MAX_PITCH, 0.38, -0.16);
    const lookFwd = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(this.shown.pitch, MIN_PITCH, 28 * DEG, 0.7, 0),
      0,
      0.7,
    );
    this.lookAtScratch.set(
      this.target.x - dir.x * lookFwd,
      this.target.y + lookBias,
      this.target.z - dir.z * lookFwd,
    );
    // 읽기 모드 구도와 섞기(약 0.8초)
    if (this.focusPose) this.lastFocus = this.focusPose;
    this.focusBlend += ((this.focusPose ? 1 : 0) - this.focusBlend) * k(5.5);
    if (this.lastFocus && this.focusBlend > 0.001) {
      const e = this.focusBlend * this.focusBlend * (3 - 2 * this.focusBlend);
      this.cam.position.lerpVectors(orbitPos, this.lastFocus.pos, e);
      this.cam.lookAt(new THREE.Vector3().lerpVectors(this.lookAtScratch, this.lastFocus.look, e));
    } else {
      this.cam.position.copy(orbitPos);
      this.cam.lookAt(this.lookAtScratch);
    }
  }

  /** 카메라가 바라보는 수평 방향(키보드 이동 기준) */
  get viewYaw(): number {
    return this.shown.yaw;
  }
}

/** 점 p에서 dir 방향으로 카메라 경계(방 + slack)에 닿기까지의 거리. */
function roomExit(p: THREE.Vector3, dir: THREE.Vector3, slack = 0): number {
  let t = Infinity;
  const axis = (pos: number, d: number, lo: number, hi: number) => {
    if (d > 1e-6) t = Math.min(t, (hi - pos) / d);
    else if (d < -1e-6) t = Math.min(t, (lo - pos) / d);
  };
  axis(p.x, dir.x, ROOM.x0 - slack, ROOM.x1 + slack);
  axis(p.y, dir.y, 0.12, ROOM.h - 0.12 + slack * 0.5);
  axis(p.z, dir.z, ROOM.z0 - slack, ROOM.z1 + slack);
  return t;
}

/**
 * 아바타→카메라 선이 가구(서가·소파·카운터 등)에 닿는 거리.
 * 좌우로 짧게 여러 번 쏴서 등 뒤 가림을 더 잘 잡는다.
 */
function furnitureExit(p: THREE.Vector3, dir: THREE.Vector3, maxDist: number): number {
  let best = maxDist + 1;
  const pad = 0.1;
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  else right.normalize();
  const origins: [number, number, number][] = [
    [p.x, p.y, p.z],
    [p.x + right.x * 0.2, p.y, p.z + right.z * 0.2],
    [p.x - right.x * 0.2, p.y, p.z - right.z * 0.2],
    [p.x, p.y + 0.25, p.z],
  ];
  for (const c of colliders()) {
    if (c.h < 0.7) continue;
    // 발밑·앉은 자리 박스는 무시
    if (p.x >= c.x0 - pad && p.x <= c.x1 + pad && p.z >= c.z0 - pad && p.z <= c.z1 + pad) continue;
    for (const [ox, oy, oz] of origins) {
      const t = rayAabb(
        ox, oy, oz,
        dir.x, dir.y, dir.z,
        c.x0 - pad, c.x1 + pad,
        0, c.h + 0.08,
        c.z0 - pad, c.z1 + pad,
      );
      if (t !== null && t > 0.1 && t < best) best = t;
    }
  }
  return best;
}

/** 레이 ↔ AABB. 히트 거리 또는 null. */
function rayAabb(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  x0: number, x1: number, y0: number, y1: number, z0: number, z1: number,
): number | null {
  let tmin = 0;
  let tmax = Infinity;
  const slab = (o: number, d: number, lo: number, hi: number) => {
    if (Math.abs(d) < 1e-8) {
      if (o < lo || o > hi) tmax = -1;
      return;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  };
  slab(ox, dx, x0, x1);
  slab(oy, dy, y0, y1);
  slab(oz, dz, z0, z1);
  if (tmax < tmin || tmax < 0) return null;
  return tmin >= 0 ? tmin : tmax;
}

/** 카메라 위치를 방 안(약간 안쪽)으로 밀어 넣는다. */
function clampInsideRoom(p: THREE.Vector3, pad: number): void {
  p.x = THREE.MathUtils.clamp(p.x, ROOM.x0 + pad, ROOM.x1 - pad);
  p.y = THREE.MathUtils.clamp(p.y, 0.28, ROOM.h - 0.18);
  p.z = THREE.MathUtils.clamp(p.z, ROOM.z0 + pad, ROOM.z1 - pad);
}
