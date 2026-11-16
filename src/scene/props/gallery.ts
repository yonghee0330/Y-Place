// 전시실: 벽 작품(시드로 그리는 추상화 + 액자 + 작은 명판 + 작품등)과 받침대 위 조형물.
// 작품 그림은 나중에 운영자 이미지·생성 이미지로 바꿔 끼울 수 있게 작품마다 따로 텍스처를 쓴다.
import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { MergeBucket, bevelBox, trs } from '../geom';
import { EXHIBITS, PEDESTALS } from '../layout';

const PALETTES = [
  ['#e9dcc4', '#c4724f', '#2f4a4a', '#d9a441', '#8aa39b'],
  ['#f1e8d8', '#3b5a7a', '#c95f4a', '#e6c27a', '#24251f'],
  ['#efe6d6', '#6b7b3a', '#b88061', '#365d5a', '#dfc39d'],
  ['#f4efe6', '#8a5a9e', '#e0a53b', '#3f6e8c', '#c9583e'],
];

function paintArt(seed: number, w: number, h: number): THREE.CanvasTexture {
  const r = new Rng(seed);
  const W = 512, H = Math.round((512 * h) / w);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d')!;
  const pal = PALETTES[seed % PALETTES.length];
  c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
  const style = seed % 3;
  if (style === 0) {
    // 색면: 겹친 사각 면과 가는 선
    for (let i = 0; i < 6; i++) {
      c.globalAlpha = 0.75 + r.range(0, 0.25);
      c.fillStyle = pal[1 + (i % 4)];
      c.fillRect(r.range(0, W * 0.6), r.range(0, H * 0.6), r.range(W * 0.15, W * 0.5), r.range(H * 0.12, H * 0.45));
    }
    c.globalAlpha = 1; c.strokeStyle = pal[4]; c.lineWidth = 3;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0, r.range(0, H)); c.lineTo(W, r.range(0, H)); c.stroke(); }
  } else if (style === 1) {
    // 원과 호
    for (let i = 0; i < 9; i++) {
      c.globalAlpha = 0.7;
      c.fillStyle = pal[1 + (i % 4)];
      c.beginPath(); c.arc(r.range(0, W), r.range(0, H), r.range(20, W * 0.28), 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1; c.strokeStyle = pal[2]; c.lineWidth = 6;
    c.beginPath(); c.arc(W * 0.5, H * 0.55, W * 0.3, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  } else {
    // 줄무늬 리듬(서가처럼)
    let x = 0;
    while (x < W) {
      const bw = r.range(8, 46);
      c.fillStyle = pal[1 + r.int(0, 3)];
      const top = r.range(H * 0.15, H * 0.4);
      c.fillRect(x, top, bw - 3, H - top - H * 0.12);
      x += bw;
    }
    c.fillStyle = pal[4]; c.fillRect(0, H * 0.88, W, 5);
  }
  // 캔버스 결
  c.globalAlpha = 0.06; c.fillStyle = '#000';
  for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
  c.globalAlpha = 1;
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function plaqueTexture(title: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 160;
  const paint = () => {
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#f6f1e7'; c.fillRect(0, 0, 512, 160);
    c.fillStyle = '#2b2a24';
    c.font = '600 34px "Pretendard Variable", Pretendard, sans-serif';
    c.fillText(title.split(' · ')[0] ?? title, 28, 62);
    c.font = '400 30px "Noto Serif KR", serif';
    c.fillText(title.split(' · ')[1] ?? '', 28, 116);
  };
  paint();
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  void document.fonts.ready.then(() => { paint(); t.needsUpdate = true; });
  return t;
}

/** 작품 그림·명판(개별 메시)을 담은 그룹. 액자·작품등·받침대는 병합 버킷에 넣는다. */
export function buildGallery(bucket: MergeBucket, rng: Rng): THREE.Group {
  const group = new THREE.Group();
  group.name = 'gallery-art';
  for (const e of EXHIBITS) {
    const base = trs(e.x, e.y, e.z, 0, e.ry);
    const at = (m: THREE.Matrix4) => base.clone().multiply(m);
    // 액자: 바깥 나무 틀 + 흰 매트
    const fw = 0.05;
    bucket.add('walnut', bevelBox(e.w + fw * 2, fw, 0.05, 0.008), at(trs(0, e.h / 2 + fw / 2, 0.025)));
    bucket.add('walnut', bevelBox(e.w + fw * 2, fw, 0.05, 0.008), at(trs(0, -e.h / 2 - fw / 2, 0.025)));
    bucket.add('walnut', bevelBox(fw, e.h, 0.05, 0.008), at(trs(-e.w / 2 - fw / 2, 0, 0.025)));
    bucket.add('walnut', bevelBox(fw, e.h, 0.05, 0.008), at(trs(e.w / 2 + fw / 2, 0, 0.025)));
    bucket.add('paper', bevelBox(e.w, e.h, 0.012, 0.002), at(trs(0, 0, 0.012)));
    // 작품등: 위쪽 황동 팔과 갓
    bucket.add('brass', new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8).rotateX(Math.PI / 2), at(trs(0, e.h / 2 + 0.16, 0.11)));
    bucket.add('brass', new THREE.CylinderGeometry(0.022, 0.03, Math.min(0.5, e.w * 0.45), 16, 1, true).rotateZ(Math.PI / 2), at(trs(0, e.h / 2 + 0.16, 0.22)));
    // 그림(매트 안쪽)
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(e.w - 0.1, e.h - 0.1),
      new THREE.MeshStandardMaterial({ map: paintArt(e.seed, e.w, e.h), roughness: 0.85 }),
    );
    art.applyMatrix4(at(trs(0, 0, 0.0195)));
    art.name = `exhibit:${e.seed}`;
    group.add(art);
    // 명판(오른쪽 아래)
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.075),
      new THREE.MeshStandardMaterial({ map: plaqueTexture(e.title), roughness: 0.9 }),
    );
    plaque.applyMatrix4(at(trs(e.w / 2 + fw + 0.18, -e.h / 2 + 0.04, 0.006)));
    group.add(plaque);
  }
  PEDESTALS.forEach((p, i) => {
    const r = rng.fork(`pedestal-${i}`);
    const at = (m: THREE.Matrix4) => trs(p.x, 0, p.z, 0, r.range(-0.3, 0.3)).multiply(m);
    bucket.add('plaster', bevelBox(0.44, 0.95, 0.44, 0.01, 2), at(trs(0, 0.475, 0)));
    bucket.add('walnut', bevelBox(0.48, 0.03, 0.48, 0.006), at(trs(0, 0.965, 0)));
    if (p.kind === 'knot') {
      bucket.add('brass', new THREE.TorusKnotGeometry(0.11, 0.032, 120, 14, 2, 3), at(trs(0, 1.13, 0)));
    } else if (p.kind === 'stack') {
      for (let k = 0; k < 4; k++) {
        const s = 0.12 - k * 0.022;
        bucket.add(k % 2 ? 'terracotta' : 'ceramic', new THREE.SphereGeometry(s, 24, 16), at(trs(0, 0.98 + 0.1 + k * 0.17 - (0.12 - s), 0)));
      }
    } else {
      bucket.add('iron', new THREE.TorusGeometry(0.14, 0.018, 12, 48), at(trs(0, 1.16, 0)));
      bucket.add('brass', new THREE.TorusGeometry(0.1, 0.014, 12, 48), at(trs(0, 1.16, 0, Math.PI / 2, 0)));
    }
  });
  return group;
}
