// 책방 실험실의 "이번 주 신간" 받침대. 표지가 보이게 세운 책 + 간판 + 클릭 상자.
import * as THREE from 'three';
import { Rng } from '../../core/rng';
import { featuredBooks } from '../../reader/newReleases';
import { MergeBucket, bevelBox, trs } from '../geom';
import { currentSpaceId, type SpaceId } from '../layout';
import { BookCollector, displayBook } from './books';

export interface NewReleaseHit {
  bookId: string;
  mesh: THREE.Mesh;
}

/** 공간별 받침대 자리(+z가 앞). */
const PLACES: Partial<Record<SpaceId, { x: number; z: number; ry: number }>> = {
  bookshop: { x: -2.35, z: 0.55, ry: Math.PI / 2 },
};

function plaqueTexture(title: string, sub: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f3ead8';
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = '#3a3228';
  ctx.font = '700 36px "Noto Serif KR", serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 70);
  ctx.font = '500 22px Pretendard, sans-serif';
  ctx.fillStyle = '#6a5c4c';
  ctx.fillText(sub, 256, 112);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** 활성 공간에 신간 받침대를 만든다. */
export function buildNewReleaseStand(
  bucket: MergeBucket,
  books: BookCollector,
  rng: Rng,
): { count: number; hits: NewReleaseHit[]; extras: THREE.Object3D[] } {
  const hits: NewReleaseHit[] = [];
  const extras: THREE.Object3D[] = [];
  const place = PLACES[currentSpaceId()];
  if (!place) return { count: 0, hits, extras };

  const picks = featuredBooks().slice(0, 6);
  const base = trs(place.x, 0, place.z, 0, place.ry);
  const n = Math.min(6, picks.length);
  const span = 1.55;
  const step = n <= 1 ? 0 : span / (n - 1);

  bucket.add('walnut', bevelBox(span + 0.28, 0.04, 0.28, 0.006), base.clone().multiply(trs(0, 0.92, 0.02)));
  bucket.add('walnut', bevelBox(span + 0.18, 0.78, 0.18, 0.008), base.clone().multiply(trs(0, 0.41, 0)));

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.22),
    new THREE.MeshStandardMaterial({ map: plaqueTexture('이번 주 신간', '매체 추천 · 눌러 보기'), roughness: 0.88 }),
  );
  const signM = base.clone().multiply(trs(0, 1.18, 0.12));
  const sp = new THREE.Vector3(), sq = new THREE.Quaternion(), ss = new THREE.Vector3();
  signM.decompose(sp, sq, ss);
  sign.position.copy(sp);
  sign.quaternion.copy(sq);
  sign.name = 'new-release:sign';
  extras.push(sign);

  const r = rng.fork('new-release');
  for (let i = 0; i < n; i++) {
    const x = -span / 2 + i * step;
    const m = base.clone().multiply(trs(x, 0.94, 0.04));
    displayBook(m, r.fork(`b${i}`), books, bucket);
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.34, 0.18),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    const local = m.clone().multiply(trs(0, 0.14, 0.03));
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    local.decompose(p, q, s);
    hit.position.copy(p);
    hit.quaternion.copy(q);
    hit.userData.newReleaseId = picks[i].id;
    hits.push({ bookId: picks[i].id, mesh: hit });
  }

  const signHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.28, 0.1),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  signHit.position.copy(sp);
  signHit.quaternion.copy(sq);
  signHit.userData.newReleaseId = '*';
  hits.push({ bookId: '*', mesh: signHit });

  return { count: n, hits, extras };
}
