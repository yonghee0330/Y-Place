// 말 걸 수 있는 NPC: 캠퍼스 구역마다 역할이 다른 안내인.
// 가까이 가면 대화할 수 있고, 근처에 있는 동안 고개(몸)를 방문자 쪽으로 돌린다.
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
  // 광장 커피 코너
  { id: 'barista', name: '바리스타 모카', space: 'shop', x: -2.9, z: 1.85, ry: Math.PI / 2, color: '#6b4a32', hair: 'bob' },
  // 광장 가운데를 보는 연구자
  { id: 'researcher', name: '실험 연구자 하랑', space: 'shop', x: 2.4, z: -0.8, ry: Math.atan2(-2.4, 2.5), color: '#3f6f8f', hair: 'short' },
  // 책방 매대 앞
  { id: 'bookseller', name: '책방 실험자 서진', space: 'bookshop', x: -8.0, z: -4.2, ry: Math.atan2(0.2, 1.2), color: '#a0553a', hair: 'bangs' },
  // 책방 서가 쪽(옛 서재 큐레이터 → 책방 구역)
  { id: 'curator', name: '책 큐레이터 고요', space: 'bookshop', x: -6.2, z: -5.8, ry: Math.atan2(-1.5, 1.2), color: '#4a5a7a', hair: 'bob' },
  // 모임 원탁 옆
  { id: 'host', name: '모임 기획자 소담', space: 'circle', x: -7.1, z: -0.2, ry: Math.atan2(-1.1, 1.4), color: '#5b8a5a', hair: 'short' },
  // 전시 작품 앞
  { id: 'docent', name: '전시 큐레이터 윤슬', space: 'gallery', x: -0.6, z: -5.8, ry: Math.atan2(-0.4, 2.2), color: '#2f3340', hair: 'bob' },
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

/** 한 캠퍼스라 구역과 관계없이 모두 보이게 한다. */
export function syncTalkNpcs(list: TalkNpc[], _space: SpaceId, enabled: boolean): void {
  for (const n of list) n.actor.root.visible = enabled;
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
