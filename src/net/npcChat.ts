// NPC 대화 어댑터: 브라우저 → NPC 대화 Worker(Claude) → 답.
// 주소가 없거나 실패·한도 초과면 브라우저 안의 짧은 안내 답으로 내려간다(콘솔 오류 없음).
// 대화 내용은 이 탭의 메모리에만 두고 저장하지 않는다.
// 장면 맥락(인원·읽는 책·날씨·자리)은 닉네임·공개 제목만 보내고, 그 밖의 개인정보는 넣지 않는다.
import { CURRENT_WEEK, suggestNewReleases } from '../reader/newReleases';

export type TalkNpcId = 'barista' | 'researcher' | 'bookseller' | 'curator' | 'host' | 'docent';
export interface ChatTurn { role: 'user' | 'assistant'; content: string }
export interface NpcReply { text: string; source: 'ai' | 'local' }

/** NPC에게 넘기는 "지금 이 순간" 장면 정보(공개 가능한 것만). */
export interface NpcSceneContext {
  space: string;
  visitorCount: number;
  capacity: number;
  weather: string;
  timeOfDay: string;
  myNickname: string;
  mySeat: string | null;
  myBook: string | null;
  readers: { nickname: string; title: string }[];
  /** 이번 주 신간 제안 요약(이미 문단으로 정리된 문자열) */
  newReleases?: string | null;
}

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

/** 자리 id → 사람이 읽는 이름. 모르는 id는 그냥 "자리". */
export function seatLabelKo(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.startsWith('massage-')) return `창가 안마 의자 ${id.slice(-1)}`;
  if (id.startsWith('sofa-')) return `초록 소파 ${id.slice(-1)}번`;
  if (id.startsWith('bench-')) return `벤치 ${id.slice(-1)}번`;
  if (id.startsWith('cafe-')) return '카페 테이블 의자';
  if (id.startsWith('arm-')) return '안락의자';
  if (id.startsWith('chair-')) return `열람 테이블 의자 ${id.slice(-1)}`;
  if (id.startsWith('circle-')) return `원탁 ${id.slice(-1)}번`;
  if (id === 'desk-1') return '책상 의자';
  if (id.startsWith('bar-') || id.startsWith('counter-')) return '카운터 스툴';
  return '자리';
}

export function dayPhaseLabelKo(phase: 'morning' | 'day' | 'sunset' | 'night'): string {
  if (phase === 'morning') return '아침';
  if (phase === 'sunset') return '해질녘';
  if (phase === 'night') return '밤';
  return '낮';
}

/** 서버·로컬 안내에 쓰기 전에 길이·개수를 자른다. */
export function sanitizeSceneContext(raw: NpcSceneContext | null | undefined): NpcSceneContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const space = clip(raw.space, 40);
  const weather = clip(raw.weather, 40);
  const timeOfDay = clip(raw.timeOfDay, 10);
  const myNickname = clip(raw.myNickname, 20);
  if (!space || !weather || !timeOfDay || !myNickname) return null;
  const visitorCount = Math.max(1, Math.min(20, Math.floor(Number(raw.visitorCount) || 1)));
  const capacity = Math.max(1, Math.min(20, Math.floor(Number(raw.capacity) || visitorCount)));
  const mySeat = raw.mySeat == null ? null : clip(raw.mySeat, 40) || null;
  const myBook = raw.myBook == null ? null : clip(raw.myBook, 120) || null;
  const readers: { nickname: string; title: string }[] = [];
  if (Array.isArray(raw.readers)) {
    for (const r of raw.readers.slice(0, 12)) {
      if (!r || typeof r !== 'object') continue;
      const nickname = clip((r as { nickname?: unknown }).nickname, 20);
      const title = clip((r as { title?: unknown }).title, 120);
      if (nickname && title) readers.push({ nickname, title });
    }
  }
  const newReleases = typeof raw.newReleases === 'string' ? raw.newReleases.trim().slice(0, 2200) || null : null;
  return { space, visitorCount, capacity, weather, timeOfDay, myNickname, mySeat, myBook, readers, newReleases };
}

/** Claude·로컬 안내용 짧은 문단. */
export function formatSceneContext(ctx: NpcSceneContext): string {
  const lines = [
    `[지금 이 순간]`,
    `- 방: ${ctx.space} (지금 ${ctx.visitorCount}명 / 정원 ${ctx.capacity}명)`,
    `- 날씨·시간: ${ctx.weather}, ${ctx.timeOfDay}`,
    `- 이 방문자: 닉네임 "${ctx.myNickname}"` +
      (ctx.mySeat ? `, ${ctx.mySeat}에 앉아 있음` : ', 서 있음') +
      (ctx.myBook ? `, 읽는 책 "${ctx.myBook}"` : ''),
  ];
  if (ctx.readers.length) {
    lines.push(`- 지금 책 펼친 사람: ${ctx.readers.map((r) => `${r.nickname}「${r.title}」`).join(', ')}`);
  } else {
    lines.push('- 지금 책 펼친 사람: 없음');
  }
  if (ctx.newReleases?.trim()) lines.push(ctx.newReleases.trim());
  lines.push('- 위 내용만 사실로 쓰고, 없는 사람·책·개인정보는 지어내지 않는다.');
  return lines.join('\n');
}

/** 서버로 보낼 최근 대화(첫 줄은 방문자 말로 맞춘다) */
function trimHistory(history: ChatTurn[]): ChatTurn[] {
  let h = history.slice(-MAX_TURNS).map((t) => ({ role: t.role, content: t.content.slice(0, MAX_CHARS) }));
  while (h.length && h[0].role !== 'user') h = h.slice(1);
  return h;
}

export async function askNpc(
  npc: TalkNpcId,
  history: ChatTurn[],
  scene: NpcSceneContext | null = null,
): Promise<NpcReply> {
  const url = endpoint();
  const last = history[history.length - 1]?.content ?? '';
  const ctx = sanitizeSceneContext(scene);
  if (!url) return { text: localReply(npc, last, ctx), source: 'local' };
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const body: { npc: TalkNpcId; messages: ChatTurn[]; context?: NpcSceneContext } = {
      npc,
      messages: trimHistory(history),
    };
    if (ctx) body.context = ctx;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (res.status === 429) return { text: '지금은 이야기 나누는 분이 많아요. 조금 있다가 다시 말 걸어 주세요.', source: 'local' };
    if (!res.ok) return { text: localReply(npc, last, ctx), source: 'local' };
    const data = (await res.json()) as { reply?: unknown };
    if (typeof data.reply !== 'string' || !data.reply.trim()) return { text: localReply(npc, last, ctx), source: 'local' };
    return { text: data.reply.trim(), source: 'ai' };
  } catch {
    return { text: localReply(npc, last, ctx), source: 'local' };
  } finally {
    window.clearTimeout(timer);
  }
}

/** 서버가 없을 때의 짧은 안내 답(키워드). 장면 맥락이 있으면 인원·날씨·자리·읽는 책에 답한다. */
export function localReply(npc: TalkNpcId, q: string, ctx: NpcSceneContext | null = null): string {
  const s = q.replace(/\s+/g, '');
  const has = (...k: string[]) => k.some((w) => s.includes(w));
  if (ctx) {
    // 읽는 책 질문을 인원보다 먼저(「저 사람」에 '사람'이 들어가 인원으로 새는 것 방지)
    if (has('뭐읽', '무슨책', '읽고있', '읽는책', '저사람', '누가읽', '다들읽')) {
      if (!ctx.readers.length) return '지금은 책을 펼친 분이 없어요. "책 펼치기"로 제목을 머리 위에 띄울 수 있어요.';
      const list = ctx.readers.map((r) => `${r.nickname} 님은 「${r.title}」`).join(', ');
      return `지금 책 펼친 분은 ${list}예요.`;
    }
    if (has('몇명', '몇분', '인원', '접속', '누구있', '누가있', '혼자', '사람들')) {
      if (ctx.visitorCount <= 1) return `지금은 ${ctx.space}에 당신만 계세요. 정원은 ${ctx.capacity}명이에요.`;
      return `지금 ${ctx.space}에는 ${ctx.visitorCount}명 계세요(정원 ${ctx.capacity}명).`;
    }
    if (has('날씨', '비오', '눈오', '맑아', '맑은', '날씨어때')) {
      return `바깥은 ${ctx.weather}이고, 지금은 ${ctx.timeOfDay}이에요.`;
    }
    if (has('몇시', '시간대', '아침이', '저녁이', '밤이냐', '밤이야')) {
      return `지금은 ${ctx.timeOfDay}이에요. 바깥은 ${ctx.weather}입니다.`;
    }
    if (has('내자리', '내가앉', '어디에앉', '앉은자리', '내위치')) {
      return ctx.mySeat
        ? `지금은 ${ctx.mySeat}에 앉아 계세요.`
        : '지금은 서 계세요. 의자나 소파를 누르면 앉을 수 있어요.';
    }
  }
  if (has('커피', '음료', '녹차', '홍차', '찻', '마시', '목말')) return '아래 "음료" 버튼을 누르면 물·커피·차를 골라 마시는 동작을 할 수 있어요. 진짜 커피는 못 드려서 아쉬워요.';
  if (has('작업실', '작업', '집중', '타이머', '공동')) return '앞쪽 "공동 작업실"이나 "신기술 개발실"로 가면 책상과 작업 타이머·집중 모드를 쓸 수 있어요. 칸막이 문틀을 지나 걸어서 들어가거나 위쪽 "공간"으로 이동해요.';
  if (has('모임방', '모임')) return '왼쪽 "모임 실험실"에 둥근 테이블과 의자 다섯이 있어요. 걸어서 문틀을 지나거나 "공간" 버튼으로 갈 수 있어요.';
  if (has('앉', '의자', '소파', '안마')) {
    if (ctx?.mySeat) return `지금은 ${ctx.mySeat}에 앉아 계세요. 다른 의자나 소파를 누르면 그쪽으로 옮겨 앉아요.`;
    return '의자나 소파를 누르면 빈 자리로 걸어가서 앉아요. 광장에는 안마 의자와 소파도 있어요.';
  }
  if (has('전시', '작품', '그림')) return '뒤쪽 "전시 실험실"에 작품과 받침대가 있어요. 벤치에 앉아 천천히 보셔도 돼요.';
  if (has('책방', '매대', '서점')) return '왼쪽 뒤 "책방 실험실"에 서가와 매대가 있어요. 신간 받침대도 그 구역에 있어요.';
  if (has('마켓', '시장', '비마켓')) return '오른쪽 뒤 "마켓 실험실"은 비마켓을 시험해 보는 구역이에요. 매대 몇 개를 세워 두었어요.';
  if (has('챌린지', '도전')) return '오른쪽 "챌린지 실험실"에서 도전·미션형 기능을 시험할 예정이에요.';
  if (has('서재', '조용', '열람')) return '서재는 책방 실험실에 녹였어요. 책방 구역에서 신간·추천을 보시면 돼요.';
  if (has('방', '어디', '공간', '구경')) return '여기는 한 공간 실험실이에요. 칸막이 벽으로 책방·모임·전시·마켓·챌린지·공동 작업·신기술 구역을 나눴어요. 걸어서 문틀을 지나거나 위쪽 "공간"으로 이동해요.';
  if (has('신간', '이번주', '이번 주', '추천책', '책추천', '뭐읽을', '읽을책', '추천해')) {
    return localNewReleaseReply(npc, q);
  }
  if (has('아이디어', '추천', '사례', '기획', '해볼', '해 볼', '할수', '할 수', '뭘', '무엇')) return ROLE_TIP[npc];
  if (has('책', '읽')) return '"책 펼치기"로 읽는 책 제목을 머리 위에 띄울 수 있고, "읽기 모드"를 켜면 집중해서 읽는 화면이 돼요. 위쪽 "신간" 버튼으로 이번 주 매체 추천도 볼 수 있어요.';
  if (has('이동', '걷', '움직', '조작', '시점', '카메라')) return '바닥을 누르면 걸어가고, 화면을 드래그하면 시점이 위아래·좌우로 돌아요. Q·E는 좌우, R·F는 위아래예요.';
  if (has('안녕', '반가', '처음')) return ROLE_HELLO[npc];
  return ROLE_FALLBACK[npc];
}

/** 서버 없이도 역할이 드러나도록: 인사·아이디어 질문·모르는 질문 답 */
const ROLE_HELLO: Record<TalkNpcId, string> = {
  barista: '어서 오세요, 모카예요. 편하게 쉬다 가세요. 공간이나 조작이 궁금하면 물어봐 주세요.',
  researcher: '안녕하세요, 하랑이에요. 여기는 한 홀에 구역만 나눠 책방·모임·전시·마켓·챌린지·작업을 시험하는 실험실이에요.',
  bookseller: '어서 오세요, 서진이에요. 이 구역은 가상공간에서 책방이 할 수 있는 일을 시험하는 곳이에요.',
  curator: '반가워요, 고요예요. 책방 구역에서 책을 고르고 묶어 소개하는 방법을 궁리해요.',
  host: '반가워요, 소담이에요. 둥근 테이블에 둘러앉는 작은 모임을 기획하고 있어요.',
  docent: '어서 오세요, 윤슬이에요. 전시 구역 작품은 실험용이고, 벤치에서 천천히 보셔도 돼요.',
};
const ROLE_TIP: Record<TalkNpcId, string> = {
  barista: '광장에서는 쉬어 가는 자리를 시험하고 있어요. 안마 의자나 소파에 앉아 보세요.',
  researcher: '구역마다 하나씩 시험해요. 책방·모임·전시·마켓·챌린지·공동 작업·신기술. 궁금한 문틀부터 지나 보세요.',
  bookseller: '위쪽 "신간" 버튼이나 책방 쪽 신간 받침대를 누르면 이번 주 매체가 고른 책을 볼 수 있어요.',
  curator: '이번 주 신간을 책방 받침대와 "신간" 목록에 모아 두었어요. 관심사를 말해 주시면 그중에서 골라 드릴게요.',
  host: '처음엔 다섯 명 이하, 한 시간, 질문 하나로 시작하는 모임이 꾸리기 쉬워요. 이 구역 원탁이 딱 다섯 자리예요.',
  docent: '전시는 제목 하나와 작품 순서로 이야기를 만들어요. 뒷벽에서 시작해 천천히 돌아보세요.',
};

function localNewReleaseReply(npc: TalkNpcId, q: string): string {
  const picks = suggestNewReleases(q, 3, CURRENT_WEEK);
  const list = picks.map((b) => `「${b.title}」(${b.author})`).join(', ');
  const tip = npc === 'curator' || npc === 'bookseller'
    ? '위쪽 "신간" 버튼이나 받침대의 책을 누르면 소개와 출처를 볼 수 있어요.'
    : '위쪽 "신간" 버튼에서 전체 목록을 볼 수 있어요.';
  return `이번 주 매체가 고른 신간 중에서요. ${list} 어때요? ${tip}`;
}
const ROLE_FALLBACK: Record<TalkNpcId, string> = {
  barista: '지금은 깊은 이야기는 어렵지만, 방 위치·자리·음료·작업실 이야기는 안내해 드릴 수 있어요.',
  researcher: '지금은 짧은 안내만 할 수 있어요. 어떤 방에서 무엇을 시험하는지 물어봐 주세요.',
  bookseller: '지금은 짧은 안내만 할 수 있어요. 가상 책방 아이디어가 궁금하면 물어봐 주세요.',
  curator: '지금은 짧은 안내만 할 수 있어요. 책 큐레이션 방법이 궁금하면 물어봐 주세요.',
  host: '지금은 짧은 안내만 할 수 있어요. 모임 아이디어나 꾸리는 법이 궁금하면 물어봐 주세요.',
  docent: '지금은 짧은 안내만 할 수 있어요. 작품이나 전시 기획이 궁금하면 물어봐 주세요.',
};
