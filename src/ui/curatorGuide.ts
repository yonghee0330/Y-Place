// 책 큐레이터 고요의 선택 버튼 대화. 스테디셀러 목록에 있는 책만 고른다(지어내지 않음).
import { BESTSELLERS, type Bestseller } from '../avatar/bestsellers';

export type CuratorStep = 'offer' | 'source' | 'topic' | 'after';

export interface ChatChoice {
  id: string;
  label: string;
}

export type BookTopic = '소설' | '에세이' | '인문학' | '기타';

const STEADY_TOPIC: Record<string, BookTopic> = {
  '작별하지 않는다': '소설', '채식주의자': '소설', '소년이 온다': '소설',
  '파친코 1': '소설', '파친코 2': '소설', '불편한 편의점': '소설', '불편한 편의점 2': '소설',
  '달러구트 꿈 백화점': '소설', '아몬드': '소설', '구의 증명': '소설', '밝은 밤': '소설',
  '시선으로부터,': '소설', '보건교사 안은영': '소설', '미드나잇 라이브러리': '소설',
  '데미안': '소설', '나미야 잡화점의 기적': '소설', '연금술사': '소설',
  '우리가 빛의 속도로 갈 수 없다면': '소설', '지구 끝의 온실': '소설', '급류': '소설', '모순': '소설',
  '어린이라는 세계': '에세이', '내가 틀릴 수도 있습니다': '에세이', '여행의 이유': '에세이',
  '도둑맞은 집중력': '인문학', '물고기는 존재하지 않는다': '인문학', '코스모스': '인문학',
};

export const CURATOR_OPENING =
  '반가워요, 책 큐레이터 고요예요. 책 추천해 드릴까요?';

export function choicesFor(step: CuratorStep): ChatChoice[] {
  if (step === 'offer') {
    return [
      { id: 'yes', label: '네, 부탁해요' },
      { id: 'no', label: '괜찮아요' },
    ];
  }
  if (step === 'source') {
    return [
      { id: 'steady', label: '스테디셀러' },
      { id: 'topic', label: '관심 있는 주제' },
    ];
  }
  if (step === 'topic') {
    return [
      { id: '소설', label: '소설' },
      { id: '에세이', label: '에세이' },
      { id: '인문학', label: '인문학' },
      { id: '기타', label: '기타' },
    ];
  }
  return [
    { id: 'again', label: '다시 고르기' },
    { id: 'topic-again', label: '다른 주제' },
  ];
}

function pickSteady(n: number, topic?: BookTopic): Bestseller[] {
  let pool = [...BESTSELLERS];
  if (topic) {
    const filtered = pool.filter((b) => (STEADY_TOPIC[b.title] ?? '기타') === topic);
    if (filtered.length >= 2) pool = filtered;
  }
  return shuffle(pool).slice(0, n);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatSteady(books: Bestseller[]): string {
  return books.map((b) => {
    const one = b.blurb.split(/(?<=다|요|죠)\.\s/)[0]?.slice(0, 70) ?? b.blurb.slice(0, 70);
    return `「${b.title}」 ${b.author} — ${one}${one.endsWith('.') ? '' : '…'}`;
  }).join('\n');
}

export interface GuideResult {
  nextStep: CuratorStep | null;
  reply: string;
}

/** 선택 버튼을 눌렀을 때 답과 다음 단계. */
export function handleCuratorChoice(step: CuratorStep, choiceId: string): GuideResult {
  if (step === 'offer') {
    if (choiceId === 'yes') {
      return {
        nextStep: 'source',
        reply: '좋아요. 어떤 쪽으로 골라 볼까요?',
      };
    }
    return {
      nextStep: 'after',
      reply: '괜찮아요. 궁금한 게 있으면 편하게 물어봐 주세요. 나중에 추천이 필요하면 아래 버튼으로 다시 시작할 수 있어요.',
    };
  }

  if (step === 'source') {
    if (choiceId === 'topic') {
      return {
        nextStep: 'topic',
        reply: '관심 있는 주제를 골라 주세요.',
      };
    }
    if (choiceId === 'steady') {
      const books = pickSteady(3);
      return {
        nextStep: 'after',
        reply: `오래 읽혀 온 스테디셀러 중에서요.\n${formatSteady(books)}\n\n더 골라 볼까요?`,
      };
    }
  }

  if (step === 'topic') {
    const topic = (['소설', '에세이', '인문학', '기타'].includes(choiceId) ? choiceId : '기타') as BookTopic;
    const steady = pickSteady(3, topic);
    return { nextStep: 'after', reply: `${topic} 쪽 스테디셀러로 골라 봤어요.\n${formatSteady(steady)}\n\n더 골라 볼까요?` };
  }

  if (step === 'after') {
    if (choiceId === 'again') {
      return { nextStep: 'source', reply: '다시 골라 볼게요. 어떤 쪽으로 할까요?' };
    }
    if (choiceId === 'topic-again') {
      return { nextStep: 'topic', reply: '관심 있는 주제를 골라 주세요.' };
    }
  }

  return { nextStep: 'offer', reply: '책 추천해 드릴까요?' };
}
