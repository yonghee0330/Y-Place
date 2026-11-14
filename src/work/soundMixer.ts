// 작업실 소리 믹서: 비·장작·키보드·카페 웅성임·브라운 노이즈를 Web Audio로 직접 합성한다(외부 음원 없음).
// AudioContext는 사용자가 슬라이더나 버튼을 누른 뒤에만 만든다.
import type { MixerLayer, MixerLevels } from './workStore';

export const MIXER_LAYERS: { id: MixerLayer; label: string }[] = [
  { id: 'rain', label: '빗소리' },
  { id: 'fire', label: '장작' },
  { id: 'keys', label: '키보드' },
  { id: 'cafe', label: '카페 웅성임' },
  { id: 'brown', label: '브라운 노이즈' },
];

function noiseBuffer(ctx: AudioContext, sec: number, brown: boolean): AudioBuffer {
  const buf = ctx.createBuffer(2, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    // 이어 붙는 자리의 '딱' 소리를 없앤다
    const fade = Math.min(2000, d.length >> 2);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] *= k;
      d[d.length - 1 - i] *= k;
    }
  }
  return buf;
}

export class SoundMixer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private gains = new Map<MixerLayer, GainNode>();
  private timers: number[] = [];
  private levels: MixerLevels;
  private muted = false;

  constructor(levels: MixerLevels) {
    this.levels = { ...levels };
  }

  /** 어느 층이든 소리가 켜져 있는지 */
  get anyOn(): boolean {
    return Object.values(this.levels).some((v) => v > 0);
  }

  private ensure(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    const white = noiseBuffer(ctx, 4, false);
    const brown = noiseBuffer(ctx, 5, true);
    const layer = (id: MixerLayer) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.master!);
      this.gains.set(id, g);
      return g;
    };
    const loop = (buf: AudioBuffer) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start();
      return s;
    };
    const filter = (type: BiquadFilterType, freq: number, q = 0.7) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      return f;
    };
    const lfo = (target: AudioParam, hz: number, depth: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = hz;
      g.gain.value = depth;
      o.connect(g).connect(target);
      o.start();
    };

    // 비: 높은 대역 잡음 + 낮게 깔리는 소리, 세기가 천천히 출렁인다
    {
      const out = layer('rain');
      const hi = ctx.createGain();
      hi.gain.value = 0.22;
      loop(white).connect(filter('highpass', 1800)).connect(filter('lowpass', 7500)).connect(hi).connect(out);
      lfo(hi.gain, 0.13, 0.05);
      const low = ctx.createGain();
      low.gain.value = 0.5;
      loop(brown).connect(filter('lowpass', 500)).connect(low).connect(out);
    }
    // 브라운 노이즈
    {
      const out = layer('brown');
      const g = ctx.createGain();
      g.gain.value = 0.9;
      loop(brown).connect(filter('lowpass', 900)).connect(g).connect(out);
    }
    // 장작: 낮은 웅웅거림 + 불규칙하게 튀는 소리
    {
      const out = layer('fire');
      const bed = ctx.createGain();
      bed.gain.value = 0.55;
      loop(brown).connect(filter('bandpass', 260, 0.5)).connect(bed).connect(out);
      lfo(bed.gain, 0.31, 0.12);
      const crackle = () => {
        if (this.levels.fire > 0 && !this.muted && ctx.state === 'running') {
          const n = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) this.burst(out, white, 900 + Math.random() * 2600, 0.012 + Math.random() * 0.03, 0.12 + Math.random() * 0.3, Math.random() * 0.25);
        }
        this.timers.push(window.setTimeout(crackle, 120 + Math.random() * 700));
      };
      crackle();
    }
    // 키보드: 짧은 딸깍 소리가 몇 번 몰아서 났다가 쉰다
    {
      const out = layer('keys');
      const type = () => {
        let wait = 600 + Math.random() * 2600;
        if (this.levels.keys > 0 && !this.muted && ctx.state === 'running') {
          const n = 3 + Math.floor(Math.random() * 14);
          let t = 0;
          for (let i = 0; i < n; i++) {
            t += 0.07 + Math.random() * 0.14;
            this.burst(out, white, 1800 + Math.random() * 2200, 0.018, 0.1 + Math.random() * 0.12, t);
            if (Math.random() < 0.12) this.burst(out, brown, 300, 0.05, 0.5, t);
          }
          wait += t * 1000;
        }
        this.timers.push(window.setTimeout(type, wait));
      };
      type();
    }
    // 카페: 사람 목소리 대역의 잡음이 출렁이고, 가끔 잔 부딪는 소리
    {
      const out = layer('cafe');
      for (const [freq, hz, gain] of [[380, 0.21, 0.5], [720, 0.33, 0.36], [1250, 0.47, 0.2]] as const) {
        const g = ctx.createGain();
        g.gain.value = gain;
        loop(brown).connect(filter('bandpass', freq, 0.9)).connect(g).connect(out);
        lfo(g.gain, hz, gain * 0.45);
      }
      const clink = () => {
        if (this.levels.cafe > 0 && !this.muted && ctx.state === 'running') this.ping(out, 1700 + Math.random() * 1400, 0.035, 0.5);
        this.timers.push(window.setTimeout(clink, 5000 + Math.random() * 11000));
      };
      this.timers.push(window.setTimeout(clink, 4000));
    }
    for (const { id } of MIXER_LAYERS) this.apply(id);
    return ctx;
  }

  /** 잡음을 짧게 끊어 낸 소리(딸깍·탁) */
  private burst(out: AudioNode, buf: AudioBuffer, freq: number, dur: number, gain: number, delay: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 2);
    s.stop(t + dur + 0.02);
  }

  private ping(out: AudioNode, freq: number, gain: number, dur: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private apply(id: MixerLayer): void {
    const g = this.gains.get(id);
    if (!g || !this.ctx) return;
    const v = this.levels[id] / 100;
    g.gain.setTargetAtTime(v * v * 0.7, this.ctx.currentTime, 0.15);
  }

  /** 슬라이더 조작(사용자 동작)에서 부른다 */
  setLevel(id: MixerLayer, v: number): void {
    this.levels[id] = Math.max(0, Math.min(100, v));
    if (this.levels[id] > 0) this.ensure();
    this.apply(id);
  }

  /** 작업실을 나가면 조용히, 돌아오면 다시 */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!muted && this.anyOn) this.ensure();
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.2);
  }

  /** 부드러운 종소리(집중·휴식이 끝났을 때). 믹서를 켜지 않았어도 난다 */
  chime(kind: 'focus' | 'break'): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const notes = kind === 'focus' ? [659.3, 880] : [880, 659.3];
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.42;
      for (const [mul, gain] of [[1, 0.16], [2.01, 0.05], [3.02, 0.02]] as const) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * mul;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + 2.5);
      }
    });
  }

  status(): { state: string; levels: MixerLevels; muted: boolean } {
    return { state: this.ctx?.state ?? 'none', levels: { ...this.levels }, muted: this.muted };
  }
}
