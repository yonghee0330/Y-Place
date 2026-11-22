import assert from 'node:assert/strict';
import { applyLayout, SEATS, SPAWN, ZONE_BOUNDS, colliders, detectZone, seatApproach, zoneSpawn } from '../src/scene/layout';
import { NavGrid } from '../src/controls/pathfinding';

applyLayout('shop');
const nav = new NavGrid();
assert(nav.free(...nav.cellOf(SPAWN)), 'shop: 스폰이 막힘');

// 구역 스폰마다 통로가 열리는지
for (const z of ZONE_BOUNDS) {
  const sp = zoneSpawn(z.id);
  assert(nav.free(...nav.cellOf(sp)), `${z.id}: 구역 스폰이 막힘`);
  assert(nav.findPath(SPAWN, sp), `${z.id}: 광장→구역 스폰 경로 없음`);
  assert.equal(detectZone(sp.x, sp.z), z.id === 'shop' ? 'shop' : z.id, `${z.id}: detectZone`);
}

for (const s of SEATS) {
  const ap = seatApproach(s);
  assert(nav.free(...nav.cellOf(ap)), `${s.id}: 접근점이 가구와 겹침`);
  assert(nav.findPath(SPAWN, ap), `${s.id}: 스폰에서 경로 없음`);
  const hit = colliders().filter((c) => c.seats?.includes(s.id));
  assert.equal(hit.length, 1, `${s.id}: 클릭 상자가 중복됨`);
  assert.deepEqual(hit[0].seats, [s.id]);
}
console.log(`campus ${SEATS.length}개 좌석·${ZONE_BOUNDS.length}개 구역 스폰 경로 확인`);
