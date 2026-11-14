// 안마 의자: 받침, 좌우 몸통(팔걸이·손 넣는 홈), 뒤로 기운 등받이 쿠션 3단, 머리 베개, 어깨 날개,
// 종아리 받침(다리 홈 2개), 발 받침, 리모컨. 원점은 바닥 중앙(엉덩이 아래), 앉은 사람은 +z를 본다.
import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { MergeBucket, bevelBox, projectUV, trs } from '../geom';
import { MASSAGE_CHAIRS } from '../layout';

/** 앉는 높이(좌석 쿠션 윗면). 레이아웃의 좌석 y와 맞춘다. */
export const MASSAGE_SEAT_Y = 0.43;

export function buildMassageChairs(bucket: MergeBucket, rng: Rng): void {
  MASSAGE_CHAIRS.forEach((c, i) => buildMassageChair(bucket, rng.fork(`massage-${i}`), trs(c.x, 0, c.z, 0, c.ry)));
}

export function buildMassageChair(bucket: MergeBucket, r: Rng, m0: THREE.Matrix4): void {
  const at = (m: THREE.Matrix4) => m0.clone().multiply(m);
  const k = 1 + r.range(-0.04, 0.04);
  const shell = (g: THREE.BufferGeometry, m: THREE.Matrix4, t = 1) => bucket.add('massageShell', g, at(m), new THREE.Color(t * k, t * k, t * k));
  const leather = (g: THREE.BufferGeometry, m: THREE.Matrix4, t = 1) => {
    projectUV(g, 'x', { along: 0.3, across: 0.3, offset: [r.float(), r.float()] });
    bucket.add('massageLeather', g, at(m), new THREE.Color(t, t, t));
  };
  const dark = (g: THREE.BufferGeometry, m: THREE.Matrix4) => bucket.add('massageDark', g, at(m));

  // 받침(바닥에서 살짝 뜬 어두운 굽)
  dark(bevelBox(0.6, 0.07, 0.92, 0.02, 3), trs(0, 0.035, 0));
  dark(bevelBox(0.5, 0.05, 0.3, 0.02, 3), trs(0, 0.025, 0.58));

  // 좌우 몸통: 아래는 둥근 껍데기, 위는 팔걸이
  for (const sx of [-1, 1]) {
    shell(bevelBox(0.15, 0.46, 0.98, 0.065, 5), trs(sx * 0.345, 0.31, 0.0));
    // 앞쪽으로 갈수록 낮아지는 덮개
    shell(bevelBox(0.15, 0.2, 0.42, 0.06, 5), trs(sx * 0.345, 0.5, 0.3, 0.12), 1.04);
    // 팔걸이 패드
    leather(bevelBox(0.125, 0.06, 0.56, 0.028, 4), trs(sx * 0.345, 0.635, 0.08, 0.05), 1.02);
    // 손·팔뚝 넣는 홈(패드 위의 어두운 U자 홈)
    dark(bevelBox(0.085, 0.03, 0.3, 0.012, 3), trs(sx * 0.345, 0.662, 0.17, 0.05));
    for (const e of [-1, 1]) leather(bevelBox(0.018, 0.045, 0.3, 0.008, 2), trs(sx * 0.345 + e * 0.052, 0.675, 0.17, 0.05), 0.92);
    // 옆면 장식 띠(황동)와 바퀴 덮개
    bucket.add('brass', bevelBox(0.008, 0.03, 0.72, 0.003, 1), at(trs(sx * 0.423, 0.36, 0.0)));
    dark(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20).rotateZ(Math.PI / 2), trs(sx * 0.41, 0.085, -0.36));
    // 어깨 날개(등받이 옆에서 어깨를 감싼다)
    shell(bevelBox(0.11, 0.36, 0.26, 0.05, 4), trs(sx * 0.3, 0.9, -0.36, -0.36, 0, sx * 0.06), 1.02);
    dark(bevelBox(0.03, 0.22, 0.14, 0.012, 2), trs(sx * 0.245, 0.9, -0.33, -0.36));
  }

  // 뒤쪽 껍데기(등받이를 받치는 둥근 몸체)
  shell(bevelBox(0.62, 0.86, 0.2, 0.09, 5), trs(0, 0.7, -0.5, -0.36), 0.97);
  shell(bevelBox(0.5, 0.3, 0.24, 0.09, 5), trs(0, 0.3, -0.46), 0.94);

  // 좌석 쿠션
  leather(bevelBox(0.52, 0.13, 0.5, 0.055, 5), trs(0, MASSAGE_SEAT_Y - 0.065, 0.07));
  dark(bevelBox(0.5, 0.012, 0.02, 0.004, 1), trs(0, MASSAGE_SEAT_Y - 0.004, -0.02));

  // 등받이 쿠션 3단(뒤로 21도쯤 기울어짐) + 가운데 세로 박음선
  const tilt = -0.36;
  for (let i = 0; i < 3; i++) {
    const along = 0.14 + i * 0.235;
    const y = MASSAGE_SEAT_Y + 0.02 + Math.cos(tilt) * along;
    const z = -0.2 + Math.sin(tilt) * along;
    leather(bevelBox(0.47, 0.225, 0.1, 0.045, 5), trs(0, y, z, tilt), 1 + (i - 1) * 0.02);
    dark(bevelBox(0.012, 0.19, 0.012, 0.004, 1), trs(0, y + 0.018, z + 0.048, tilt));
  }
  // 머리 베개
  const hy = MASSAGE_SEAT_Y + 0.02 + Math.cos(tilt) * 0.8;
  const hz = -0.2 + Math.sin(tilt) * 0.8 + 0.035;
  leather(bevelBox(0.3, 0.15, 0.085, 0.04, 5), trs(0, hy, hz, tilt), 1.18);
  // 머리 위 덮개
  shell(bevelBox(0.44, 0.09, 0.16, 0.04, 4), trs(0, hy + 0.085, hz - 0.085, tilt), 1.03);

  // 종아리 받침: 좌석 앞에서 아래·앞으로 뻗는다. 다리 홈 2개와 가운데 칸막이
  const cr = -0.5;
  shell(bevelBox(0.54, 0.44, 0.17, 0.06, 5), trs(0, 0.2, 0.44, cr), 0.98);
  for (const sx of [-1, 1]) {
    dark(bevelBox(0.17, 0.36, 0.05, 0.02, 3), trs(sx * 0.125, 0.235, 0.515, cr));
    leather(bevelBox(0.03, 0.38, 0.09, 0.014, 3), trs(sx * 0.235, 0.24, 0.525, cr), 0.95);
  }
  leather(bevelBox(0.05, 0.38, 0.09, 0.016, 3), trs(0, 0.24, 0.525, cr), 0.95);
  // 발 받침
  shell(bevelBox(0.54, 0.11, 0.26, 0.045, 4), trs(0, 0.085, 0.69, 0.12));
  for (const sx of [-1, 1]) dark(bevelBox(0.17, 0.03, 0.2, 0.012, 2), trs(sx * 0.125, 0.14, 0.69, 0.12));

  // 리모컨(오른팔 걸이 옆 거치대)
  dark(bevelBox(0.02, 0.2, 0.02, 0.006, 1), trs(0.43, 0.6, 0.26, 0.25));
  dark(bevelBox(0.05, 0.022, 0.13, 0.008, 2), trs(0.435, 0.715, 0.3, 0.55));
  bucket.add('paper', bevelBox(0.036, 0.004, 0.05, 0.001, 1), at(trs(0.435, 0.733, 0.322, 0.55)), 0xbfd6cf);
}
