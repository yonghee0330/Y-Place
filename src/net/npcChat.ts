// NPC 대화 어댑터: 브라우저 → NPC 대화 Worker(Claude) → 답.
// 주소가 없거나 실패·한도 초과면 브라우저 안의 짧은 안내 답으로 내려간다(콘솔 오류 없음).
// 대화 내용은 이 탭의 메모리에만 두고 저장하지 않는다.

export type TalkNpcId = 'barista' | 'researcher' | 'bookseller' | 'curator' | 'host' | 'docent';
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
  if (has('작업실', '작업', '집중', '타이머')) return '로비 오른쪽 벽 맨 앞의 "개인 작업실" 문으로 들어가 1~4번 방을 고르면 돼요. 한 방에 한 명이고, 타이머와 집중 모드를 쓸 수 있어요.';
  if (has('모임방', '모임')) return '로비 오른쪽 벽 가운데 "작은 모임방" 문으로 가면 둥근 테이블이 있는 방이 나와요. 여섯 명까지 함께 있을 수 있어요.';
  if (has('앉', '의자', '소파', '안마')) return '의자나 소파를 누르면 빈 자리로 걸어가서 앉아요. 로비 창가에는 안마 의자도 두 개 있어요.';
  if (has('전시', '작품', '그림')) return '로비 뒷벽 오른쪽 "전시실" 문으로 가면 작품 여덟 점과 조형물이 있어요. 가운데 벤치에 앉아 천천히 보셔도 돼요.';
  if (has('책방', '매대', '서점')) return '로비 뒷벽 왼쪽 "책방 실험실" 문으로 가면 서가와 매대가 있는 책방이 나와요.';
  if (has('서재', '조용', '열람')) return '로비 오른쪽 벽 첫 번째 "서재" 문으로 가면 긴 열람 테이블이 있는 조용한 방이 나와요.';
  if (has('방', '어디', '공간', '구경')) return '여기는 메타공간 실험실이에요. 로비에서 책방 실험실·전시실(뒷벽), 서재·작은 모임방·개인 작업실(오른쪽 벽)로 갈 수 있어요. 위쪽 "공간" 버튼으로도 옮길 수 있어요.';
  if (has('아이디어', '추천', '사례', '기획', '해볼', '해 볼', '할수', '할 수', '뭘', '무엇')) return ROLE_TIP[npc];
  if (has('책', '읽')) return '"책 펼치기"로 읽는 책 제목을 머리 위에 띄울 수 있고, "읽기 모드"를 켜면 집중해서 읽는 화면이 돼요.';
  if (has('이동', '걷', '움직', '조작', '시점', '카메라')) return '바닥을 누르면 걸어가고, 화면을 드래그하면 시점이 돌아요. Q·E 키로도 돌릴 수 있어요.';
  if (has('안녕', '반가', '처음')) return ROLE_HELLO[npc];
  return ROLE_FALLBACK[npc];
}

/** 서버 없이도 역할이 드러나도록: 인사·아이디어 질문·모르는 질문 답 */
const ROLE_HELLO: Record<TalkNpcId, string> = {
  barista: '어서 오세요, 모카예요. 편하게 쉬다 가세요. 공간이나 조작이 궁금하면 물어봐 주세요.',
  researcher: '안녕하세요, 하랑이에요. 여기는 책방·서재·모임·전시를 방마다 나눠 시험해 보는 실험실이에요.',
  bookseller: '어서 오세요, 서진이에요. 이 방은 가상공간에서 책방이 할 수 있는 일을 시험하는 곳이에요.',
  curator: '반가워요, 고요예요. 서재에서는 책을 고르고 묶어 소개하는 방법을 궁리해요.',
  host: '반가워요, 소담이에요. 둥근 테이블에 둘러앉는 작은 모임을 기획하고 있어요.',
  docent: '어서 오세요, 윤슬이에요. 벽에 걸린 여덟 점은 실험용 그림이고, 가운데 벤치에서 천천히 보셔도 돼요.',
};
const ROLE_TIP: Record<TalkNpcId, string> = {
  barista: '로비에서는 쉬어 가는 자리를 시험하고 있어요. 안마 의자나 소파에 앉아 보세요.',
  researcher: '방마다 하나씩 시험해요. 책방에서는 진열, 서재에서는 큐레이션, 모임방에서는 둘러앉기, 전시실에서는 작품 보기예요. 궁금한 방부터 들어가 보세요.',
  bookseller: '지금은 "책 펼치기"로 읽는 책 제목을 머리 위에 띄워 서로 무슨 책을 읽는지 볼 수 있어요. 주제 매대나 추천 쪽지는 아직 없지만 시험해 볼 만한 아이디어예요.',
  curator: '한 주제로 서너 권을 묶고, 왜 묶었는지 한 줄을 붙이는 게 큐레이션의 시작이에요. 서가 한 칸을 주제 하나로 생각해 보세요.',
  host: '처음엔 다섯 명 이하, 한 시간, 질문 하나로 시작하는 모임이 꾸리기 쉬워요. 이 방 원탁이 딱 다섯 자리예요.',
  docent: '전시는 제목 하나와 작품 순서로 이야기를 만들어요. 이 방은 뒷벽에서 시작해 옆벽으로 돌아 나오는 순서예요.',
};
const ROLE_FALLBACK: Record<TalkNpcId, string> = {
  barista: '지금은 깊은 이야기는 어렵지만, 방 위치·자리·음료·작업실 이야기는 안내해 드릴 수 있어요.',
  researcher: '지금은 짧은 안내만 할 수 있어요. 어떤 방에서 무엇을 시험하는지 물어봐 주세요.',
  bookseller: '지금은 짧은 안내만 할 수 있어요. 가상 책방 아이디어가 궁금하면 물어봐 주세요.',
  curator: '지금은 짧은 안내만 할 수 있어요. 책 큐레이션 방법이 궁금하면 물어봐 주세요.',
  host: '지금은 짧은 안내만 할 수 있어요. 모임 아이디어나 꾸리는 법이 궁금하면 물어봐 주세요.',
  docent: '지금은 짧은 안내만 할 수 있어요. 작품이나 전시 기획이 궁금하면 물어봐 주세요.',
};
