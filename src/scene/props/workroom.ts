// 1인 작업실: 서랍 달린 책상, 스탠드, 노트북, 공책·머그·펜꽂이, 벽 메모판과 작은 선반, 책상 의자.
// 방마다 시드로 나무 색조·소품 배치·메모 색이 달라진다. 책상 원점은 바닥 중앙, 앉는 쪽이 +z.
import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { MergeBucket, bevelBox, projectUV, taperLeg, trs } from '../geom';
import { SEATS, WORK_DESK, isPresent } from '../layout';
import { BookCollector, stackBooks } from './books';
import { buildChairAt } from './furniture';

function wood(bucket: MergeBucket, r: Rng, mat: string, g: THREE.BufferGeometry, grain: 'x' | 'y' | 'z', m: THREE.Matrix4, k = 1) {
  projectUV(g, grain, { offset: [r.float(), r.float()] });
  bucket.add(mat, g, m, new THREE.Color(k, k, k));
}

const NOTE_TINTS = [0xf3e3a0, 0xf2c6b4, 0xcfe0c4, 0xc9d9ea, 0xf1ead9];

export function buildWorkroom(bucket: MergeBucket, rng: Rng, books: BookCollector): void {
  if (!isPresent(WORK_DESK)) return;
  const r = rng.fork('work-desk');
  const { x, z, ry, w, d, h } = WORK_DESK;
  const base = trs(x, 0, z, 0, ry);
  const at = (m: THREE.Matrix4) => base.clone().multiply(m);
  const topMat = r.chance(0.5) ? 'honey' : 'medium';
  const tone = 1 + r.range(-0.06, 0.06);
  const topT = 0.035;

  // ---- 책상 ----
  wood(bucket, r, topMat, bevelBox(w, topT, d, 0.012, 3), 'x', at(trs(0, h - topT / 2, 0)), tone);
  wood(bucket, r, 'walnut', bevelBox(w - 0.1, 0.07, 0.02, 0.004), 'x', at(trs(0, h - topT - 0.035, -d / 2 + 0.06)));
  // 왼쪽 다리 2개 + 가로대
  for (const sz of [-1, 1]) wood(bucket, r, 'walnut', taperLeg(h - topT, 0.045, 0.03), 'y', at(trs(-w / 2 + 0.06, 0, sz * (d / 2 - 0.06))));
  wood(bucket, r, 'walnut', bevelBox(0.02, 0.02, d - 0.14, 0.004), 'z', at(trs(-w / 2 + 0.06, 0.16, 0)));
  // 오른쪽 서랍장(3단) — 앞판·손잡이
  const pw = 0.36;
  const px = w / 2 - pw / 2 - 0.02;
  const ph = h - topT - 0.06;
  wood(bucket, r, topMat, bevelBox(pw, ph, d - 0.06, 0.008, 2), 'y', at(trs(px, 0.06 + ph / 2, -0.01)), tone * 0.96);
  wood(bucket, r, 'walnut', bevelBox(pw - 0.04, 0.06, d - 0.12, 0.004), 'x', at(trs(px, 0.03, -0.01)));
  for (let i = 0; i < 3; i++) {
    const dh = (ph - 0.03) / 3;
    const cy = 0.075 + dh * (i + 0.5);
    wood(bucket, r, topMat, bevelBox(pw - 0.024, dh - 0.012, 0.018, 0.004), 'x', at(trs(px, cy, d / 2 - 0.036)), tone * (1.02 + r.range(-0.03, 0.03)));
    bucket.add('brass', bevelBox(0.09, 0.01, 0.014, 0.003, 1), at(trs(px, cy + 0.01, d / 2 - 0.02)));
  }

  // ---- 스탠드(무거운 받침 + 꺾이는 팔 두 마디 + 원뿔 갓 + 전구) ----
  const lx = -w / 2 + 0.16, lz = -d / 2 + 0.14;
  bucket.add('iron', new THREE.CylinderGeometry(0.07, 0.075, 0.018, 24), at(trs(lx, h + 0.009, lz)));
  bucket.add('brass', new THREE.CylinderGeometry(0.007, 0.007, 0.3, 8), at(trs(lx + 0.03, h + 0.16, lz, 0, 0, -0.2)));
  bucket.add('iron', new THREE.SphereGeometry(0.012, 10, 8), at(trs(lx + 0.06, h + 0.305, lz)));
  bucket.add('brass', new THREE.CylinderGeometry(0.007, 0.007, 0.26, 8), at(trs(lx + 0.155, h + 0.37, lz + 0.03, 0.2, 0, -0.95)));
  bucket.add('pendantShade', new THREE.CylinderGeometry(0.028, 0.085, 0.1, 20, 1, true), at(trs(lx + 0.27, h + 0.4, lz + 0.055, 0.25, 0, -0.35)));
  bucket.add('bulb', new THREE.SphereGeometry(0.022, 12, 8), at(trs(lx + 0.275, h + 0.385, lz + 0.06)));

  // ---- 노트북(받침 + 뒤로 젖힌 화면) ----
  const nx = -0.06 + r.range(-0.04, 0.04);
  const nb = at(trs(nx, h, 0.02, 0, r.range(-0.08, 0.08)));
  bucket.add('steel', bevelBox(0.33, 0.014, 0.23, 0.006, 2), nb.clone().multiply(trs(0, 0.007, 0)));
  bucket.add('iron', bevelBox(0.28, 0.002, 0.1, 0.001, 1), nb.clone().multiply(trs(0, 0.0152, -0.035)));
  bucket.add('iron', bevelBox(0.1, 0.002, 0.06, 0.001, 1), nb.clone().multiply(trs(0, 0.0152, 0.07)), 0x8d8f8c);
  const lid = nb.clone().multiply(trs(0, 0.014, -0.112, -0.3));
  bucket.add('steel', bevelBox(0.33, 0.215, 0.008, 0.004, 2), lid.clone().multiply(trs(0, 0.1075, 0)));
  bucket.add('screen', new THREE.PlaneGeometry(0.305, 0.19), lid.clone().multiply(trs(0, 0.108, 0.0046)));

  // ---- 공책·책 더미, 머그, 펜꽂이, 붙임쪽지 ----
  stackBooks(at(trs(w / 2 - 0.2, h, -0.12, 0, r.range(-0.25, 0.25))), r, books, r.int(2, 4));
  bucket.add('paper', bevelBox(0.15, 0.012, 0.21, 0.003, 1), at(trs(0.26 + r.range(-0.03, 0.03), h + 0.006, 0.12, 0, r.range(-0.3, 0.1))), 0xf4eedf);
  bucket.add('walnut', bevelBox(0.008, 0.008, 0.14, 0.003, 1), at(trs(0.3, h + 0.016, 0.1, 0, 0.5)), 0x2e3a4a);
  const mugM = at(trs(-0.33 + r.range(-0.03, 0.03), h, 0.13));
  bucket.add('ceramic', new THREE.CylinderGeometry(0.036, 0.032, 0.085, 18), mugM.clone().multiply(trs(0, 0.0425, 0)), NOTE_TINTS[r.int(0, NOTE_TINTS.length - 1)]);
  bucket.add('ceramic', new THREE.TorusGeometry(0.022, 0.0055, 8, 14, Math.PI), mugM.clone().multiply(trs(0.036, 0.045, 0, 0, 0, -Math.PI / 2)));
  bucket.add('walnut', new THREE.CircleGeometry(0.031, 18), mugM.clone().multiply(trs(0, 0.078, 0, -Math.PI / 2)), 0x3b2314);
  const cupM = at(trs(w / 2 - 0.42, h, -d / 2 + 0.12));
  bucket.add('terracotta', new THREE.CylinderGeometry(0.036, 0.03, 0.09, 16, 1, true), cupM.clone().multiply(trs(0, 0.045, 0)));
  bucket.add('terracotta', new THREE.CircleGeometry(0.03, 16), cupM.clone().multiply(trs(0, 0.002, 0, -Math.PI / 2)));
  for (let i = 0; i < 5; i++) {
    const tint = [0x2e3a4a, 0xa4463c, 0xd9a441, 0x3f6b55, 0x222222][i];
    bucket.add('paper', new THREE.CylinderGeometry(0.004, 0.004, 0.15, 6), cupM.clone().multiply(trs(r.range(-0.012, 0.012), 0.085, r.range(-0.012, 0.012), r.range(-0.18, 0.18), 0, r.range(-0.18, 0.18))), tint);
  }

  // ---- 벽: 코르크 메모판 + 작은 선반 ----
  const wallZ = -d / 2 - 0.045;
  const by = 1.45;
  const bw = 0.78, bh = 0.52;
  wood(bucket, r, 'walnut', bevelBox(bw + 0.05, bh + 0.05, 0.025, 0.006), 'x', at(trs(-0.12, by, wallZ)));
  bucket.add('paper', bevelBox(bw, bh, 0.012, 0.002, 1), at(trs(-0.12, by, wallZ + 0.012)), 0xc7a577);
  for (let i = 0; i < 7; i++) {
    const nw = r.range(0.085, 0.15), nh = r.range(0.085, 0.14);
    const px2 = -0.12 + r.range(-bw / 2 + 0.09, bw / 2 - 0.09), py = by + r.range(-bh / 2 + 0.08, bh / 2 - 0.08);
    bucket.add('paper', new THREE.PlaneGeometry(nw, nh), at(trs(px2, py, wallZ + 0.02 + i * 0.0008, 0, 0, r.range(-0.12, 0.12))), NOTE_TINTS[r.int(0, NOTE_TINTS.length - 1)]);
    bucket.add('brass', new THREE.SphereGeometry(0.007, 8, 6), at(trs(px2, py + nh / 2 - 0.014, wallZ + 0.025)), [0xa4463c, 0xd9a441, 0x3f6b55][i % 3]);
  }
  const shx = w / 2 - 0.18;
  wood(bucket, r, topMat, bevelBox(0.5, 0.025, 0.16, 0.005, 2), 'x', at(trs(shx, by + 0.02, wallZ + 0.08)), tone);
  for (const sx of [-1, 1]) bucket.add('iron', bevelBox(0.012, 0.11, 0.012, 0.003, 1), at(trs(shx + sx * 0.18, by - 0.045, wallZ + 0.012)));
  stackBooks(at(trs(shx - 0.1, by + 0.033, wallZ + 0.08, 0, r.range(-0.1, 0.1))), r, books, 3);
  bucket.add('ceramic', new THREE.LatheGeometry([[0, 0], [0.035, 0], [0.045, 0.06], [0.028, 0.1], [0.03, 0.12]].map(([a, b]) => new THREE.Vector2(a, b)), 18), at(trs(shx + 0.14, by + 0.033, wallZ + 0.08)), [0x687c67, 0xb9683f, 0x6f8493, 0xd8c7a4][r.int(0, 3)]);

  // ---- 책상 의자 ----
  for (const seat of SEATS.filter((s) => s.id.startsWith('desk-'))) {
    buildChairAt(bucket, r.fork(seat.id), trs(seat.x, 0, seat.z, 0, seat.ry));
  }
}
