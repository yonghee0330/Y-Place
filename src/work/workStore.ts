// 작업실 개인 기록. 지금은 이 브라우저(localStorage)에만 남는다.
// 서버 저장(다른 기기에서 이어 보기)은 방 주인·입장 방식이 정해진 뒤에 붙인다(DECISIONS.md).

export type SessionResult = 'done' | 'partial' | 'not' | null;

export interface WorkSessionRecord {
  /** 시작·끝 시각(ms) */
  start: number;
  end: number;
  /** 실제 집중한 시간(초). 휴식·일시정지는 뺀다 */
  focusSec: number;
  task: string;
  room: string;
  result: SessionResult;
  /** 집중도 1~5 (회고를 건너뛰면 null) */
  focus: number | null;
  memo: string;
}

export interface DayGoals { date: string; goals: { text: string; done: boolean }[] }
export interface ParkedThought { text: string; at: number }
export type MixerLayer = 'rain' | 'fire' | 'keys' | 'cafe' | 'brown';
export type MixerLevels = Record<MixerLayer, number>;

interface WorkData {
  sessions: WorkSessionRecord[];
  goals: DayGoals | null;
  parking: ParkedThought[];
  mixer: MixerLevels;
  /** 이번 주 목표 시간(시간 단위, 0이면 없음) */
  weeklyGoalHours: number;
  preset: string;
}

const KEY = 'yongseojeom.work';
const EMPTY: WorkData = {
  sessions: [], goals: null, parking: [],
  mixer: { rain: 0, fire: 0, keys: 0, cafe: 0, brown: 0 },
  weeklyGoalHours: 0, preset: '25/5',
};

/** 한국 시간 기준 날짜(YYYY-MM-DD) */
export function kstDate(ms = Date.now()): string {
  return new Date(ms + 9 * 3600_000).toISOString().slice(0, 10);
}
/** 한국 시간 기준 시(0~23) */
export function kstHour(ms = Date.now()): number {
  return new Date(ms + 9 * 3600_000).getUTCHours();
}

export class WorkStore {
  private data: WorkData;

  constructor() {
    let saved: Partial<WorkData> = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<WorkData>;
    } catch {
      /* 저장소가 막혀 있어도 진행 */
    }
    this.data = { ...EMPTY, ...saved, mixer: { ...EMPTY.mixer, ...(saved.mixer ?? {}) } };
    if (!Array.isArray(this.data.sessions)) this.data.sessions = [];
    if (!Array.isArray(this.data.parking)) this.data.parking = [];
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* 저장 못 해도 진행 */
    }
  }

  get sessions(): WorkSessionRecord[] { return this.data.sessions; }
  get mixer(): MixerLevels { return this.data.mixer; }
  get weeklyGoalHours(): number { return this.data.weeklyGoalHours; }
  get preset(): string { return this.data.preset; }

  /** 오늘 목표(날짜가 바뀌면 비운다) */
  todayGoals(): DayGoals {
    const today = kstDate();
    if (this.data.goals?.date !== today) this.data.goals = { date: today, goals: [] };
    return this.data.goals;
  }
  setGoals(texts: string[]): void {
    const prev = this.todayGoals().goals;
    this.data.goals = {
      date: kstDate(),
      goals: texts.map((t) => t.trim().slice(0, 60)).filter(Boolean).slice(0, 3)
        .map((text) => ({ text, done: prev.find((g) => g.text === text)?.done ?? false })),
    };
    this.save();
  }
  toggleGoal(i: number): void {
    const g = this.todayGoals().goals[i];
    if (!g) return;
    g.done = !g.done;
    this.save();
  }

  addSession(s: WorkSessionRecord): void {
    this.data.sessions.push(s);
    if (this.data.sessions.length > 2000) this.data.sessions.splice(0, this.data.sessions.length - 2000);
    this.save();
  }
  /** 가장 최근 세션에 회고를 붙인다 */
  reviewLast(result: SessionResult, focus: number | null, memo: string): void {
    const s = this.data.sessions[this.data.sessions.length - 1];
    if (!s) return;
    s.result = result;
    s.focus = focus;
    s.memo = memo.trim().slice(0, 120);
    this.save();
  }

  get parking(): ParkedThought[] { return this.data.parking; }
  park(text: string): void {
    const t = text.trim().slice(0, 80);
    if (!t) return;
    this.data.parking.push({ text: t, at: Date.now() });
    if (this.data.parking.length > 50) this.data.parking.shift();
    this.save();
  }
  clearParking(): void {
    this.data.parking = [];
    this.save();
  }

  setMixer(layer: MixerLayer, v: number): void {
    this.data.mixer[layer] = Math.max(0, Math.min(100, Math.round(v)));
    this.save();
  }
  setWeeklyGoal(hours: number): void {
    this.data.weeklyGoalHours = Math.max(0, Math.min(100, Math.round(hours)));
    this.save();
  }
  setPreset(p: string): void {
    this.data.preset = p;
    this.save();
  }

  // ---------- 통계 ----------
  /** 날짜별 집중 시간(초) */
  byDay(): Map<string, number> {
    const m = new Map<string, number>();
    for (const s of this.data.sessions) m.set(kstDate(s.start), (m.get(kstDate(s.start)) ?? 0) + s.focusSec);
    return m;
  }
  todaySec(): number {
    return this.byDay().get(kstDate()) ?? 0;
  }
  /** 이번 주(월요일 시작) 집중 시간(초) */
  weekSec(): number {
    const now = Date.now();
    const dow = (new Date(now + 9 * 3600_000).getUTCDay() + 6) % 7;
    const days = this.byDay();
    let sum = 0;
    for (let i = 0; i <= dow; i++) sum += days.get(kstDate(now - i * 86400_000)) ?? 0;
    return sum;
  }
  monthSec(): number {
    const ym = kstDate().slice(0, 7);
    let sum = 0;
    for (const [d, v] of this.byDay()) if (d.startsWith(ym)) sum += v;
    return sum;
  }
  /** 오늘(또는 어제)까지 이어진 연속 출석일 */
  streak(): number {
    const days = this.byDay();
    let n = 0;
    let t = Date.now();
    if (!days.has(kstDate(t))) t -= 86400_000;
    while (days.has(kstDate(t))) {
      n++;
      t -= 86400_000;
    }
    return n;
  }
  /** 가장 많이 집중한 시간대(시작 시각 기준). 기록이 없으면 null */
  bestHour(): number | null {
    const h = new Array<number>(24).fill(0);
    for (const s of this.data.sessions) h[kstHour(s.start)] += s.focusSec;
    const max = Math.max(...h);
    return max > 0 ? h.indexOf(max) : null;
  }
  /** 최근 n주 히트맵(오래된 날부터). 값은 집중 시간(초) */
  heatmap(weeks = 12): { date: string; sec: number }[] {
    const days = this.byDay();
    const now = Date.now();
    const dow = (new Date(now + 9 * 3600_000).getUTCDay() + 6) % 7;
    const total = (weeks - 1) * 7 + dow + 1;
    return Array.from({ length: total }, (_, i) => {
      const date = kstDate(now - (total - 1 - i) * 86400_000);
      return { date, sec: days.get(date) ?? 0 };
    });
  }
  /** 회고를 남긴 세션 중 '했다' 비율(0~1). 없으면 null */
  doneRate(): number | null {
    const reviewed = this.data.sessions.filter((s) => s.result);
    return reviewed.length ? reviewed.filter((s) => s.result === 'done').length / reviewed.length : null;
  }
  csv(): string {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = this.data.sessions.map((s) => [
      kstDate(s.start), new Date(s.start + 9 * 3600_000).toISOString().slice(11, 16), new Date(s.end + 9 * 3600_000).toISOString().slice(11, 16),
      String(Math.round(s.focusSec / 60)), esc(s.room), esc(s.task),
      s.result === 'done' ? '했다' : s.result === 'partial' ? '일부' : s.result === 'not' ? '못 했다' : '', s.focus ? String(s.focus) : '', esc(s.memo),
    ].join(','));
    return `﻿날짜,시작,끝,집중(분),방,할 일,결과,집중도,메모\n${rows.join('\n')}\n`;
  }
}

export function fmtDuration(sec: number): string {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`;
}
