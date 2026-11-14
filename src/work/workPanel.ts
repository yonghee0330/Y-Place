// 작업실 패널: 앉기 의식(오늘 목표·이번 할 일) → 집중 타이머 → 휴식 → 회고 → 기록.
// 작업실 안에서만 보인다. 기록은 이 브라우저에만 남는다(workStore.ts).
import { Sheet } from '../ui/sheet';
import type { DeskPhase, DeskState } from './deskFx';
import { MIXER_LAYERS, SoundMixer } from './soundMixer';
import { WorkStore, fmtDuration, kstDate, type SessionResult } from './workStore';

type Phase = 'idle' | 'focus' | 'paused' | 'break' | 'ready';

interface Preset { id: string; label: string; focus: number; rest: number }
const PRESETS: Preset[] = [
  { id: '25/5', label: '25분 집중 · 5분 휴식', focus: 25, rest: 5 },
  { id: '50/10', label: '50분 집중 · 10분 휴식', focus: 50, rest: 10 },
  { id: '90/20', label: '90분 집중 · 20분 휴식', focus: 90, rest: 20 },
  { id: 'custom', label: '직접 정하기', focus: 40, rest: 8 },
  { id: 'watch', label: '시간 재기(끝 없음)', focus: 0, rest: 0 },
];

export interface WorkPanelHost {
  toast(text: string, action?: { label: string; onClick: () => void }): void;
  /** 책상 시점으로 다가가기 / 원래 시점으로 */
  setDeskView(on: boolean): void;
  /** 집중 모드: 다른 화면 요소 숨기기 */
  setChromeHidden(hidden: boolean): void;
  isSeated(): boolean;
  /** 1분을 몇 초로 셀지(테스트는 ?worksec=1) */
  secPerMin: number;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export class WorkPanel {
  readonly store = new WorkStore();
  readonly mixer = new SoundMixer(this.store.mixer);
  private el: HTMLElement;
  private room: string | null = null;
  private phase: Phase = 'idle';
  private preset: Preset = PRESETS[0];
  private task = '';
  private sessionStart = 0;
  /** 이번 세션에서 지금까지 집중한 시간(초, 진행 중인 구간 제외) */
  private focusAccum = 0;
  /** 지금 구간(집중·휴식)이 시작된 시각 */
  private segStart = 0;
  /** 지금 구간의 길이(초). 0이면 끝이 없다 */
  private segLen = 0;
  /** 멈추기 전에 이 구간에서 흘러간 시간(초) */
  private segDone = 0;
  private focusMode = false;
  private timer = 0;
  private ritual = new Sheet('자리에 앉기', 'work-ritual');
  private review = new Sheet('이번 세션 돌아보기', 'work-review');
  private parking = new Sheet('딴생각 주차장', 'work-parking');
  private sound = new Sheet('소리 섞기', 'work-sound');
  private records = new Sheet('내 기록', 'work-records');

  constructor(parent: HTMLElement, private host: WorkPanelHost) {
    this.el = document.createElement('section');
    this.el.className = 'work-panel';
    this.el.hidden = true;
    this.el.setAttribute('aria-label', '작업 타이머');
    this.el.innerHTML = `
      <div class="wp-head"><span class="wp-chip" data-chip>준비</span><span class="wp-task" data-task></span></div>
      <div class="wp-time" data-time aria-live="off">--:--</div>
      <div class="wp-actions" data-actions></div>
      <div class="wp-tools">
        <button type="button" class="wp-tool" data-tool="sound">소리</button>
        <button type="button" class="wp-tool" data-tool="park">딴생각</button>
        <button type="button" class="wp-tool" data-tool="records">기록</button>
        <button type="button" class="wp-tool" data-tool="focus" aria-pressed="false">집중 모드</button>
        <button type="button" class="wp-tool wp-full" data-tool="full" hidden>전체 화면</button>
      </div>`;
    parent.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b) return;
      const act = b.dataset.act, tool = b.dataset.tool;
      if (act === 'sit') this.openRitual();
      else if (act === 'pause') this.pause();
      else if (act === 'resume') this.resume();
      else if (act === 'rest') this.startBreak(true);
      else if (act === 'again') this.startFocus();
      else if (act === 'finish') this.finish(true);
      else if (tool === 'sound') this.openSound();
      else if (tool === 'park') this.openParking();
      else if (tool === 'records') this.openRecords();
      else if (tool === 'focus') this.setFocusMode(!this.focusMode);
      else if (tool === 'full') this.toggleFullscreen();
    });
    const saved = PRESETS.find((p) => p.id === this.store.preset);
    if (saved) this.preset = saved;
    this.mixer.setMuted(true);
    this.render();
  }

  // ---------- 방 드나들기 ----------
  /** 작업실에 들어오면 방 이름, 나가면 null */
  setRoom(room: string | null): void {
    if (room === this.room) return;
    if (this.room && this.phase !== 'idle') this.finish(false);
    this.room = room;
    this.el.hidden = !room;
    this.mixer.setMuted(!room);
    if (!room) this.setFocusMode(false);
    this.render();
  }

  get active(): boolean {
    return this.phase !== 'idle';
  }

  /** 작업실에 막 들어왔을 때: 아직 시작 전이면 앉기 의식을 연다 */
  invite(): void {
    if (this.room && this.phase === 'idle' && !this.ritual.isOpen) this.openRitual();
  }

  /** 책상 위 사물에 넘겨 줄 상태 */
  deskState(): DeskState {
    const phase: DeskPhase = this.phase === 'ready' ? 'idle' : this.phase;
    const { left, elapsed } = this.clock();
    const progress = this.segLen ? elapsed / this.segLen : (elapsed % 3600) / 3600;
    return { phase, progress: this.phase === 'idle' || this.phase === 'ready' ? 0 : progress, label: this.phase === 'idle' || this.phase === 'ready' ? '' : mmss((this.segLen ? left : elapsed) * (60 / this.host.secPerMin)), seated: this.host.isSeated() };
  }

  private clock(): { elapsed: number; left: number } {
    const running = this.phase === 'focus' || this.phase === 'break';
    const elapsed = this.segDone + (running ? (Date.now() - this.segStart) / 1000 : 0);
    return { elapsed, left: Math.max(0, this.segLen - elapsed) };
  }

  // ---------- 앉기 의식 ----------
  private openRitual(): void {
    const goals = this.store.todayGoals().goals;
    const b = this.ritual.body;
    b.innerHTML = `
      <p class="sheet-text">오늘 할 일을 적고 자리에 앉아요. 적은 내용은 이 기기에만 남아요.</p>
      <fieldset class="field"><legend>오늘의 목표 (1~3개)</legend>
        ${[0, 1, 2].map((i) => `<input class="field-input wp-input" data-goal maxlength="60" placeholder="${i === 0 ? '예: 원고 2장 쓰기' : '더 있으면 적기'}" value="${esc(goals[i]?.text ?? '')}" />`).join('')}
      </fieldset>
      <label class="field-label" for="wp-task">이번 세션에 할 일 한 가지</label>
      <input id="wp-task" class="field-input wp-input" data-task-input maxlength="60" placeholder="예: 1장 초고 끝내기" value="${esc(this.task)}" />
      <fieldset class="field wp-presets"><legend>시간</legend>
        ${PRESETS.map((p) => `<label class="wp-radio"><input type="radio" name="wp-preset" value="${p.id}" ${p.id === this.preset.id ? 'checked' : ''} /> ${p.label}</label>`).join('')}
        <div class="wp-custom" data-custom hidden>
          <label>집중 <input type="number" class="field-input" data-cf min="1" max="240" value="${PRESETS[3].focus}" /> 분</label>
          <label>휴식 <input type="number" class="field-input" data-cr min="1" max="60" value="${PRESETS[3].rest}" /> 분</label>
        </div>
      </fieldset>
      <button type="button" class="wp-link" data-act="notify" ${'Notification' in window && Notification.permission === 'default' ? '' : 'hidden'}>끝났을 때 브라우저 알림 받기</button>
      <div class="sheet-actions">
        <button type="button" class="btn" data-act="cancel">취소</button>
        <button type="button" class="btn btn-primary" data-act="start">앉아서 시작</button>
      </div>`;
    const custom = b.querySelector<HTMLElement>('[data-custom]')!;
    const sync = () => {
      custom.hidden = b.querySelector<HTMLInputElement>('input[name="wp-preset"]:checked')?.value !== 'custom';
    };
    b.querySelectorAll('input[name="wp-preset"]').forEach((r) => r.addEventListener('change', sync));
    sync();
    b.querySelector('[data-act="cancel"]')!.addEventListener('click', () => this.ritual.close());
    b.querySelector('[data-act="notify"]')!.addEventListener('click', (e) => {
      void Notification.requestPermission().then(() => ((e.target as HTMLElement).hidden = true));
    });
    const start = () => {
      const taskEl = b.querySelector<HTMLInputElement>('[data-task-input]')!;
      const task = taskEl.value.trim();
      if (!task) {
        taskEl.focus();
        taskEl.placeholder = '할 일을 한 가지만 적어 주세요';
        return;
      }
      this.store.setGoals([...b.querySelectorAll<HTMLInputElement>('[data-goal]')].map((i) => i.value));
      const id = b.querySelector<HTMLInputElement>('input[name="wp-preset"]:checked')?.value ?? '25/5';
      const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0];
      if (p.id === 'custom') {
        p.focus = Math.max(1, Math.min(240, Math.round(Number(b.querySelector<HTMLInputElement>('[data-cf]')!.value) || 40)));
        p.rest = Math.max(1, Math.min(60, Math.round(Number(b.querySelector<HTMLInputElement>('[data-cr]')!.value) || 8)));
      }
      this.ritual.close();
      this.begin(task, p);
    };
    b.querySelector('[data-act="start"]')!.addEventListener('click', start);
    b.querySelector('[data-task-input]')!.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).isComposing) start();
    });
    this.ritual.open();
  }

  /** 세션 시작(테스트·디버그에서도 부른다) */
  begin(task: string, preset: Preset | string = this.preset): void {
    const p = typeof preset === 'string' ? PRESETS.find((x) => x.id === preset) ?? PRESETS[0] : preset;
    if (this.phase !== 'idle') this.finish(false);
    this.task = task.trim().slice(0, 60);
    this.preset = p;
    this.store.setPreset(p.id);
    this.sessionStart = Date.now();
    this.focusAccum = 0;
    this.host.setDeskView(true);
    this.startFocus();
    clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 250);
  }

  private startFocus(): void {
    this.phase = 'focus';
    this.segStart = Date.now();
    this.segDone = 0;
    this.segLen = this.preset.focus * this.host.secPerMin;
    this.render();
  }

  private pause(): void {
    if (this.phase !== 'focus') return;
    this.segDone = this.clock().elapsed;
    this.phase = 'paused';
    this.render();
  }

  private resume(): void {
    if (this.phase !== 'paused') return;
    this.segStart = Date.now();
    this.phase = 'focus';
    this.render();
  }

  /** 집중 구간을 닫고 휴식으로. byUser면 일찍 쉬는 것 */
  private startBreak(byUser: boolean): void {
    if (this.phase !== 'focus' && this.phase !== 'paused') return;
    this.focusAccum += this.clock().elapsed;
    this.phase = 'break';
    this.segStart = Date.now();
    this.segDone = 0;
    this.segLen = (this.preset.rest || 5) * this.host.secPerMin;
    if (!byUser) {
      this.mixer.chime('focus');
      this.notify('집중 시간이 끝났어요', `${this.preset.rest}분 쉬어 가요.`);
    }
    const n = this.store.parking.length;
    this.host.toast(
      n ? `쉬는 시간이에요. 적어 둔 딴생각 ${n}개가 있어요` : '쉬는 시간이에요. 물 한 잔 하고 오세요',
      n ? { label: '보기', onClick: () => this.openParking() } : undefined,
    );
    this.render();
  }

  private tick(): void {
    if (this.phase === 'focus' && this.segLen && this.clock().left <= 0) this.startBreak(false);
    else if (this.phase === 'break' && this.clock().left <= 0) {
      this.phase = 'ready';
      this.mixer.chime('break');
      this.notify('쉬는 시간이 끝났어요', '다시 시작할까요?');
      this.host.toast('쉬는 시간이 끝났어요. 이어서 할까요?');
      this.render();
    }
    this.paint();
  }

  /** 세션을 끝내고 기록한다. ask면 회고를 묻는다 */
  finish(ask: boolean): void {
    if (this.phase === 'idle') return;
    if (this.phase === 'focus' || this.phase === 'paused') this.focusAccum += this.clock().elapsed;
    clearInterval(this.timer);
    this.phase = 'idle';
    this.host.setDeskView(false);
    this.setFocusMode(false);
    // 집중한 시간을 실제 분 단위로 맞춘다(테스트는 1분을 1초로 센다)
    const focusSec = Math.round(this.focusAccum * (60 / this.host.secPerMin));
    const saved = focusSec >= 60;
    if (saved) {
      this.store.addSession({ start: this.sessionStart, end: Date.now(), focusSec, task: this.task, room: this.room ?? '', result: null, focus: null, memo: '' });
    }
    this.render();
    if (!saved) this.host.toast('1분이 안 되어 기록하지 않았어요');
    else if (ask) this.openReview(focusSec);
    else this.host.toast(`${fmtDuration(focusSec)} 집중한 기록을 남겼어요`);
  }

  // ---------- 회고 ----------
  private openReview(focusSec: number): void {
    const b = this.review.body;
    const parked = this.store.parking;
    b.innerHTML = `
      <p class="sheet-text"><strong>${fmtDuration(focusSec)}</strong> 집중했어요. 「${esc(this.task)}」 어땠나요?</p>
      <div class="wp-choice" data-result role="group" aria-label="결과">
        <button type="button" class="btn" data-v="done">했다</button>
        <button type="button" class="btn" data-v="partial">일부 했다</button>
        <button type="button" class="btn" data-v="not">못 했다</button>
      </div>
      <div class="wp-choice wp-stars" data-focus role="group" aria-label="집중도">
        <span class="field-label">집중도</span>
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="btn" data-v="${n}">${n}</button>`).join('')}
      </div>
      <input class="field-input wp-input" data-memo maxlength="120" placeholder="한 줄 메모 (안 적어도 돼요)" />
      ${parked.length ? `<p class="field-label">적어 둔 딴생각</p><ul class="wp-list">${parked.map((p) => `<li>${esc(p.text)}</li>`).join('')}</ul>` : ''}
      <div class="sheet-actions">
        <button type="button" class="btn" data-act="skip">건너뛰기</button>
        <button type="button" class="btn btn-primary" data-act="save">남기기</button>
      </div>`;
    let result: SessionResult = null;
    let focus: number | null = null;
    const pick = (group: string, set: (v: string) => void) => {
      const box = b.querySelector(`[data-${group}]`)!;
      box.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('button');
        if (!btn) return;
        box.querySelectorAll('button').forEach((x) => x.classList.toggle('is-on', x === btn));
        set(btn.dataset.v!);
      });
    };
    pick('result', (v) => (result = v as SessionResult));
    pick('focus', (v) => (focus = Number(v)));
    b.querySelector('[data-act="skip"]')!.addEventListener('click', () => this.review.close());
    b.querySelector('[data-act="save"]')!.addEventListener('click', () => {
      this.store.reviewLast(result, focus, b.querySelector<HTMLInputElement>('[data-memo]')!.value);
      this.review.close();
      this.host.toast('기록을 남겼어요. 수고했어요');
    });
    this.review.open();
  }

  // ---------- 딴생각 주차장 ----------
  private openParking(): void {
    const b = this.parking.body;
    const draw = () => {
      const list = this.store.parking;
      b.innerHTML = `
        <p class="sheet-text">집중하다 떠오른 생각은 여기 적어 두고, 쉬는 시간에 다시 봐요.</p>
        <form class="wp-park-form" data-form>
          <input class="field-input wp-input" data-text maxlength="80" placeholder="예: 택배 반품 신청하기" autocomplete="off" />
          <button type="submit" class="btn btn-primary">적어 두기</button>
        </form>
        ${list.length ? `<ul class="wp-list">${list.map((p) => `<li>${esc(p.text)}</li>`).join('')}</ul>
        <div class="sheet-actions"><button type="button" class="btn" data-act="clear">다 비우기</button></div>` : '<p class="field-note">아직 적어 둔 생각이 없어요.</p>'}`;
      b.querySelector('[data-form]')!.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = b.querySelector<HTMLInputElement>('[data-text]')!;
        if (!input.value.trim()) return;
        this.store.park(input.value);
        // 집중 중이면 적자마자 닫아 흐름을 끊지 않는다
        if (this.phase === 'focus') {
          this.parking.close();
          this.host.toast('적어 뒀어요. 쉬는 시간에 다시 보여 드릴게요');
        } else draw();
      });
      b.querySelector('[data-act="clear"]')?.addEventListener('click', () => {
        this.store.clearParking();
        draw();
      });
    };
    draw();
    this.parking.open();
  }

  // ---------- 소리 ----------
  private openSound(): void {
    const b = this.sound.body;
    b.innerHTML = `
      <p class="sheet-text">작업실 안에서만 들리는 배경 소리예요. 섞어서 쓸 수 있어요.</p>
      ${MIXER_LAYERS.map((l) => `<label class="wp-slider"><span>${l.label}</span>
        <input type="range" min="0" max="100" step="5" value="${this.store.mixer[l.id]}" data-layer="${l.id}" aria-label="${l.label} 볼륨" /></label>`).join('')}
      <div class="sheet-actions"><button type="button" class="btn" data-act="off">모두 끄기</button>
      <button type="button" class="btn btn-primary" data-act="ok">닫기</button></div>`;
    b.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((input) => {
      input.addEventListener('input', () => {
        const id = input.dataset.layer as (typeof MIXER_LAYERS)[number]['id'];
        this.store.setMixer(id, Number(input.value));
        this.mixer.setLevel(id, Number(input.value));
      });
    });
    b.querySelector('[data-act="off"]')!.addEventListener('click', () => {
      b.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((input) => {
        input.value = '0';
        input.dispatchEvent(new Event('input'));
      });
    });
    b.querySelector('[data-act="ok"]')!.addEventListener('click', () => this.sound.close());
    this.sound.open();
  }

  // ---------- 기록 ----------
  private openRecords(): void {
    const s = this.store;
    const b = this.records.body;
    const draw = () => {
      const goals = s.todayGoals().goals;
      const heat = s.heatmap(12);
      const max = Math.max(3600, ...heat.map((d) => d.sec));
      const best = s.bestHour();
      const rate = s.doneRate();
      const goalH = s.weeklyGoalHours;
      const weekPct = goalH ? Math.min(100, Math.round((s.weekSec() / (goalH * 3600)) * 100)) : 0;
      const recent = [...s.sessions].reverse().slice(0, 8);
      b.innerHTML = `
        <div class="wp-stats">
          <div><b>${fmtDuration(s.todaySec())}</b><span>오늘</span></div>
          <div><b>${fmtDuration(s.weekSec())}</b><span>이번 주</span></div>
          <div><b>${fmtDuration(s.monthSec())}</b><span>이번 달</span></div>
          <div><b>${s.streak()}일</b><span>연속 출석</span></div>
        </div>
        <p class="field-note">${best === null ? '아직 기록이 없어요. 첫 세션을 시작해 보세요.' : `가장 잘 집중한 시간대는 ${best}시 무렵이에요.`}${rate === null ? '' : ` 돌아본 세션 중 ${Math.round(rate * 100)}%를 해냈어요.`}</p>
        <fieldset class="field"><legend>이번 주 목표</legend>
          <label class="wp-weekgoal">주 <input type="number" class="field-input" data-weekgoal min="0" max="100" value="${goalH}" /> 시간</label>
          ${goalH ? `<div class="wp-bar" role="progressbar" aria-valuenow="${weekPct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${weekPct}%"></i></div><p class="field-note">${weekPct}% (${fmtDuration(s.weekSec())} / ${goalH}시간)${weekPct >= 100 ? ' · 이번 주 목표를 채웠어요' : ''}</p>` : '<p class="field-note">0이면 목표 없이 기록만 해요.</p>'}
        </fieldset>
        <fieldset class="field"><legend>최근 12주</legend>
          <div class="wp-heat" aria-label="날짜별 집중 시간">${heat.map((d) => `<i title="${d.date} · ${fmtDuration(d.sec)}" style="--v:${d.sec ? 0.25 + 0.75 * Math.min(1, d.sec / max) : 0}"></i>`).join('')}</div>
        </fieldset>
        ${goals.length ? `<fieldset class="field"><legend>오늘의 목표 (${kstDate()})</legend>${goals.map((g, i) => `<label class="wp-check"><input type="checkbox" data-goal="${i}" ${g.done ? 'checked' : ''} /> ${esc(g.text)}</label>`).join('')}</fieldset>` : ''}
        ${recent.length ? `<fieldset class="field"><legend>최근 세션</legend><ul class="wp-list">${recent.map((r) => `<li><b>${kstDate(r.start).slice(5)} · ${fmtDuration(r.focusSec)}</b> ${esc(r.task)}${r.result ? ` — ${r.result === 'done' ? '했다' : r.result === 'partial' ? '일부' : '못 했다'}` : ''}${r.memo ? ` · ${esc(r.memo)}` : ''}</li>`).join('')}</ul></fieldset>` : ''}
        <div class="sheet-actions">
          <button type="button" class="btn" data-act="csv" ${s.sessions.length ? '' : 'disabled'}>CSV로 내보내기</button>
          <button type="button" class="btn btn-primary" data-act="ok">닫기</button>
        </div>`;
      b.querySelector('[data-weekgoal]')!.addEventListener('change', (e) => {
        s.setWeeklyGoal(Number((e.target as HTMLInputElement).value) || 0);
        draw();
      });
      b.querySelectorAll<HTMLInputElement>('[data-goal]').forEach((c) => c.addEventListener('change', () => s.toggleGoal(Number(c.dataset.goal))));
      b.querySelector('[data-act="ok"]')!.addEventListener('click', () => this.records.close());
      b.querySelector('[data-act="csv"]')!.addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([s.csv()], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `작업기록_${kstDate()}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      });
    };
    draw();
    this.records.open();
  }

  // ---------- 집중 모드 ----------
  setFocusMode(on: boolean): void {
    if (on === this.focusMode) return;
    this.focusMode = on;
    this.el.classList.toggle('is-focus', on);
    this.host.setChromeHidden(on);
    if (!on && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    this.render();
  }

  get focusModeOn(): boolean {
    return this.focusMode;
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  private notify(title: string, body: string): void {
    // 사용자가 허용했고, 이 탭을 보고 있지 않을 때만
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    try {
      new Notification(title, { body });
    } catch {
      /* 알림을 못 띄워도 진행 */
    }
  }

  // ---------- 그리기 ----------
  private render(): void {
    const chip = this.el.querySelector<HTMLElement>('[data-chip]')!;
    const names: Record<Phase, string> = { idle: '준비', focus: '집중', paused: '멈춤', break: '휴식', ready: '다음 준비' };
    chip.textContent = names[this.phase];
    chip.dataset.phase = this.phase;
    this.el.querySelector('[data-task]')!.textContent = this.phase === 'idle'
      ? (this.store.todaySec() ? `오늘 ${fmtDuration(this.store.todaySec())} 집중했어요` : '오늘 할 일을 적고 시작해요')
      : this.task;
    const btn = (act: string, label: string, primary = false) => `<button type="button" class="btn ${primary ? 'btn-primary' : ''}" data-act="${act}">${label}</button>`;
    const actions: Record<Phase, string> = {
      idle: btn('sit', '자리에 앉기', true),
      focus: btn('pause', '잠깐 멈춤') + btn('rest', '쉬기') + btn('finish', '마치기'),
      paused: btn('resume', '이어서', true) + btn('finish', '마치기'),
      break: btn('again', '바로 다시 집중') + btn('finish', '마치기'),
      ready: btn('again', '다시 집중', true) + btn('finish', '마치기'),
    };
    this.el.querySelector('[data-actions]')!.innerHTML = actions[this.phase];
    const f = this.el.querySelector<HTMLElement>('[data-tool="focus"]')!;
    f.setAttribute('aria-pressed', String(this.focusMode));
    f.textContent = this.focusMode ? '집중 모드 끄기' : '집중 모드';
    this.el.querySelector<HTMLElement>('[data-tool="full"]')!.hidden = !this.focusMode || !document.documentElement.requestFullscreen;
    this.paint();
  }

  private paint(): void {
    const t = this.el.querySelector<HTMLElement>('[data-time]')!;
    if (this.phase === 'idle' || this.phase === 'ready') {
      t.textContent = this.preset.focus ? mmss(this.preset.focus * 60) : '00:00';
      return;
    }
    const { left, elapsed } = this.clock();
    // 화면 숫자는 실제 분:초로 보여 준다(테스트 배속과 무관하게 구간 비율로 환산)
    const scale = 60 / this.host.secPerMin;
    t.textContent = mmss((this.segLen ? left : elapsed) * scale);
  }

  /** 테스트·디버그용 */
  debug(): { phase: Phase; task: string; room: string | null; focusMode: boolean; sessions: number; todaySec: number } {
    return { phase: this.phase, task: this.task, room: this.room, focusMode: this.focusMode, sessions: this.store.sessions.length, todaySec: this.store.todaySec() };
  }
}
