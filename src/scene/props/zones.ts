import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { MergeBucket, bevelBox, projectUV, taperLeg, trs } from '../geom';
import { PARTITIONS } from '../layout';
function wood(bucket: MergeBucket, r: Rng, mat: string, g: THREE.BufferGeometry, grain: 'x' | 'y' | 'z', m: THREE.Matrix4, k = 1) {
  projectUV(g, grain, { offset: [r.float(), r.float()] });
  bucket.add(mat, g, m, new THREE.Color(k, k, k));
}

/** 내부 칸막이 벽(+문 구멍). */
export function buildPartitions(bucket: MergeBucket, rng: Rng): void {
  const r = rng.fork('partitions');
  const t = 0.1;
  for (const p of PARTITIONS) {
    const base = trs(p.x, 0, p.z, 0, p.ry);
    const at = (m: THREE.Matrix4) => base.clone().multiply(m);
    if (!p.door) {
      const g = bevelBox(p.len, p.h, t, 0.004);
      projectUV(g, 'x', { offset: [r.float(), r.float()] });
      bucket.add('plaster', g, at(trs(0, p.h / 2, 0)));
      continue;
    }
    const { cx, w, h } = p.door;
    const left = cx - w / 2, right = cx + w / 2;
    const segments: { x0: number; x1: number; y0: number; y1: number }[] = [
      { x0: -p.len / 2, x1: left, y0: 0, y1: p.h },
      { x0: right, x1: p.len / 2, y0: 0, y1: p.h },
      { x0: left, x1: right, y0: h, y1: p.h },
    ];
    for (const s of segments) {
      const ww = s.x1 - s.x0, hh = s.y1 - s.y0;
      if (ww < 0.04 || hh < 0.04) continue;
      const g = bevelBox(ww, hh, t, 0.003);
      projectUV(g, 'x', { offset: [r.float(), r.float()] });
      bucket.add('plaster', g, at(trs((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 0)));
    }
    // 문틀 느낌
    wood(bucket, r, 'walnut', bevelBox(0.06, h, t + 0.02, 0.004), 'y', at(trs(left + 0.02, h / 2, 0)));
    wood(bucket, r, 'walnut', bevelBox(0.06, h, t + 0.02, 0.004), 'y', at(trs(right - 0.02, h / 2, 0)));
    wood(bucket, r, 'walnut', bevelBox(w, 0.06, t + 0.02, 0.004), 'x', at(trs(cx, h + 0.02, 0)));
  }
}

/**
 * 회색 윙백 1인 소파(STRANDMON 느낌, 아바타 한 명 크기). 앉은 사람은 +z.
 */
export function buildWingbackArmchair(bucket: MergeBucket, r: Rng, m0: THREE.Matrix4, scale = 1): void {
  const m = m0.clone().multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
  const at = (mm: THREE.Matrix4) => m.clone().multiply(mm);
  const fabric = (g: THREE.BufferGeometry, mm: THREE.Matrix4, k = 1) => {
    projectUV(g, 'x', { along: 0.32, across: 0.32, offset: [r.float(), r.float()] });
    bucket.add('wingback', g, mm, new THREE.Color(k, k, k));
  };
  const legH = 0.1;
  const seatH = 0.38;
  const w = 0.5;
  const d = 0.52;
  const gray = 1.0;
  const grayDeep = 0.9;

  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = taperLeg(legH, 0.022, 0.014);
    projectUV(leg, 'y', { offset: [r.float(), r.float()] });
    bucket.add('iron', leg, at(trs(sx * (w / 2 - 0.07), 0, sz * (d / 2 - 0.07))), 0x1a1a1a);
  }

  fabric(bevelBox(w - 0.03, 0.09, d - 0.08, 0.035, 4), at(trs(0, seatH - 0.06, 0.015)), gray);
  fabric(bevelBox(w - 0.08, 0.08, d - 0.12, 0.04, 5), at(trs(0, seatH + 0.015, 0.03)), 1.05);

  for (const sx of [-1, 1]) {
    fabric(bevelBox(0.08, 0.2, d - 0.12, 0.03, 4), at(trs(sx * (w / 2 - 0.05), seatH + 0.07, 0.015)), grayDeep);
    fabric(bevelBox(0.1, 0.06, 0.15, 0.028, 4), at(trs(sx * (w / 2 - 0.015), seatH + 0.19, 0.04, 0, 0, sx * 0.3)), gray);
  }

  const backZ = -d / 2 + 0.09;
  fabric(bevelBox(w - 0.1, 0.52, 0.09, 0.032, 4), at(trs(0, seatH + 0.28, backZ, -0.08)), grayDeep);
  for (const sx of [-1, 1]) {
    fabric(bevelBox(0.085, 0.3, 0.2, 0.03, 4), at(trs(sx * (w / 2 - 0.07), seatH + 0.36, backZ + 0.09, -0.05, 0, sx * 0.18)), gray);
    fabric(bevelBox(0.07, 0.14, 0.12, 0.028, 4), at(trs(sx * (w / 2 - 0.08), seatH + 0.52, backZ + 0.04, 0.12)), grayDeep);
  }
  fabric(bevelBox(w - 0.18, 0.14, 0.05, 0.025, 3), at(trs(0, seatH + 0.16, backZ + 0.05, -0.1)), 0.95);
  for (let i = 0; i < 4; i++) {
    const bx = (i - 1.5) * 0.08;
    bucket.add('iron', new THREE.SphereGeometry(0.009, 8, 6), at(trs(bx, seatH + 0.16, backZ + 0.08)), 0x2c2c2c);
  }
}

