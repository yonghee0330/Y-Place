// NPC 대화 어댑터: 브라우저 → NPC 대화 Worker(Claude) → 답.
// 주소가 없거나 실패·한도 초과면 브라우저 안의 짧은 안내 답으로 내려간다(콘솔 오류 없음).
// 대화 내용은 이 탭의 메모리에만 두고 저장하지 않는다.

export type TalkNpcId = 'barista' | 'host';
export interface ChatTurn { role: 'user' | 'assistant'; content: string }
export interface NpcReply { text: string; source: 'ai' | 'local' }

const MAX_TURNS = 12;
const MAX_CHARS = 300;
const TIMEOUT_MS = 20_000;

function endpoint(): string | null {
  const q = new URLSearchParams(location.search).get('npcchat');
  if (q === 'local') return null;
  const url = (import.meta.env.VITE_NPC_CHAT_URL as string | undefined)?.trim();
  return url ? url.replace(/\/+$/, '') + '/chat' : null;
}

export function npcChatIsAi(): boolean {
  return endpoint() !== null;
}

/** 서버로 보낼 최근 대화(첫 줄은 방문자 말로 맞춘다) */
function trimHistory(history: ChatTurn[]): ChatTurn[] {
  let h = history.slice(-MAX_TURNS).map((t) => ({ role: t.role, content: t.content.slice(0, MAX_CHARS) }));
  while (h.length && h[0].role !== 'user') h = h.slice(1);
  return h;
}

export async function askNpc(npc: TalkNpcId, history: ChatTurn[]): Promise<NpcReply> {
  const url = endpoint();
  const last = history[history.length - 1]?.content ?? '';
  if (!url) return { text: localReply(npc, last), source: 'local' };
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ npc, messages: trimHistory(history) }),
      signal: ctrl.signal,
    });
    if (res.status === 429) return { text: '지금은 이야기 나누는 분이 많아요. 조금 있다가 다시 말 걸어 주세요.', source: 'local' };
    if (!res.ok) return { text: localReply(npc, last), source: 'local' };
    const data = (await res.json()) as { reply?: unknown };
    if (typeof data.reply !== 'string' || !data.reply.trim()) return { text: localReply(npc, last), source: 'local' };
    return { text: data.reply.trim(), source: 'ai' };
  } catch {
    return { text: localReply(npc, last), source: 'local' };
  } finally {
    window.clearTimeout(timer);
  }
}

/** 서버가 없을 때의 짧은 안내 답(키워드). */
export function localReply(npc: TalkNpcId, q: string): string {
  const s = q.replace(/\s+/g, '');
  const has = (...k: string[]) => k.some((w) => s.includes(w));
  if (has('커피', '음료', '녹차', '홍차', '찻', '마시', '목말')) return '아래 "음료" 버튼을 누르면 물·커피·차를 골라 마시는 동작을 할 수 있어요. 진짜 커피는 못 드려서 아쉬워요.';
  if (has('작업실', '작업', '집중', '타이머')) return '라운지 오른쪽 벽의 "개인 작업실" 문으로 들어가 1~4번 방을 고르면 돼요. 한 방에 한 명이고, 타이머와 집중 모드를 쓸 수 있어요.';
  if (has('모임방', '모임')) return '라운지 뒤쪽 "작은 모임방" 문으로 가면 둥근 테이블이 있는 방이 나와요. 여섯 명까지 함께 있을 수 있어요.';
  if (has('앉', '의자', '소파', '안마')) return '의자나 소파를 누르면 빈 자리로 걸어가서 앉아요. 라운지 창가에는 안마 의자도 두 개 있어요.';
  if (has('책', '읽')) return '"책 펼치기"로 읽는 책 제목을 머리 위에 띄울 수 있고, "읽기 모드"를 켜면 집중해서 읽는 화면이 돼요.';
  if (has('이동', '걷', '움직', '조작', '시점', '카메라')) return '바닥을 누르면 걸어가고, 화면을 드래그하면 시점이 돌아요. Q·E 키로도 돌릴 수 있어요.';
  // 인사만 했을 때
  if (has('안녕', '반가', '처음')) {
    return npc === 'barista'
      ? '어서 오세요, 모카예요. 편하게 쉬다 가세요. 공간이나 조작이 궁금하면 물어봐 주세요.'
      : '반가워요, 모임지기 소담이에요. 여기는 둘러앉아 이야기하는 작은 방이에요.';
  }
  return npc === 'barista'
    ? '지금은 깊은 이야기는 어렵지만, 공간·자리·음료·작업실 이야기는 안내해 드릴 수 있어요.'
    : '지금은 짧은 안내만 할 수 있어요. 모임방이나 책 읽는 법이 궁금하면 물어봐 주세요.';
}
