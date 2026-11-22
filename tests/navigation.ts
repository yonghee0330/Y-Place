import assert from 'node:assert/strict';
import {applyLayout,SPACE_ORDER,SPAWN,SEATS,seatApproach,colliders} from '../src/scene/layout';
import {NavGrid} from '../src/controls/pathfinding';
for(const id of SPACE_ORDER){
 applyLayout(id);const nav=new NavGrid();
 assert(nav.free(...nav.cellOf(SPAWN)),`${id}: 스폰이 막힘`);
 for(const s of SEATS){
  const ap=seatApproach(s);
  assert(nav.free(...nav.cellOf(ap)),`${id}/${s.id}: 접근점이 가구와 겹침`);
  assert(nav.findPath(SPAWN,ap),`${id}/${s.id}: 스폰에서 경로 없음`);
  const hit=colliders().filter(c=>c.seats?.includes(s.id));
  assert.equal(hit.length,1,`${s.id}: 클릭 상자가 중복됨`);
  assert.deepEqual(hit[0].seats,[s.id]);
  for(const other of SEATS)assert(nav.findPath(ap,seatApproach(other)),`${s.id}→${other.id}: 경로 없음`);
 }
 console.log(id,`${SEATS.length}개 좌석 접근점·상자·모든 좌석 간 경로 확인`);
}
