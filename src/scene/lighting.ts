// 조명: 창 방향 키라이트(그림자), 실내 전구, 반구광, 바닥의 창빛 패치, 약한 환경 반사.
// 부천 날씨(비·눈·맑음)에 따라 창빛 색·세기를 살짝 바꾼다. 공간마다 램프 위치를 맞춘다.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { QualityProfile } from '../core/quality';
import type { WeatherKind } from '../weather/bucheon';
import { BACK_OPENINGS, ROOM, SPACE_ORDER, type SpaceId } from './layout';
import type { LampAnchor } from './props/lamps';
import { windowLightTexture } from './textures';

/** 빛이 나아가는 방향(창 밖 위쪽 → 방 안 아래쪽). */
export const KEY_DIR = new THREE.Vector3(0.32, -0.78, 1).normalize();

export interface Lighting {
  group: THREE.Group;
  applyQuality(q: QualityProfile): void;
  setWeather(kind: WeatherKind): void;
  setSpaceMood(space: SpaceId): void;
  setDayPhase(p: DayPhase): void;
  /** 매 프레임: 가까운 램프에만 실제 빛을 주고, 구역 무드를 부드럽게 바꾼다 */
  update(pos: THREE.Vector3, dt: number): void;
}

/** 실제 빛을 내는 램프 수(나머지는 전구 발광만). 빛 개수가 늘면 모든 화소 계산이 무거워진다. */
const LAMP_SLOTS = 5;
const LAMP_NEAR = 4;

const WARM = 0xffb873;

export type DayPhase = 'morning' | 'day' | 'sunset' | 'night';

/** 한국 시간의 시(0~23)를 시간대로 */
export function dayPhaseOf(hour: number): DayPhase {
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'sunset';
  return 'night';
}

/** 시간대별 빛: 창으로 드는 빛의 색·세기, 하늘빛 세기, 실내 조명 보강 */
const DAY_LOOK: Record<DayPhase, { key: number; hemi: number; keyK: number; hemiK: number; fillK: number }> = {
  morning: { key: 0xdce8f6, hemi: 0xeef2f6, keyK: 0.9, hemiK: 0.95, fillK: 0.9 },
  day: { key: 0xffffff, hemi: 0xffefd9, keyK: 1, hemiK: 1, fillK: 1 },
  sunset: { key: 0xffae6b, hemi: 0xffdcb8, keyK: 0.85, hemiK: 0.85, fillK: 1.1 },
  night: { key: 0x6f7fa8, hemi: 0xd9c3a6, keyK: 0.07, hemiK: 0.5, fillK: 1.25 },
};

export function buildLighting(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  lampsBySpace: Partial<Record<SpaceId, LampAnchor[]>>,
  q: QualityProfile,
): Lighting {
  const group = new THREE.Group();
  group.name = 'lighting';

  // 흐린 비 오는 날의 창빛: 차분한 흰빛
  const key = new THREE.DirectionalLight(0xe9edf0, 2.4);
  const target = new THREE.Object3D();
  target.position.set(0, 0, 0);
  key.target = target;
  key.position.copy(KEY_DIR).multiplyScalar(-22);
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 42;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 3;
  group.add(key, target);

  // 공간별 전구(전환 시 위치를 맞춘다)
  const points: THREE.SpotLight[] = [];
  const spot = new THREE.SpotLight(WARM, 9, 0, 1.05, 0.85, 2);
  spot.shadow.bias = -0.0006;
  spot.shadow.normalBias = 0.02;
  spot.shadow.camera.near = 0.2;
  spot.shadow.camera.far = 4;
  group.add(spot, spot.target);

  // 창 없는 방 보조 필(세미나·강연)
  const roomFill = new THREE.SpotLight(0xffe0b8, 0, 14, 1.4, 1, 2);
  roomFill.position.set(0, 2.15, 0.4);
  group.add(roomFill, roomFill.target);

  const hemi = new THREE.HemisphereLight(0xf2e1c4, 0x4f3622, 0.65);
  group.add(hemi);

  // 바닥의 창 모양 밝은 영역: 허브 창만(초기 레이아웃 기준)
  const patchTex = windowLightTexture(3, 2);
  const patchMat = new THREE.MeshBasicMaterial({
    color: 0xdde6ee, alphaMap: patchTex, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true,
  });
  const patches: THREE.Mesh[] = [];
  for (const o of BACK_OPENINGS.filter((o) => o.kind === 'window')) {
    const corners = [
      [o.cx - o.w / 2, o.y0], [o.cx + o.w / 2, o.y0], [o.cx - o.w / 2, o.y1], [o.cx + o.w / 2, o.y1],
    ].map(([x, y]) => {
      const t = y / -KEY_DIR.y;
      return new THREE.Vector3(x + KEY_DIR.x * t, 0.004, ROOM.z0 + KEY_DIR.z * t);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap((c) => [c.x, c.y, c.z]), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    const m = new THREE.Mesh(g, patchMat);
    m.renderOrder = 1;
    m.name = 'window-light';
    patches.push(m);
    group.add(m);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.18;
  pmrem.dispose();

  let lastQ = q;
  let weather: WeatherKind = 'rain';
  let mood: SpaceId = 'shop';
  let dayPhase: DayPhase = 'day';

  /**
   * 캠퍼스 램프는 15개가 넘어 전부 실제 빛으로 켜면 GPU가 버거워진다.
   * 빛 슬롯 LAMP_SLOTS개를 두고, 내 위치에서 가까운 LAMP_NEAR개 램프에만 서서히 켜 준다.
   * 슬롯 수는 고정이라 셰이더를 다시 만들지 않는다.
   */
  let anchors: LampAnchor[] = [];
  let boost = 1.05;
  let boostTarget = 1.05;
  const slots: { light: THREE.SpotLight; anchor: LampAnchor | null; k: number }[] = [];
  for (let i = 0; i < LAMP_SLOTS; i++) {
    const p = new THREE.SpotLight(WARM, 0, 0, 1.25, 0.85, 2);
    points.push(p);
    group.add(p, p.target);
    slots.push({ light: p, anchor: null, k: 0 });
  }
  const placeSlot = (sl: (typeof slots)[number], a: LampAnchor) => {
    sl.anchor = a;
    sl.light.position.copy(a.position);
    sl.light.target.position.set(a.position.x, 0, a.position.z);
    sl.light.target.updateMatrixWorld();
  };
  const nearest = new Set<LampAnchor>();
  const pickNearest = (pos: THREE.Vector3) => {
    nearest.clear();
    const sorted = anchors
      .map((a) => ({ a, d: (a.position.x - pos.x) ** 2 + (a.position.z - pos.z) ** 2 }))
      .sort((x, y) => x.d - y.d);
    for (let i = 0; i < Math.min(LAMP_NEAR, sorted.length); i++) nearest.add(sorted[i]!.a);
  };
  let pickT = 0;
  const updateLamps = (pos: THREE.Vector3, dt: number, instant = false) => {
    pickT -= dt;
    if (pickT <= 0 || instant) {
      pickT = 0.25;
      pickNearest(pos);
    }
    const fade = instant ? 1 : Math.min(1, dt * 2.5);
    // 빠진 램프는 서서히 끄고, 꺼진 슬롯을 새로 가까워진 램프에 준다
    for (const sl of slots) {
      if (sl.anchor && !nearest.has(sl.anchor)) {
        sl.k = Math.max(0, sl.k - fade);
        if (sl.k === 0) sl.anchor = null;
      }
    }
    for (const a of nearest) {
      if (slots.some((sl) => sl.anchor === a)) continue;
      const free = slots.find((sl) => !sl.anchor);
      if (free) { placeSlot(free, a); free.k = instant ? 1 : 0; }
    }
    boost += (boostTarget - boost) * (instant ? 1 : Math.min(1, dt * 2));
    for (const sl of slots) {
      if (sl.anchor && nearest.has(sl.anchor)) sl.k = Math.min(1, sl.k + fade);
      sl.light.intensity = sl.anchor ? (sl.anchor.kind === 'floor' ? 1.4 : 1.6) * boost * sl.k : 0;
    }
  };
  let lastPos = new THREE.Vector3();
  const syncSpaceLamps = (space: SpaceId) => {
    anchors = lampsBySpace[space] ?? [];
    const bookstore = space === 'bookshop';
    const gallery = space === 'gallery';
    boostTarget = bookstore ? 1.25 : gallery ? 1.15 : 1.05;
    const pend = anchors.find((a) => a.kind === 'pendant') ?? anchors[0];
    if (pend) {
      spot.visible = true;
      spot.position.copy(pend.position);
      if (pend.kind === 'pendant') spot.position.x += 0.35;
      spot.target.position.set(pend.position.x, 0, pend.position.z);
      spot.target.updateMatrixWorld();
      spot.intensity = bookstore ? 10.5 : gallery ? 9.5 : 8;
    } else {
      spot.visible = false;
      spot.intensity = 0;
    }
  };

  const tintForWeather = () => {
    if (weather === 'clear') {
      key.color.setHex(0xfff2d8);
      hemi.color.setHex(0xfff6e8);
      hemi.groundColor.setHex(0x5a4030);
      patchMat.color.setHex(0xffe8c4);
    } else if (weather === 'snow') {
      key.color.setHex(0xe8eef5);
      hemi.color.setHex(0xe8eef4);
      hemi.groundColor.setHex(0x4a4550);
      patchMat.color.setHex(0xdde6f0);
    } else {
      key.color.setHex(0xe9edf0);
      hemi.color.setHex(0xf2e1c4);
      hemi.groundColor.setHex(0x4f3622);
      patchMat.color.setHex(0xdde6ee);
    }
  };

  const applyWeatherBoost = () => {
    if (weather === 'clear') {
      key.intensity *= 1.35;
      patchMat.opacity = Math.min(0.4, patchMat.opacity * 1.5);
    } else if (weather === 'snow') {
      key.intensity *= 1.1;
    }
  };

  const applyMood = () => {
    syncSpaceLamps(mood);
    // 한 캠퍼스: 창은 광장 쪽에 두고, 구역 무드만 살짝 바꾼다
    const bookstore = mood === 'bookshop';
    const gallery = mood === 'gallery';
    const deep = mood === 'cowork' || mood === 'tech' || mood === 'challenge';
    roomFill.intensity = bookstore ? 3.2 : gallery ? 3.0 : deep ? 2.6 : 2.2;
    roomFill.color.setHex(bookstore ? 0xffd4a0 : gallery ? 0xffead0 : 0xffe0b8);
    key.intensity = lastQ.shadows ? 1.0 : 0.6;
    hemi.intensity = bookstore || gallery ? 0.95 : 0.85;
    hemi.color.setHex(bookstore ? 0xfff0dc : gallery ? 0xfff5ea : 0xffefd9);
    hemi.groundColor.setHex(0x685445);
    scene.environmentIntensity = 0.25;
    patchMat.opacity = 0.08;
    for (const p of patches) p.visible = true;
    // 실제 시각(한국 시간): 아침은 차갑게, 해질녘은 주황빛, 밤은 창빛이 꺼지고 실내 조명이 주인공
    const d = DAY_LOOK[dayPhase];
    if (dayPhase !== 'day') {
      key.color.setHex(d.key);
      hemi.color.setHex(d.hemi);
      patchMat.color.setHex(d.key);
    }
    key.intensity *= d.keyK;
    hemi.intensity *= d.hemiK;
    scene.environmentIntensity *= d.hemiK;
    patchMat.opacity *= d.keyK;
    roomFill.intensity *= d.fillK;
    if (dayPhase === 'night') {
      roomFill.intensity *= 0.7;
      hemi.intensity *= 0.8;
    }
  };

  /** 품질·날씨·무드·시간대로 빛 세기·색을 계산한다(그림자 맵은 건드리지 않음) */
  const computeLook = (qq: QualityProfile) => {
    lastQ = qq;
    key.intensity = qq.shadows ? 1.25 : 0.35;
    patchMat.opacity = qq.shadows ? 0.1 : 0.32;
    hemi.intensity = qq.shadows ? 0.65 : 0.85;
    tintForWeather();
    applyWeatherBoost();
    applyMood();
  };

  // 구역 무드가 바뀔 때 빛을 한 번에 바꾸지 않고 1초쯤에 걸쳐 옮긴다
  const lookNow = () => ({
    key: key.intensity, keyC: key.color.clone(),
    hemi: hemi.intensity, hemiC: hemi.color.clone(), hemiG: hemi.groundColor.clone(),
    fill: roomFill.intensity, fillC: roomFill.color.clone(),
    patch: patchMat.opacity, patchC: patchMat.color.clone(),
    env: scene.environmentIntensity, spot: spot.intensity,
  });
  type Look = ReturnType<typeof lookNow>;
  const setLook = (l: Look) => {
    key.intensity = l.key; key.color.copy(l.keyC);
    hemi.intensity = l.hemi; hemi.color.copy(l.hemiC); hemi.groundColor.copy(l.hemiG);
    roomFill.intensity = l.fill; roomFill.color.copy(l.fillC);
    patchMat.opacity = l.patch; patchMat.color.copy(l.patchC);
    scene.environmentIntensity = l.env; spot.intensity = l.spot;
  };
  let lookTarget: Look | null = null;
  const lerpLook = (k: number) => {
    const t = lookTarget;
    if (!t) return;
    key.intensity += (t.key - key.intensity) * k; key.color.lerp(t.keyC, k);
    hemi.intensity += (t.hemi - hemi.intensity) * k; hemi.color.lerp(t.hemiC, k); hemi.groundColor.lerp(t.hemiG, k);
    roomFill.intensity += (t.fill - roomFill.intensity) * k; roomFill.color.lerp(t.fillC, k);
    patchMat.opacity += (t.patch - patchMat.opacity) * k; patchMat.color.lerp(t.patchC, k);
    scene.environmentIntensity += (t.env - scene.environmentIntensity) * k;
    spot.intensity += (t.spot - spot.intensity) * k;
    if (Math.abs(t.fill - roomFill.intensity) < 0.005 && Math.abs(t.hemi - hemi.intensity) < 0.002) {
      setLook(t);
      lookTarget = null;
    }
  };
  /** 빛만 부드럽게 다시 맞춘다(그림자 맵을 다시 그리지 않음) */
  const retarget = () => {
    const before = lookNow();
    computeLook(lastQ);
    lookTarget = lookNow();
    setLook(before);
  };

  const applyQuality = (qq: QualityProfile) => {
    renderer.shadowMap.enabled = qq.shadows;
    key.castShadow = qq.shadows;
    if (qq.shadows) key.shadow.mapSize.set(qq.shadowMapSize, qq.shadowMapSize);
    spot.castShadow = qq.shadows && qq.shadowLights >= 2;
    spot.shadow.mapSize.set(1024, 1024);
    computeLook(qq);
    lookTarget = null;
    updateLamps(lastPos, 0, true);
    key.shadow.map?.dispose();
    key.shadow.map = null;
    spot.shadow.map?.dispose();
    spot.shadow.map = null;
    renderer.shadowMap.needsUpdate = true;
  };

  // 허브 램프로 초기화
  for (const id of SPACE_ORDER) {
    if (!lampsBySpace[id]) lampsBySpace[id] = [];
  }
  syncSpaceLamps('shop');
  applyQuality(q);

  const setWeather = (kind: WeatherKind) => {
    weather = kind;
    retarget();
  };

  const setSpaceMood = (space: SpaceId) => {
    if (space === mood) return;
    mood = space;
    retarget();
  };

  const setDayPhase = (p: DayPhase) => {
    if (p === dayPhase) return;
    dayPhase = p;
    retarget();
  };

  const update = (pos: THREE.Vector3, dt: number) => {
    lastPos.copy(pos);
    updateLamps(pos, dt);
    if (lookTarget) lerpLook(Math.min(1, dt * 2.5));
  };

  return { group, applyQuality, setWeather, setSpaceMood, setDayPhase, update };
}
