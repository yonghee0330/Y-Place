// NPC와 대화하는 창. 방문자 말 → NPC 답(Claude 또는 안내 답). 대화는 이 탭 메모리에만 남는다.
// 책 큐레이터(고요)는 선택 버튼으로 추천 흐름을 이어 간다.
import { askNpc, npcChatIsAi, type ChatTurn, type NpcSceneContext, type TalkNpcId } from '../net/npcChat';
import {
  CURATOR_OPENING, choicesFor, handleCuratorChoice, type ChatChoice, type CuratorStep,
} from './curatorGuide';
import { Sheet } from './sheet';

const GREETING: Record<TalkNpcId, string> = {
  barista: '어서 오세요, 바리스타 모카예요. 공간 안내든 쉬어 가는 이야기든 편하게 물어봐 주세요.',
  researcher: '안녕하세요, 실험 연구자 하랑이에요. 이 실험실에서 무엇을 시험해 볼 수 있을지 같이 이야기해 봐요.',
  bookseller: '어서 오세요, 책방 실험자 서진이에요. 가상공간에서 책방이 할 수 있는 일을 궁리하고 있어요.',
  curator: CURATOR_OPENING,
  host: '반가워요, 모임 기획자 소담이에요. 모임 아이디어부터 실제로 꾸려 가는 방법까지 같이 고민해요.',
  docent: '어서 오세요, 전시 큐레이터 윤슬이에요. 작품 안내도, 전시를 기획하는 이야기도 좋아요.',
};

export class NpcChatSheet {
  private sheet = new Sheet('', 'npc-chat-sheet');
  private log: HTMLElement;
  private choicesEl: HTMLElement;
  private form: HTMLFormElement;
  private input: HTMLInputElement;
  private send: HTMLButtonElement;
  private histories = new Map<TalkNpcId, ChatTurn[]>();
  private npc: TalkNpcId | null = null;
  private busy = false;
  private curatorStep: CuratorStep | null = null;
  /** 답을 받으면 말풍선처럼 NPC 머리 위에 잠깐 보여 줄 수 있게 알린다 */
  onReply: ((npc: TalkNpcId, text: string) => void) | null = null;
  /** 보낼 때마다 지금 방·인원·날씨·자리·읽는 책을 모은다(개인정보는 닉네임만). */
  getSceneContext: (() => NpcSceneContext | null) | null = null;
  /** 고요 가이드에서 "신간 목록 보기"를 눌렀을 때 */
  onOpenNewReleases: (() => void) | null = null;

  constructor() {
    this.sheet.el.classList.add('chat-sheet');
    const ai = npcChatIsAi();
    this.sheet.body.innerHTML = `
      <p class="chat-note">${ai
        ? '답은 Claude(AI)가 만들어요. 보낸 말은 답을 만드는 데만 쓰이고 저장하지 않아요. 이름·연락처 같은 개인정보는 적지 말아 주세요.'
        : '지금은 짧은 안내 답만 할 수 있어요. 개인정보는 적지 말아 주세요.'}</p>
      <div class="chat-log" role="log" aria-live="polite" aria-label="대화 내용"></div>
      <div class="chat-choices" data-choices hidden role="group" aria-label="선택할 답"></div>
      <form class="chat-form" autocomplete="off">
        <input class="chat-input" type="text" maxlength="200" placeholder="물어보고 싶은 걸 적어 주세요" aria-label="NPC에게 보낼 말" enterkeyhint="send" />
        <button class="btn btn-primary chat-send" type="submit">보내기</button>
      </form>`;
    this.log = this.sheet.body.querySelector('.chat-log')!;
    this.choicesEl = this.sheet.body.querySelector('[data-choices]')!;
    this.form = this.sheet.body.querySelector('.chat-form')!;
    this.input = this.sheet.body.querySelector('.chat-input')!;
    this.send = this.sheet.body.querySelector('.chat-send')!;
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.submit();
    });
    this.sheet.onClose = () => {
      this.npc = null;
      this.clearChoices();
    };
  }

  get isOpen(): boolean {
    return this.sheet.isOpen;
  }

  get talkingTo(): TalkNpcId | null {
    return this.isOpen ? this.npc : null;
  }

  open(npc: TalkNpcId, name: string): void {
    this.npc = npc;
    this.sheet.el.querySelector('.sheet-title')!.textContent = name;
    if (!this.histories.has(npc)) {
      this.histories.set(npc, [{ role: 'assistant', content: GREETING[npc] }]);
    }
    if (npc === 'curator') {
      // 대화가 비어 있거나 인사만 있으면 추천 제안 단계부터
      const h = this.histories.get(npc)!;
      if (h.length <= 1) this.curatorStep = 'offer';
      else if (!this.curatorStep) this.curatorStep = 'after';
    } else {
      this.curatorStep = null;
    }
    this.render();
    this.sheet.open();
    if (npc !== 'curator' || this.curatorStep === null) this.input.focus();
  }

  close(): void {
    if (this.sheet.isOpen) this.sheet.close();
  }

  private clearChoices(): void {
    this.choicesEl.hidden = true;
    this.choicesEl.replaceChildren();
  }

  private showChoices(choices: ChatChoice[]): void {
    this.choicesEl.hidden = false;
    this.choicesEl.replaceChildren();
    for (const c of choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-choice';
      btn.textContent = c.label;
      btn.dataset.choice = c.id;
      btn.addEventListener('click', () => this.pickChoice(c));
      this.choicesEl.appendChild(btn);
    }
  }

  private render(): void {
    const h = this.npc ? this.histories.get(this.npc) ?? [] : [];
    this.log.replaceChildren(
      ...h.map((t) => {
        const p = document.createElement('p');
        p.className = `chat-msg chat-${t.role === 'user' ? 'me' : 'npc'}`;
        p.textContent = t.content;
        return p;
      }),
    );
    if (this.busy) {
      const p = document.createElement('p');
      p.className = 'chat-msg chat-npc chat-typing';
      p.setAttribute('aria-label', '답을 쓰는 중');
      p.innerHTML = '<span></span><span></span><span></span>';
      this.log.appendChild(p);
      this.clearChoices();
    } else if (this.npc === 'curator' && this.curatorStep) {
      this.showChoices(choicesFor(this.curatorStep));
    } else {
      this.clearChoices();
    }
    this.log.scrollTop = this.log.scrollHeight;
  }

  private pickChoice(c: ChatChoice): void {
    const npc = this.npc;
    if (!npc || this.busy || npc !== 'curator' || !this.curatorStep) return;
    const step = this.curatorStep;
    const h = this.histories.get(npc)!;
    h.push({ role: 'user', content: c.label });
    const result = handleCuratorChoice(step, c.id);
    h.push({ role: 'assistant', content: result.reply });
    if (h.length > 40) h.splice(0, h.length - 40);
    this.curatorStep = result.nextStep;
    this.render();
    this.onReply?.(npc, result.reply);
    if (result.openList) this.onOpenNewReleases?.();
  }

  private async submit(): Promise<void> {
    const npc = this.npc;
    const text = this.input.value.trim();
    if (!npc || !text || this.busy) return;
    const h = this.histories.get(npc)!;
    h.push({ role: 'user', content: text });
    this.input.value = '';
    this.busy = true;
    this.send.disabled = true;
    this.clearChoices();
    this.render();
    const reply = await askNpc(npc, h, this.getSceneContext?.() ?? null);
    h.push({ role: 'assistant', content: reply.text });
    if (h.length > 40) h.splice(0, h.length - 40);
    this.busy = false;
    this.send.disabled = false;
    // 자유 입력 뒤에는 고요에게 다시 가이드를 이어갈 수 있게
    if (npc === 'curator') this.curatorStep = 'after';
    if (this.npc === npc) {
      this.render();
      this.input.focus();
    }
    this.onReply?.(npc, reply.text);
  }
}
