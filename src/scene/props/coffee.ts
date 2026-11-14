// 커피 코너: 수납장 카운터(문짝 3·타일 뒷벽) 위에 에스프레소 머신·그라인더·주전자·드리퍼·머그 쟁반,
// 벽 선반(머그·원두 병·작은 화분), 손글씨 메뉴판, 작은 카페 테이블과 의자.
// 카운터 원점은 바닥 중앙, 손님 쪽이 +z.
import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { MergeBucket, bevelBox, projectUV, taperLeg, trs } from '../geom';
import { CAFE_TABLE, COFFEE_BAR, SEATS, isPresent } from '../layout';
import { buildChairAt } from './furniture';
import { buildPlant } from './plants';

const MUG_TINTS = [0xe9e2d4, 0x9db0a3, 0xd8a48a, 0x6f8493, 0xe6cf9f, 0xb9c4b0];

function wood(bucket: MergeBucket, r: Rng, mat: string, g: THREE.BufferGeometry, grain: 'x' | 'y' | 'z', m: THREE.Matrix4, k = 1) {
  projectUV(g, grain, { offset: [r.float(), r.float()] });
  bucket.add(mat, g, m, new THREE.Color(k, k, k));
}

/** 머그: 몸통(살짝 벌어진 옆선) + 손잡이 + 커피 면. m은 바닥 중앙. */
function mug(bucket: MergeBucket, m: THREE.Matrix4, tint: number, filled = false, s = 1): void {
  const body = new THREE.LatheGeometry(
    [[0, 0], [0.032, 0], [0.036, 0.008], [0.038, 0.078], [0.034, 0.08], [0.031, 0.012], [0, 0.012]].map(([x, y]) => new THREE.Vector2(x * s, y * s)), 20);
  bucket.add('ceramic', body, m, tint);
  bucket.add('ceramic', new THREE.TorusGeometry(0.022 * s, 0.0055 * s, 8, 14, Math.PI), m.clone().multiply(trs(0.037 * s, 0.042 * s, 0, 0, 0, -Math.PI / 2)), tint);
  if (filled) bucket.add('walnut', new THREE.CircleGeometry(0.031 * s, 20), m.clone().multiply(trs(0, 0.068 * s, 0, -Math.PI / 2)), 0x3b2314);
}

export function buildCoffeeCorner(bucket: MergeBucket, rng: Rng): void {
  buildCoffeeBar(bucket, rng.fork('coffee-bar'));
  buildCafeTable(bucket, rng.fork('cafe-table'));
}

function buildCoffeeBar(bucket: MergeBucket, r: Rng): void {
  if (!isPresent(COFFEE_BAR)) return;
  const { x, z, ry, w, d, h } = COFFEE_BAR;
  const base = trs(x, 0, z, 0, ry);
  const at = (m: THREE.Matrix4) => base.clone().multiply(m);
  const topT = 0.04;
  const bodyH = h - topT;

  // ---- 수납장 ----
  wood(bucket, r, 'walnut', bevelBox(w - 0.08, 0.08, d - 0.08, 0.006), 'x', at(trs(0, 0.04, -0.01)));
  for (const sx of [-1, 1]) wood(bucket, r, 'honey', bevelBox(0.022, bodyH - 0.08, d - 0.02, 0.004), 'y', at(trs(sx * (w / 2 - 0.011), 0.08 + (bodyH - 0.08) / 2, 0)));
  wood(bucket, r, 'honey', bevelBox(w - 0.044, bodyH - 0.08, 0.018, 0.003), 'y', at(trs(0, 0.08 + (bodyH - 0.08) / 2, -d / 2 + 0.019)));
  wood(bucket, r, 'honey', bevelBox(w - 0.044, 0.02, d - 0.04, 0.003), 'x', at(trs(0, 0.09, 0)));
  // 문짝 3개: 테두리 + 살짝 들어간 판 + 황동 손잡이
  const n = 3;
  const dw = (w - 0.03) / n;
  const doorH = bodyH - 0.1;
  for (let i = 0; i < n; i++) {
    const cx = -w / 2 + 0.015 + dw * (i + 0.5);
    const cy = 0.09 + doorH / 2;
    const tone = 1 + r.range(-0.05, 0.05);
    wood(bucket, r, 'honey', bevelBox(dw - 0.008, doorH, 0.02, 0.004), 'y', at(trs(cx, cy, d / 2 - 0.012)), tone);
    wood(bucket, r, 'honey', bevelBox(dw - 0.09, doorH - 0.09, 0.012, 0.004), 'y', at(trs(cx, cy, d / 2 - 0.004)), tone * 0.93);
    const kx = cx + (i === 0 ? 1 : -1) * (dw / 2 - 0.035);
    bucket.add('brass', new THREE.CylinderGeometry(0.006, 0.006, 0.09, 10), at(trs(kx, cy + 0.14, d / 2 + 0.014)));
    for (const e of [-1, 1]) bucket.add('brass', new THREE.CylinderGeometry(0.004, 0.004, 0.014, 8).rotateX(Math.PI / 2), at(trs(kx, cy + 0.14 + e * 0.035, d / 2 + 0.006)));
  }
  // 상판(짙은 호두, 앞으로 살짝 나옴)
  wood(bucket, r, 'walnut', bevelBox(w + 0.03, topT, d + 0.035, 0.012, 3), 'x', at(trs(0, h - topT / 2, 0.012)), 0.92);
  // 뒷벽 타일 2줄
  const tile = 0.148;
  const cols = Math.floor(w / tile);
  for (let row = 0; row < 2; row++) {
    for (let c = 0; c < cols; c++) {
      const tx = -((cols - 1) * tile) / 2 + c * tile + (row ? tile / 2 : 0);
      if (Math.abs(tx) > w / 2 - tile / 2 + 0.005) continue;
      const t = 0.9 + r.range(0, 0.1);
      bucket.add('ceramic', bevelBox(tile - 0.008, tile - 0.008, 0.012, 0.004, 2), at(trs(tx, h + tile / 2 + row * tile + 0.004, -d / 2 + 0.008)), new THREE.Color(t * 0.86, t * 0.92, t * 0.88));
    }
  }

  // ---- 에스프레소 머신 ----
  const em = (m: THREE.Matrix4) => at(trs(-w / 2 + 0.3, h, -0.02).multiply(m));
  bucket.add('steel', bevelBox(0.34, 0.3, 0.3, 0.022, 4), em(trs(0, 0.2, -0.04)));
  bucket.add('iron', bevelBox(0.34, 0.05, 0.36, 0.014, 3), em(trs(0, 0.025, -0.01)));
  bucket.add('iron', bevelBox(0.3, 0.012, 0.13, 0.004, 1), em(trs(0, 0.056, 0.105)));
  for (let i = 0; i < 7; i++) bucket.add('steel', bevelBox(0.28, 0.004, 0.006, 0.001, 1), em(trs(0, 0.064, 0.055 + i * 0.017)));
  // 추출부 2개 + 포터필터(손잡이는 나무)
  for (const sx of [-0.075, 0.075]) {
    bucket.add('steel', new THREE.CylinderGeometry(0.034, 0.03, 0.045, 20), em(trs(sx, 0.2, 0.125)));
    bucket.add('iron', new THREE.CylinderGeometry(0.033, 0.03, 0.022, 20), em(trs(sx, 0.168, 0.125)));
    bucket.add('walnut', new THREE.CylinderGeometry(0.011, 0.014, 0.11, 10).rotateX(Math.PI / 2), em(trs(sx, 0.166, 0.205, 0.1)), 0x4a2e1c);
    bucket.add('steel', new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8), em(trs(sx, 0.15, 0.125)));
  }
  mug(bucket, em(trs(-0.075, 0.062, 0.125)), 0xefe8da, true, 0.8);
  // 스팀 완드, 압력계, 다이얼, 전원 등
  bucket.add('steel', new THREE.CylinderGeometry(0.005, 0.005, 0.17, 8), em(trs(0.2, 0.18, 0.11, 0.25, 0, -0.3)));
  bucket.add('iron', new THREE.SphereGeometry(0.014, 10, 8), em(trs(0.176, 0.262, 0.09)));
  bucket.add('iron', new THREE.CylinderGeometry(0.028, 0.028, 0.012, 20).rotateX(Math.PI / 2), em(trs(0, 0.285, 0.112)));
  bucket.add('paper', new THREE.CircleGeometry(0.023, 20), em(trs(0, 0.285, 0.119)));
  bucket.add('iron', bevelBox(0.003, 0.02, 0.002, 0.0005, 1), em(trs(0.004, 0.291, 0.121, 0, 0, -0.7)));
  for (const sx of [-0.12, 0.12]) bucket.add('iron', new THREE.CylinderGeometry(0.018, 0.02, 0.022, 16).rotateX(Math.PI / 2), em(trs(sx, 0.29, 0.118)));
  bucket.add('bulb', new THREE.SphereGeometry(0.006, 8, 6), em(trs(0.145, 0.24, 0.112)));
  // 윗면 컵 받침 난간과 데워 두는 잔
  for (const sz of [-0.17, 0.09]) bucket.add('steel', bevelBox(0.32, 0.008, 0.008, 0.002, 1), em(trs(0, 0.385, sz)));
  for (const sx of [-0.16, 0.16]) bucket.add('steel', bevelBox(0.008, 0.008, 0.27, 0.002, 1), em(trs(sx, 0.385, -0.04)));
  for (const sx of [-0.16, 0.16]) for (const sz of [-0.17, 0.09]) bucket.add('steel', new THREE.CylinderGeometry(0.004, 0.004, 0.035, 6), em(trs(sx, 0.367, sz)));
  for (let i = 0; i < 4; i++) mug(bucket, em(trs(-0.1 + (i % 2) * 0.1 + r.range(-0.01, 0.01), 0.35, -0.11 + Math.floor(i / 2) * 0.11, 0, r.range(0, 6))), 0xf0eadc, false, 0.78);

  // ---- 그라인더 ----
  const gm = (m: THREE.Matrix4) => at(trs(-w / 2 + 0.66, h, -0.05).multiply(m));
  bucket.add('iron', bevelBox(0.13, 0.24, 0.17, 0.02, 3), gm(trs(0, 0.12, 0)));
  bucket.add('steel', bevelBox(0.1, 0.02, 0.1, 0.006, 2), gm(trs(0, 0.03, 0.12)));
  bucket.add('steel', new THREE.CylinderGeometry(0.014, 0.018, 0.05, 12), gm(trs(0, 0.15, 0.1, 0.5)));
  bucket.add('beanJar', new THREE.CylinderGeometry(0.07, 0.04, 0.13, 20, 1, true), gm(trs(0, 0.305, 0)));
  bucket.add('walnut', new THREE.CylinderGeometry(0.058, 0.04, 0.07, 16), gm(trs(0, 0.278, 0)), 0x35200f);
  bucket.add('iron', new THREE.CylinderGeometry(0.073, 0.073, 0.012, 20), gm(trs(0, 0.376, 0)));

  // ---- 드립 주전자(목이 가는 주둥이) + 드리퍼 ----
  const km = (m: THREE.Matrix4) => at(trs(w / 2 - 0.58, h, -0.04).multiply(m));
  bucket.add('walnut', new THREE.CylinderGeometry(0.085, 0.085, 0.012, 24), km(trs(0, 0.006, 0)), 0x8a6a48);
  bucket.add('steel', new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.074, 0.02], [0.062, 0.12], [0.05, 0.135], [0, 0.135]].map(([a, b]) => new THREE.Vector2(a, b)), 24), km(trs(0, 0.012, 0)));
  bucket.add('walnut', new THREE.SphereGeometry(0.012, 10, 8), km(trs(0, 0.156, 0)), 0x2a1a10);
  const spout = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.065, 0.03, 0), new THREE.Vector3(0.105, 0.045, 0), new THREE.Vector3(0.125, 0.1, 0), new THREE.Vector3(0.155, 0.135, 0), new THREE.Vector3(0.175, 0.128, 0),
  ]), 20, 0.0065, 8);
  bucket.add('steel', spout, km(trs(0, 0.012, 0)));
  const handle = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.058, 0.125, 0), new THREE.Vector3(-0.11, 0.12, 0), new THREE.Vector3(-0.12, 0.07, 0), new THREE.Vector3(-0.072, 0.03, 0),
  ]), 16, 0.007, 8);
  bucket.add('walnut', handle, km(trs(0, 0.012, 0)), 0x2a1a10);
  // 드리퍼를 얹은 유리 서버
  const dm = (m: THREE.Matrix4) => at(trs(w / 2 - 0.36, h, 0.02).multiply(m));
  bucket.add('beanJar', new THREE.LatheGeometry([[0, 0], [0.045, 0], [0.05, 0.05], [0.032, 0.075], [0.036, 0.09]].map(([a, b]) => new THREE.Vector2(a, b)), 20), dm(trs(0, 0, 0)));
  bucket.add('ceramic', new THREE.CylinderGeometry(0.058, 0.02, 0.07, 20, 1, true), dm(trs(0, 0.128, 0)), 0xf1ece0);
  bucket.add('ceramic', new THREE.CylinderGeometry(0.05, 0.05, 0.008, 20), dm(trs(0, 0.094, 0)), 0xf1ece0);
  bucket.add('paper', new THREE.CylinderGeometry(0.062, 0.022, 0.066, 16, 1, true), dm(trs(0, 0.138, 0)));

  // ---- 머그 쟁반 + 원두 병 ----
  const tm = (m: THREE.Matrix4) => at(trs(w / 2 - 0.19, h, 0.03).multiply(m));
  wood(bucket, r, 'honey', bevelBox(0.26, 0.012, 0.3, 0.005, 2), 'z', tm(trs(0, 0.006, 0)), 1.05);
  for (const sz of [-1, 1]) wood(bucket, r, 'honey', bevelBox(0.26, 0.016, 0.012, 0.004, 1), 'x', tm(trs(0, 0.02, sz * 0.144)));
  for (let i = 0; i < 4; i++) {
    mug(bucket, tm(trs(-0.06 + (i % 2) * 0.12, 0.012, -0.07 + Math.floor(i / 2) * 0.13, 0, r.range(0, 6))), MUG_TINTS[(i + 1) % MUG_TINTS.length]);
  }
  const jar = (m: THREE.Matrix4, hh: number, fill: number) => {
    bucket.add('beanJar', new THREE.CylinderGeometry(0.042, 0.042, hh, 20, 1, true), m.clone().multiply(trs(0, hh / 2, 0)));
    bucket.add('walnut', new THREE.CylinderGeometry(0.039, 0.039, hh * fill, 16), m.clone().multiply(trs(0, (hh * fill) / 2 + 0.002, 0)), 0x3a2414);
    bucket.add('honey', new THREE.CylinderGeometry(0.045, 0.045, 0.016, 20), m.clone().multiply(trs(0, hh + 0.008, 0)));
  };
  jar(at(trs(-w / 2 + 0.83, h, -0.14)), 0.13, 0.7);
  jar(at(trs(-w / 2 + 0.93, h, -0.11)), 0.1, 0.5);

  // ---- 벽 선반 ----
  const sy = h + 0.56;
  const sw = w - 0.3;
  wood(bucket, r, 'honey', bevelBox(sw, 0.028, 0.19, 0.006, 2), 'x', at(trs(0, sy, -d / 2 + 0.1)));
  for (const sx of [-1, 1]) {
    bucket.add('brass', bevelBox(0.012, 0.13, 0.012, 0.003, 1), at(trs(sx * (sw / 2 - 0.12), sy - 0.078, -d / 2 + 0.012)));
    bucket.add('brass', bevelBox(0.012, 0.012, 0.15, 0.003, 1), at(trs(sx * (sw / 2 - 0.12), sy - 0.02, -d / 2 + 0.085)));
  }
  for (let i = 0; i < 5; i++) {
    mug(bucket, at(trs(-sw / 2 + 0.1 + i * 0.105, sy + 0.014, -d / 2 + 0.1 + r.range(-0.015, 0.015), 0, r.range(-0.6, 0.6))), MUG_TINTS[i % MUG_TINTS.length]);
  }
  jar(at(trs(sw / 2 - 0.34, sy + 0.014, -d / 2 + 0.1)), 0.15, 0.8);
  jar(at(trs(sw / 2 - 0.23, sy + 0.014, -d / 2 + 0.09)), 0.11, 0.6);
  buildPlant(bucket, r.fork('shelf-plant'), at(trs(sw / 2 - 0.08, sy + 0.014, -d / 2 + 0.1)), 'trail', 0.75);
}

/** 작은 카페 테이블(둥근 상판·주철 기둥·원판 받침) + 잔 2개, cafe-* 좌석의 의자. */
function buildCafeTable(bucket: MergeBucket, r: Rng): void {
  if (!isPresent(CAFE_TABLE)) return;
  const { x, z, r: rad, h } = CAFE_TABLE;
  const at = (m: THREE.Matrix4) => trs(x, 0, z).multiply(m);
  const top = new THREE.LatheGeometry(
    [[0, h - 0.03], [rad - 0.012, h - 0.03], [rad, h - 0.02], [rad, h - 0.008], [rad - 0.008, h], [0, h]].map(([a, b]) => new THREE.Vector2(a, b)), 40);
  wood(bucket, r, 'honey', top, 'x', at(trs(0, 0, 0)));
  bucket.add('iron', new THREE.CylinderGeometry(0.022, 0.028, h - 0.05, 14), at(trs(0, (h - 0.05) / 2 + 0.02, 0)));
  bucket.add('iron', new THREE.CylinderGeometry(0.07, 0.07, 0.02, 20), at(trs(0, h - 0.04, 0)));
  bucket.add('iron', new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.2, 0.012], [0.06, 0.035], [0, 0.035]].map(([a, b]) => new THREE.Vector2(a, b)), 28), at(trs(0, 0, 0)));
  // 잔 2개(받침 포함)와 작은 설탕 그릇
  for (const [cx, cz, tint] of [[-0.12, 0.08, 0xeae4d8], [0.11, -0.09, 0x9db0a3]] as const) {
    bucket.add('ceramic', new THREE.CylinderGeometry(0.058, 0.052, 0.008, 20), at(trs(cx, h + 0.004, cz)), tint);
    mug(bucket, at(trs(cx, h + 0.008, cz, 0, r.range(0, 6))), tint, true, 0.82);
  }
  for (const seat of SEATS.filter((s) => s.id.startsWith('cafe-'))) {
    buildChairAt(bucket, r.fork(seat.id), trs(seat.x, 0, seat.z, 0, seat.ry));
  }
  void taperLeg;
}

/** 커피 코너 벽에 거는 손글씨 메뉴판(검은 칠판 + 나무 테). 카운터가 없으면 null. */
export function buildCoffeeMenu(): THREE.Object3D | null {
  if (!isPresent(COFFEE_BAR)) return null;
  const { x, z, ry, d, h } = COFFEE_BAR;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const c = canvas.getContext('2d')!;
  const paint = () => {
    c.fillStyle = '#2b312d';
    c.fillRect(0, 0, 512, 640);
    c.fillStyle = 'rgba(255,255,255,0.035)';
    for (let i = 0; i < 60; i++) c.fillRect((i * 97) % 512, (i * 53) % 640, 90, 3);
    c.fillStyle = '#f1ead9';
    c.textAlign = 'center';
    c.font = '700 64px "Noto Serif KR", serif';
    c.fillText('쉬어 가는 커피', 256, 110);
    c.strokeStyle = '#d9c08a';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(90, 150);
    c.lineTo(422, 150);
    c.stroke();
    c.font = '500 46px "Noto Serif KR", serif';
    ['드립 커피', '따뜻한 차', '시원한 물'].forEach((t, i) => c.fillText(t, 256, 250 + i * 92));
    c.fillStyle = '#d9c08a';
    c.font = '500 34px "Noto Serif KR", serif';
    c.fillText('천천히, 한 잔 하고 가세요', 256, 560);
  };
  paint();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  void document.fonts.ready.then(() => {
    paint();
    tex.needsUpdate = true;
  });
  const bw = 0.42, bh = 0.52;
  const frame = new THREE.Mesh(bevelBox(bw + 0.05, bh + 0.05, 0.025, 0.006), new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.85 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  face.position.z = 0.014;
  frame.add(face);
  const g = new THREE.Group();
  g.applyMatrix4(trs(x, 0, z, 0, ry));
  frame.position.set(0, h + 1.12, -d / 2 + 0.02);
  g.add(frame);
  g.name = 'coffee-menu';
  return g;
}
