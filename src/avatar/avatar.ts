// 절차 아바타: 키 약 1.1m의 슬림한 미니미 독서가(큼직한 머리 + 가는 몸통·팔다리, 약 3.5등신).
// 뼈 없이 부위 트랜스폼으로 움직이고, 팔꿈치·무릎 관절이 있어 앉기·책 들기가 자연스럽다.
// 부위별 정점 색을 한 메시로 합쳐 드로우콜을 줄인다(아바타 하나 = 약 12콜).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { AvatarState, HairStyle } from '../net/presence';
import { AvatarAnimator } from './animations';

const SKIN = new THREE.Color('#f3d2b5');
const HAIR = new THREE.Color('#2c211b');
const HAIR_GRAY = new THREE.Color('#9a9590');
const HAIR_STREAK = HAIR.clone().lerp(HAIR_GRAY, 0.75);
const BEARD = new THREE.Color('#4a433c');
const BEARD_GRAY = new THREE.Color('#a8a29a');
const STUBBLE = BEARD.clone().lerp(SKIN, 0.5);
const STUBBLE_GRAY = BEARD_GRAY.clone().lerp(SKIN, 0.3);
const BROW = new THREE.Color('#2a2420');
const BLUSH = new THREE.Color('#f09a8c');
const PANTS = new THREE.Color('#3d3833');
const SHOE = new THREE.Color('#2a211c');
const GOLD = new THREE.Color('#c4a46a');
const MOLE = new THREE.Color('#5a3a28');

/** Y-Place 운영자(매드 사이언티스트) 셔츠 색. 매니저는 look.color 대신 이 색을 쓴다. */
export const MANAGER_COLOR = '#3a4654';

/** 모든 아바타가 같이 쓰는 재질(색은 정점 색). */
const SHARED = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0 });
const EYE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25 });

/** 정점 위치(y, x, z)로 색을 정하는 함수. */
export type Painter = (y: number, x: number, z: number) => THREE.Color;

export function paint(g: THREE.BufferGeometry, color: THREE.Color | Painter): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = typeof color === 'function' ? color(pos.getY(i), pos.getX(i), pos.getZ(i)) : color;
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  ng.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'color'].includes(k)) ng.deleteAttribute(k);
  return ng;
}

export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(list)!;
  g.computeBoundingSphere();
  return g;
}

/** 앞쪽(+z)을 비워 둔 구 조각. 머리카락용. */
function hairShell(r: number, frontGap: number, thetaLen: number, thetaStart = 0): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, 28, 14, Math.PI / 2 + frontGap / 2, Math.PI * 2 - frontGap, thetaStart, thetaLen);
}

/** 회색 머리가 군데군데 섞인 머리색(운영자용). */
const graying: Painter = (y, x, z) => {
  const s = Math.sin(x * 95 + z * 41 + y * 23) * Math.sin(z * 77 - x * 29 + y * 57);
  return s > 0.35 ? HAIR_STREAK : HAIR;
};

function headGeometry(hair: HairStyle): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(new THREE.SphereGeometry(0.215, 32, 20), SKIN));
  // 볼 홍조
  for (const sx of [-1, 1]) {
    const c = new THREE.CircleGeometry(0.024, 16);
    const n = new THREE.Vector3(sx * 0.55, -0.22, 0.8).normalize();
    c.lookAt(n);
    c.translate(n.x * 0.2165, n.y * 0.2165, n.z * 0.2165);
    parts.push(paint(c, BLUSH));
  }
  const hc: THREE.Color | Painter = hair === 'curtain' ? graying : HAIR;
  // 머리카락 3종 + 운영자용 커튼
  const top = (thetaLen: number, tilt: number, r = 0.226) => {
    const g = new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, thetaLen);
    g.rotateX(-tilt);
    return paint(g, hc);
  };
  if (hair === 'bangs') {
    parts.push(top(Math.PI * 0.5, 0.2));
    // 앞머리: 이마를 덮는 띠
    // phi가 π/2 근처면 +z(얼굴 쪽)
    const fringe = new THREE.SphereGeometry(0.229, 24, 6, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.2, Math.PI * 0.16);
    parts.push(paint(fringe, hc));
    parts.push(paint(hairShell(0.228, Math.PI * 0.9, Math.PI * 0.62), hc));
  } else if (hair === 'bob') {
    parts.push(top(Math.PI * 0.42, 0.05, 0.232));
    parts.push(paint(hairShell(0.236, Math.PI * 0.62, Math.PI * 0.7), hc));
    const fringe = new THREE.SphereGeometry(0.234, 24, 6, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.18, Math.PI * 0.12);
    parts.push(paint(fringe, hc));
  } else if (hair === 'curtain') {
    // 매드 사이언티스트: 숱 많고 들뜬 커튼 헤어 + 정수리 삐침.
    parts.push(top(Math.PI * 0.4, 0.12, 0.232));
    parts.push(paint(hairShell(0.236, Math.PI * 0.65, Math.PI * 0.72), hc));
    const fringe = new THREE.SphereGeometry(0.234, 24, 8, Math.PI * 0.14, Math.PI * 0.72, Math.PI * 0.18, Math.PI * 0.2);
    parts.push(paint(fringe, hc));
    for (const [sx, ang] of [[-1, -0.55], [1, 0.45], [0.2, -0.15]] as const) {
      const tuft = new THREE.ConeGeometry(0.028, 0.1, 7);
      tuft.rotateZ(ang);
      tuft.translate(sx * 0.04, 0.24, -0.02);
      parts.push(paint(tuft, hc));
    }
  } else {
    parts.push(top(Math.PI * 0.4, 0.32, 0.224));
    // 정수리 삐침
    const tuft = new THREE.ConeGeometry(0.03, 0.08, 8);
    tuft.rotateZ(-0.5);
    tuft.translate(0.03, 0.235, -0.02);
    parts.push(paint(tuft, HAIR));
  }
  return merge(parts);
}

/** 운영자 얼굴 요소: 귀, 코, 짙은 눈썹, 콧수염, 턱선을 따라 난 회색 섞인 수염, 오른쪽 볼 점. */
function faceExtrasGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 귀(사진에서 귀가 눈에 띈다): 머리카락 바깥으로 살짝 튀어나오게
  for (const sx of [-1, 1]) {
    const ear = new THREE.SphereGeometry(0.045, 12, 10);
    ear.scale(0.35, 1, 0.7);
    ear.translate(sx * 0.228, -0.03, 0.0);
    parts.push(paint(ear, SKIN));
  }

  // 코
  const nose = new THREE.SphereGeometry(0.022, 12, 10);
  nose.scale(0.85, 1.05, 0.95);
  nose.translate(0, -0.03, 0.205);
  parts.push(paint(nose, SKIN));

  // 눈썹: 두껍고 안쪽이 살짝 내려온 찡그린 모양. 머리 곡면을 따라 기울여 붙인다.
  for (const sx of [-1, 1]) {
    const b = new THREE.BoxGeometry(0.07, 0.016, 0.012);
    b.rotateZ(sx * 0.14);
    b.rotateY(sx * 0.4);
    b.translate(sx * 0.08, 0.066, 0.19);
    parts.push(paint(b, BROW));
  }

  // 턱선 수염(까칠하게 난 부분): 얼굴 아래쪽 앞면을 얇게 덮고 턱 쪽은 회색
  const jaw = new THREE.SphereGeometry(0.2185, 28, 10, Math.PI * 0.5 - Math.PI * 0.5, Math.PI * 1.0, 2.0, 0.85);
  parts.push(paint(jaw, (y, x, z) => {
    const gray = y < -0.15 || Math.sin(x * 130 + z * 70) * Math.sin(z * 110 - y * 60) > 0.5;
    return gray ? STUBBLE_GRAY : STUBBLE;
  }));

  // 콧수염: 입 위 납작한 덩어리 + 양 끝이 살짝 처진 모양, 회색 살짝
  const stache = BEARD.clone().lerp(BEARD_GRAY, 0.25);
  for (const sx of [-1, 1]) {
    const m = new THREE.SphereGeometry(0.042, 12, 10);
    m.scale(1.1, 0.4, 0.5);
    m.translate(sx * 0.036, -0.05, 0.2);
    parts.push(paint(m, stache));
    const droop = new THREE.SphereGeometry(0.024, 10, 8);
    droop.scale(0.9, 0.6, 0.5);
    droop.translate(sx * 0.07, -0.07, 0.185);
    parts.push(paint(droop, stache));
  }
  const mid = new THREE.SphereGeometry(0.022, 10, 8);
  mid.scale(1.1, 0.35, 0.4);
  mid.translate(0, -0.052, 0.202);
  parts.push(paint(mid, stache));

  // 턱수염: 턱 앞에 붙는 넉넉한 타원, 아래로 갈수록 회색
  // 갸름한 얼굴에서 턱 아래로 삐져나오지 않게 턱 앞면에 붙인다
  const goatee = new THREE.SphereGeometry(0.2195, 20, 8, Math.PI * 0.5 - 0.32, 0.64, 2.42, 0.36);
  parts.push(paint(goatee, (y) => (y < -0.19 ? BEARD_GRAY : BEARD)));

  // 볼 점
  const mole = new THREE.SphereGeometry(0.007, 8, 6);
  mole.translate(-0.115, -0.035, 0.188);
  parts.push(paint(mole, MOLE));
  return merge(parts);
}

/** 얇은 금속테 안경. 렌즈가 큼직하고 살짝 납작한 원형. XY면(정면 +z)을 바라본다. */
function glassesGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const z = 0.21;
  const rimR = 0.05;
  const rimX = 0.082;
  for (const sx of [-1, 1]) {
    const t = new THREE.TorusGeometry(rimR, 0.0038, 8, 28);
    t.scale(1, 0.92, 1);
    t.translate(sx * rimX, 0, z);
    parts.push(paint(t, GOLD));
  }
  // 브릿지
  const bridge = new THREE.BoxGeometry(rimX * 2 - rimR * 2 + 0.004, 0.005, 0.005);
  bridge.translate(0, 0.012, z);
  parts.push(paint(bridge, GOLD));
  // 코받침
  for (const sx of [-1, 1]) {
    const pad = new THREE.SphereGeometry(0.006, 8, 6);
    pad.scale(0.7, 1, 0.7);
    pad.translate(sx * 0.026, -0.012, z - 0.008);
    parts.push(paint(pad, GOLD));
  }
  // 다리: 렌즈 바깥쪽에서 귀 쪽으로 비스듬히
  for (const sx of [-1, 1]) {
    const len = 0.11;
    const arm = new THREE.BoxGeometry(0.005, 0.005, len);
    arm.rotateY(-sx * 0.364);
    arm.translate(sx * (rimX + rimR + 0.0196), 0.012, z - 0.0514);
    parts.push(paint(arm, GOLD));
  }
  return merge(parts);
}

// ───────────────────────── 슬림 체형 치수 ─────────────────────────
// 키 약 1.1m, 약 3.5등신 미니미. 머리는 크게, 몸통·팔다리는 가늘게. 발바닥 y=0, 몸통 원점 = 엉덩이 관절.
// 몸통·앞치마는 기준 치수로 만든 뒤 TORSO_S로 줄인다.
// 머리 디테일(머리카락·안경·수염)은 반지름 0.215 구 기준 좌표로 만들고 headModel 축척으로 줄인다.

/** 머리 모델 축척: 기준 구(0.215) → 실제 머리 반지름 약 0.145m */
const HEAD_S = 0.145 / 0.215;
/** 얼굴을 아주 살짝 갸름하게 */
const HEAD_SCALE = new THREE.Vector3(HEAD_S * 0.96, HEAD_S * 1.04, HEAD_S * 0.98);
/** 몸통 축척(가로·세로). 기준 몸통(높이 0.45m)을 짧고 가늘게. */
const TORSO_S = { x: 0.8, y: 0.66 };
const THIGH = 0.2;
const SHIN = 0.24; // 무릎 → 발바닥
export const UPPER_ARM = 0.165;
export const FOREARM = 0.145;
export const SHOULDER_X = 0.132 * TORSO_S.x;
export const SHOULDER_Y = 0.372 * TORSO_S.y;
const LEG_X = 0.06;
/** 목 끝(머리 회전 축) — 몸통 원점 기준 */
const NECK_TOP = 0.5 * TORSO_S.y;
/** 목 끝 → 머리 중심 */
const HEAD_LIFT = 0.215 * HEAD_SCALE.y * 0.8;
/** 몸통 앞뒤 두께 비율(납작한 상체) */
const TORSO_DEPTH = 0.7;

export const HIP_Y = THIGH + SHIN;
export const HEAD_Y = HIP_Y + NECK_TOP + HEAD_LIFT;
/** 머리카락 꼭대기(이름표 기준) */
export const HEAD_TOP = HEAD_Y + 0.215 * HEAD_SCALE.y + 0.012;

// ───────────────────────── 몸통 + 목수 앞치마 ─────────────────────────

/** 몸통 단면 [반지름, 높이]. 몸통과 앞치마가 같은 표를 써서 딱 맞게 붙는다. 아래→위. */
const BODY_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0.001, -0.052], [0.08, -0.048], [0.112, -0.018], [0.12, 0.03], [0.108, 0.12], [0.101, 0.18],
  [0.11, 0.25], [0.124, 0.31], [0.13, 0.36], [0.124, 0.395], [0.102, 0.425], [0.06, 0.446], [0.001, 0.452],
];

/** 높이 y에서 몸통 반지름. */
function bodyR(y: number): number {
  for (let i = 1; i < BODY_PROFILE.length; i++) {
    const [r0, y0] = BODY_PROFILE[i - 1];
    const [r1, y1] = BODY_PROFILE[i];
    if (y1 > y0 && y >= y0 && y <= y1) return r0 + (r1 - r0) * ((y - y0) / (y1 - y0));
  }
  return 0.06;
}

/** 앞치마가 따라가는 면: 허리 아래는 엉덩이에서 살짝 벌어진다. */
function apronR(y: number): number {
  return y < 0.06 ? Math.max(bodyR(y), 0.121 + (0.06 - y) * 0.12) : bodyR(y);
}

/** 몸통 표면에서 off만큼 띄운 앞면 z 좌표(옆으로 x만큼 간 지점). 납작하게 누르기 전 좌표. */
function frontZ(y: number, x: number, off: number): number {
  const r = apronR(y) + off;
  return Math.sqrt(Math.max(0, r * r - x * x));
}

/** 몸통 앞면(+z)을 span 각도만큼 감싸는 얇은 껍질. ys는 아래→위 순서. */
function shell(ys: number[], off: number, span: number, color: THREE.Color | Painter, segs = 20): THREE.BufferGeometry {
  const pts = ys.map((y) => new THREE.Vector2(apronR(y) + off, y));
  return paint(new THREE.LatheGeometry(pts, segs, -span / 2, span), color);
}

const COAT = new THREE.Color('#f4f1ea'); // 흰 실험 가운
const COAT_EDGE = new THREE.Color('#e2ddd4');
const COAT_LINING = new THREE.Color('#d8e8ef'); // 연한 청록 안감 느낌
const PEN_BLUE = new THREE.Color('#2a5f9e');
const PEN_RED = new THREE.Color('#b83232');
const GOGGLE = new THREE.Color('#2c3238');
const GOGGLE_LENS = new THREE.Color('#9ec9d8');
const STEEL = new THREE.Color('#6d7075');
const SOLE = new THREE.Color('#d9d2c5');

/** 매드 사이언티스트 흰 가운: 열린 앞자락·옷깃·주머니·펜. */
function labCoatGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // 뒷판·옆구리·소매 느낌 (앞은 열어 둔다)
  parts.push(shell([0.015, 0.05, 0.11, 0.2, 0.3, 0.38, 0.43], 0.022, Math.PI * 1.55, COAT, 32));
  // 왼쪽·오른쪽 앞자락(살짝 벌어진 두 패널)
  for (const sx of [-1, 1]) {
    const flap = shell([0.02, 0.08, 0.18, 0.3, 0.4], 0.024, Math.PI * 0.34, COAT, 14);
    flap.rotateY(sx * 0.18);
    parts.push(flap);
  }
  // 옷깃
  for (const sx of [-1, 1]) {
    const collar = new THREE.BoxGeometry(0.07, 0.045, 0.012);
    collar.rotateZ(sx * -0.35);
    collar.rotateY(sx * 0.45);
    collar.translate(sx * 0.05, 0.41, frontZ(0.41, sx * 0.04, 0.018));
    parts.push(paint(collar, COAT_EDGE));
  }
  // 허리 벨트 느낌
  parts.push(shell([0.145, 0.165], 0.018, Math.PI * 1.5, COAT_EDGE, 24));
  // 가슴 주머니 + 펜 2자루
  parts.push(shell([0.26, 0.295, 0.3], 0.02, Math.PI * 0.22, COAT_LINING, 10));
  for (const [dx, col] of [[-0.018, PEN_BLUE], [0.012, PEN_RED]] as const) {
    const pen = new THREE.CylinderGeometry(0.0038, 0.0038, 0.055, 6);
    pen.translate(dx, 0.3, frontZ(0.29, dx, 0.012));
    parts.push(paint(pen, col));
  }
  // 아래 주머니 두 개
  for (const sx of [-1, 1]) {
    const pocket = shell([0.06, 0.1, 0.108], 0.02, Math.PI * 0.2, COAT_EDGE, 10);
    pocket.translate(sx * 0.02, 0, 0);
    parts.push(pocket);
  }
  // 단추 줄
  for (let i = 0; i < 4; i++) {
    const y = 0.34 - i * 0.07;
    const btn = new THREE.SphereGeometry(0.006, 8, 6);
    btn.translate(0.012, y, frontZ(y, 0.01, 0.017));
    parts.push(paint(btn, STEEL));
  }
  const g = merge(parts);
  g.scale(TORSO_S.x, TORSO_S.y, TORSO_S.x * TORSO_DEPTH);
  return g;
}

/** 머리 위 고글(이마에 올려 둔 상태). */
function gogglesGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const y = 0.12;
  const z = 0.05;
  for (const sx of [-1, 1]) {
    const rim = new THREE.TorusGeometry(0.038, 0.006, 8, 20);
    rim.scale(1, 0.85, 1);
    rim.rotateX(-0.55);
    rim.translate(sx * 0.055, y, z);
    parts.push(paint(rim, GOGGLE));
    const lens = new THREE.CircleGeometry(0.032, 16);
    lens.rotateX(-0.55);
    lens.translate(sx * 0.055, y, z + 0.004);
    parts.push(paint(lens, GOGGLE_LENS));
  }
  const bridge = new THREE.BoxGeometry(0.04, 0.008, 0.008);
  bridge.rotateX(-0.55);
  bridge.translate(0, y + 0.01, z);
  parts.push(paint(bridge, GOGGLE));
  const strap = new THREE.TorusGeometry(0.2, 0.006, 6, 24, Math.PI * 1.2);
  strap.rotateX(Math.PI / 2);
  strap.rotateZ(Math.PI);
  strap.translate(0, 0.08, -0.02);
  parts.push(paint(strap, GOGGLE));
  return merge(parts);
}

/** 동글동글한 눈(머리 기준 좌표). */
function eyesGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.SphereGeometry(0.025, 14, 10);
    e.scale(0.9, 1.05, 0.45);
    e.translate(sx * 0.074, 0, 0);
    parts.push(paint(e, new THREE.Color('#1d1a17')));
    const hl = new THREE.SphereGeometry(0.0075, 8, 6);
    hl.translate(sx * 0.074 + 0.008, 0.01, 0.01);
    parts.push(paint(hl, new THREE.Color('#ffffff')));
  }
  return merge(parts);
}

/** 일반 방문자의 코·귀(운영자는 faceExtras에 따로 있다). */
function noseGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const nose = new THREE.SphereGeometry(0.02, 12, 10);
  nose.scale(0.7, 1.15, 0.9);
  nose.translate(0, -0.04, 0.205);
  parts.push(paint(nose, SKIN.clone().multiplyScalar(0.97)));
  for (const sx of [-1, 1]) {
    const ear = new THREE.SphereGeometry(0.04, 12, 10);
    ear.scale(0.35, 1, 0.7);
    ear.translate(sx * 0.214, -0.035, 0);
    parts.push(paint(ear, SKIN));
  }
  return merge(parts);
}

/** 가는 몸통(Lathe, 앞뒤로 눌러 납작하게) + 셔츠 밑단 + 바지 허리 + 옷깃 + 목 */
function bodyGeometry(outfit: THREE.Color): THREE.BufferGeometry {
  const prof = BODY_PROFILE.map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.LatheGeometry(prof, 32);
  const hem = outfit.clone().multiplyScalar(0.82);
  const torso = paint(body, (y) => (y < 0.03 ? PANTS : y < 0.05 ? hem : outfit));
  const collar = new THREE.TorusGeometry(0.052, 0.012, 8, 24);
  collar.rotateX(Math.PI / 2);
  collar.translate(0, 0.44, 0);
  const neck = new THREE.CylinderGeometry(0.036, 0.04, 0.12, 14);
  neck.translate(0, 0.47, 0);
  const g = merge([torso, paint(collar, outfit.clone().offsetHSL(0, -0.05, 0.12)), paint(neck, SKIN)]);
  g.scale(TORSO_S.x, TORSO_S.y, TORSO_S.x * TORSO_DEPTH);
  return g;
}

/** 위팔: 어깨 관절이 원점, 아래(-y)로 뻗는다. 소매 색. */
function upperArmGeometry(outfit: THREE.Color): THREE.BufferGeometry {
  const U = UPPER_ARM;
  const prof = [[0.001, -U - 0.004], [0.019, -U], [0.021, -U * 0.72], [0.024, -U * 0.3], [0.025, -0.014], [0.001, 0.014]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const shoulder = new THREE.SphereGeometry(0.024, 14, 10);
  shoulder.scale(1, 0.8, 0.85);
  const elbow = new THREE.SphereGeometry(0.0195, 12, 8);
  elbow.translate(0, -U, 0);
  return merge([paint(new THREE.LatheGeometry(prof, 14), outfit), paint(shoulder, outfit), paint(elbow, outfit)]);
}

/** 아래팔 + 동그란 손: 팔꿈치가 원점. */
function forearmGeometry(outfit: THREE.Color): THREE.BufferGeometry {
  const F = FOREARM;
  const prof = [[0.001, -F], [0.016, -F], [0.017, -F * 0.65], [0.02, -F * 0.2], [0.0195, 0], [0.001, 0.01]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const cuff = new THREE.TorusGeometry(0.016, 0.004, 6, 16);
  cuff.rotateX(Math.PI / 2);
  cuff.translate(0, -F + 0.009, 0);
  const hand = new THREE.SphereGeometry(0.023, 14, 10);
  hand.scale(0.78, 1.05, 0.62);
  hand.translate(0, -F - 0.022, 0.003);
  const thumb = new THREE.SphereGeometry(0.009, 8, 6);
  thumb.scale(0.85, 1.3, 0.85);
  thumb.translate(0, -F - 0.014, 0.014);
  return merge([
    paint(new THREE.LatheGeometry(prof, 14), outfit),
    paint(cuff, outfit.clone().offsetHSL(0, -0.04, 0.1)),
    paint(hand, SKIN), paint(thumb, SKIN),
  ]);
}

/** 허벅지: 엉덩이 관절이 원점. */
function thighGeometry(): THREE.BufferGeometry {
  const T = THIGH;
  const prof = [[0.001, -T - 0.008], [0.031, -T], [0.034, -T * 0.72], [0.04, -T * 0.32], [0.043, -T * 0.06], [0.036, 0.014], [0.001, 0.026]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const knee = new THREE.SphereGeometry(0.032, 12, 10);
  knee.translate(0, -T, 0.003);
  return merge([paint(new THREE.LatheGeometry(prof, 16), PANTS), paint(knee, PANTS)]);
}

/** 정강이 + 동그란 신발: 무릎이 원점. 발끝은 +z. */
function shinGeometry(): THREE.BufferGeometry {
  const S = SHIN;
  const prof = [[0.001, -S + 0.038], [0.026, -S + 0.042], [0.027, -S * 0.62], [0.031, -S * 0.22], [0.032, 0], [0.001, 0.014]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const hemC = PANTS.clone().multiplyScalar(0.85);
  const shoe = new THREE.SphereGeometry(1, 18, 12);
  shoe.scale(0.037, 0.032, 0.075);
  shoe.translate(0, -S + 0.03, 0.026);
  const sole = new THREE.CylinderGeometry(1, 1, 0.011, 18);
  sole.scale(0.039, 1, 0.077);
  sole.translate(0, -S + 0.0065, 0.026);
  return merge([
    paint(new THREE.LatheGeometry(prof, 16), (y) => (y < -S + 0.06 ? hemC : PANTS)),
    paint(shoe, SHOE), paint(sole, SOLE),
  ]);
}

/** 손에 드는 잔(도자기 + 음료 수면). liquid는 정점 색으로. */
function cupGeometry(liquid: THREE.Color): THREE.BufferGeometry {
  const ceramic = new THREE.Color('#f2ebe0');
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.CylinderGeometry(0.028, 0.024, 0.055, 14, 1, true);
  body.translate(0, 0.028, 0);
  parts.push(paint(body, ceramic));
  const bottom = new THREE.CircleGeometry(0.024, 14);
  bottom.rotateX(-Math.PI / 2);
  parts.push(paint(bottom, ceramic));
  const rim = new THREE.TorusGeometry(0.028, 0.0035, 8, 18);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, 0.055, 0);
  parts.push(paint(rim, ceramic));
  const drink = new THREE.CircleGeometry(0.025, 14);
  drink.rotateX(-Math.PI / 2);
  drink.translate(0, 0.05, 0);
  parts.push(paint(drink, liquid));
  const handle = new THREE.TorusGeometry(0.016, 0.004, 8, 14, Math.PI);
  handle.rotateY(Math.PI / 2);
  handle.translate(0.03, 0.03, 0);
  parts.push(paint(handle, ceramic));
  return merge(parts);
}

/** 두 손에 드는 펼친 책. */
function heldBookGeometry(cover: THREE.Color): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const c = new THREE.BoxGeometry(0.1, 0.005, 0.14);
    c.translate(sx * 0.05, 0, 0);
    c.rotateZ(sx * 0.28);
    parts.push(paint(c, cover));
    const p = new THREE.BoxGeometry(0.094, 0.012, 0.13);
    p.translate(sx * 0.05, 0.008, 0);
    p.rotateZ(sx * 0.28);
    parts.push(paint(p, new THREE.Color('#f4ecd8')));
  }
  return merge(parts);
}

export interface AvatarLook {
  color: string;
  hair: HairStyle;
  /** Y-Place 운영자 전용 외형(안경·수염·흰 가운·고글 등) */
  manager?: boolean;
}

export class Avatar {
  readonly root = new THREE.Group();
  /** 몸 전체(앉기·인사 때 기울임). 원점 = 엉덩이 관절 */
  readonly body = new THREE.Group();
  /** 목 끝을 축으로 도는 머리 */
  readonly head = new THREE.Group();
  /** 머리 디테일 모델(기준 구 좌표 → 실제 크기 축척) */
  private readonly headModel = new THREE.Group();
  readonly armL = new THREE.Group();
  readonly armR = new THREE.Group();
  /** 팔꿈치 아래 */
  readonly foreL = new THREE.Group();
  readonly foreR = new THREE.Group();
  readonly legL = new THREE.Group();
  readonly legR = new THREE.Group();
  /** 무릎 아래 */
  readonly shinL = new THREE.Group();
  readonly shinR = new THREE.Group();
  readonly eyes: THREE.Mesh;
  readonly book: THREE.Mesh;
  /** 마실 때 오른손에 드는 잔 */
  readonly cup: THREE.Mesh;
  readonly anim: AvatarAnimator;
  private meshes: THREE.Mesh[] = [];
  private look: AvatarLook;

  constructor(look: AvatarLook) {
    this.look = { ...look };
    this.root.name = 'avatar';
    this.eyes = new THREE.Mesh(eyesGeometry(), EYE_MAT);
    this.eyes.position.set(0, -0.005, 0.197);
    this.book = new THREE.Mesh(heldBookGeometry(new THREE.Color('#8c2f2a')), SHARED);
    this.book.visible = false;
    this.cup = new THREE.Mesh(cupGeometry(new THREE.Color('#9ec9e0')), SHARED);
    this.cup.visible = false;
    this.build();
    this.anim = new AvatarAnimator(this);
  }

  /** 잔 속 음료 색을 바꾼다. */
  setCupLiquid(hex: string): void {
    this.cup.geometry.dispose();
    this.cup.geometry = cupGeometry(new THREE.Color(hex));
  }

  private build(): void {
    for (const m of this.meshes) {
      m.removeFromParent();
      m.geometry.dispose();
    }
    this.meshes = [];
    const outfit = new THREE.Color(this.look.manager ? MANAGER_COLOR : this.look.color);
    const add = (parent: THREE.Object3D, g: THREE.BufferGeometry) => {
      const m = new THREE.Mesh(g, SHARED);
      m.castShadow = false;
      parent.add(m);
      this.meshes.push(m);
      return m;
    };
    this.root.add(this.body);
    this.body.position.y = HIP_Y;
    add(this.body, bodyGeometry(outfit));
    if (this.look.manager) add(this.body, labCoatGeometry());

    this.body.add(this.head);
    this.head.position.y = NECK_TOP;
    this.head.add(this.headModel);
    this.headModel.position.y = HEAD_LIFT;
    this.headModel.scale.copy(HEAD_SCALE);
    const hair = this.look.manager ? 'curtain' : this.look.hair;
    add(this.headModel, headGeometry(hair));
    if (this.look.manager) {
      add(this.headModel, faceExtrasGeometry());
      add(this.headModel, glassesGeometry());
      add(this.headModel, gogglesGeometry());
    } else {
      add(this.headModel, noseGeometry());
    }
    this.headModel.add(this.eyes);

    for (const [arm, fore, sx] of [[this.armL, this.foreL, 1], [this.armR, this.foreR, -1]] as const) {
      this.body.add(arm);
      arm.position.set(sx * SHOULDER_X, SHOULDER_Y, 0);
      add(arm, upperArmGeometry(outfit));
      arm.add(fore);
      fore.position.y = -UPPER_ARM;
      add(fore, forearmGeometry(outfit));
    }
    for (const [leg, shin, sx] of [[this.legL, this.shinL, 1], [this.legR, this.shinR, -1]] as const) {
      this.root.add(leg);
      leg.position.set(sx * LEG_X, HIP_Y, 0);
      add(leg, thighGeometry());
      leg.add(shin);
      shin.position.y = -THIGH;
      add(shin, shinGeometry());
    }
    this.body.add(this.book);
    this.book.position.copy(BOOK_POS);
    this.book.rotation.x = -0.6;
    this.book.scale.setScalar(0.85);
    // 오른손에 잔
    this.foreR.add(this.cup);
    this.cup.position.copy(CUP_POS);
    this.cup.scale.setScalar(1);
  }

  setLook(look: AvatarLook): void {
    if (
      look.color === this.look.color
      && look.hair === this.look.hair
      && !!look.manager === !!this.look.manager
    ) return;
    this.look = { ...look };
    this.build();
  }

  get state(): AvatarState {
    return this.anim.state;
  }

  update(dt: number, t: number): void {
    this.anim.update(dt, t);
  }

  dispose(): void {
    for (const m of this.meshes) m.geometry.dispose();
    this.root.removeFromParent();
  }
}

/** 읽을 때 책 위치(몸통 기준): 가슴 앞, 손이 닿는 거리 */
export const BOOK_POS = new THREE.Vector3(0, 0.15, 0.2);
/** 잔 위치(아래팔 기준): 손바닥 앞 */
export const CUP_POS = new THREE.Vector3(0, -FOREARM - 0.022, 0.01);
