// 말 걸 수 있는 NPC: 로비 바리스타·모임방 모임지기. 가까이 가면 대화할 수 있고,
// 근처에 있는 동안 고개(몸)를 방문자 쪽으로 돌린다.
import * as THREE from 'three';
import type { TalkNpcId } from '../net/npcChat';
import type { SpaceId } from '../scene/layout';
import type { Actor, Crowd } from './crowd';

export interface TalkNpcDef {
  id: TalkNpcId;
  name: string;
  space: SpaceId;
  x: number;
  z: number;
  ry: number;
  color: string;
  hair: 'bangs' | 'bob' | 'short';
}

export const TALK_NPCS: TalkNpcDef[] = [
  // 커피 코너 앞, 방 안쪽을 보고 선다
  { id: 'barista', name: '바리스타 모카', space: 'shop', x: -4.1, z: 0.95, ry: Math.PI / 2, color: '#6b4a32', hair: 'bob' },
  // 모임방 서가 옆, 테이블을 본다
  { id: 'host', name: '모임지기 소담', space: 'circle', x: 0.95, z: -1.55, ry: Math.atan2(-0.95, 1.55), color: '#5b8a5a', hair: 'short' },
];

/** 대화 버튼이 뜨는 거리(m) */
export const TALK_RANGE = 1.7;
/** 대화 중 이보다 멀어지면 창을 닫는다 */
export const TALK_LEAVE = 2.6;

export interface TalkNpc {
  def: TalkNpcDef;
  actor: Actor;
}

export function spawnTalkNpcs(crowd: Crowd): TalkNpc[] {
  return TALK_NPCS.map((def) => {
    const actor = crowd.add(`talk-${def.id}`, 'npc', def.name, { color: def.color, hair: def.hair }, true);
    actor.root.position.set(def.x, 0, def.z);
    actor.root.rotation.y = def.ry;
    actor.setState('stand', null);
    actor.root.visible = false;
    actor.root.userData.talkNpc = def.id;
    return { def, actor };
  });
}

export function syncTalkNpcs(list: TalkNpc[], space: SpaceId, enabled: boolean): void {
  for (const n of list) n.actor.root.visible = enabled && n.def.space === space;
}

const angleTo = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

/** 가장 가까운 대화 가능 NPC(범위 안)와, 근처에 있으면 방문자 쪽으로 돌아보기. */
export function updateTalkNpcs(list: TalkNpc[], me: THREE.Vector3, dt: number, talkingTo: TalkNpcId | null): TalkNpc | null {
  let best: TalkNpc | null = null;
  let bestD = TALK_RANGE;
  const k = 1 - Math.exp(-4 * dt);
  for (const n of list) {
    const r = n.actor.root;
    if (!r.visible) continue;
    const d = Math.hypot(me.x - r.position.x, me.z - r.position.z);
    const look = d < 3 || talkingTo === n.def.id;
    const target = look ? Math.atan2(me.x - r.position.x, me.z - r.position.z) : n.def.ry;
    r.rotation.y = angleTo(r.rotation.y, target, k);
    if (d < bestD) { best = n; bestD = d; }
  }
  return best;
}

/** NPC를 눌렀을 때 걸어갈 자리: NPC 앞 0.9m(방문자 쪽) */
export function talkSpot(n: TalkNpc, me: THREE.Vector3): { x: number; z: number } {
  const p = n.actor.root.position;
  const dx = me.x - p.x, dz = me.z - p.z;
  const d = Math.hypot(dx, dz) || 1;
  const f = Math.min(0.9, d);
  return { x: p.x + (dx / d) * f, z: p.z + (dz / d) * f };
}
