// 뼈 없는 트랜스폼 애니메이션: 숨쉬기, 걷기, 앉기 전환, 읽기(책 들고 고개 숙임, 가끔 페이지 넘김), 눈인사, 마시기, 깜빡임.
import { DRINK_OPTIONS, DRINK_TIMING, drinkAnimDuration, type DrinkKind } from '../net/drink';
import type { AvatarState } from '../net/presence';
import * as THREE from 'three';
import { CUP_POS, HIP_Y, type Avatar } from './avatar';

const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const T = DRINK_TIMING;

// 앉기: 허벅지를 앞으로 거의 수평, 무릎을 굽혀 정강이를 수직으로
const SIT_THIGH = 1.5;
const SIT_KNEE = 1.5;
// 팔 포즈(어깨 x·z 회전, 팔꿈치 굽힘). 오른팔 기준 z, 왼팔은 부호 반대.
/** 양손으로 가슴 앞에 책 들기 */
const READ = { x: -0.3, z: 0.28, elbow: -1.5 };
/** 잔을 가슴 앞에 들고 있기 */
const HOLD = { x: -0.3, z: 0.18, elbow: -1.3 };
/** 잔을 입에 대기 */
const MOUTH = { x: -1.7, z: 0.35, elbow: -1.5 };

const _qa = new THREE.Quaternion();
const _qf = new THREE.Quaternion();
const _qt = new THREE.Quaternion();
const _x = new THREE.Vector3(1, 0, 0);
const _off = new THREE.Vector3();

function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function pulse(t: number, period: number): number {
  return 0.5 - 0.5 * Math.cos((t / period) * Math.PI * 2);
}

/** 커피·차 한 모금 구간의 입·기울기 가중치. */
function sipStroke(local: number): { toMouth: number; tip: number } {
  const { sipUp, sipTip, sipDown } = T;
  if (local < sipUp) {
    return { toMouth: easeInOut(local / sipUp), tip: 0 };
  }
  if (local < sipUp + sipTip) {
    const u = (local - sipUp) / sipTip;
    const tip = u < 0.55 ? easeInOut(u / 0.55) : easeInOut(1 - (u - 0.55) / 0.45);
    return { toMouth: 1, tip };
  }
  if (local < sipUp + sipTip + sipDown) {
    const u = (local - sipUp - sipTip) / sipDown;
    return { toMouth: 1 - easeInOut(u) * 0.55, tip: 0 };
  }
  return { toMouth: 0.45, tip: 0 };
}

interface DrinkPose {
  /** 0=내림, 1=입에 댐 */
  mouth: number;
  /** 잔 기울임(마시기) */
  tip: number;
  /** 손에 들고 있는 정도(모금 사이) */
  hold: number;
  done: boolean;
}

function waterPose(t: number): DrinkPose {
  const end = T.waterRaise + T.waterGulp + T.waterLower;
  if (t >= end) return { mouth: 0, tip: 0, hold: 0, done: true };
  if (t < T.waterRaise) {
    const u = easeInOut(t / T.waterRaise);
    return { mouth: u, tip: u * 0.35, hold: 0, done: false };
  }
  if (t < T.waterRaise + T.waterGulp) {
    const g = t - T.waterRaise;
    // 벌컥벌컥: 잔을 입에 붙인 채 빠르게 기울였다 세움
    const gulp = pulse(g, 0.34);
    return { mouth: 1, tip: 0.55 + 0.45 * gulp, hold: 0, done: false };
  }
  const u = easeInOut((t - T.waterRaise - T.waterGulp) / T.waterLower);
  return { mouth: 1 - u, tip: (1 - u) * 0.25, hold: 0, done: false };
}

function multiSipPose(t: number, sips: number, pause: number): DrinkPose {
  const cycle = T.sipUp + T.sipTip + T.sipDown + pause;
  const active = T.raise + sips * cycle - pause; // 마지막 모금 뒤 휴식 생략
  const end = active + T.lower;
  if (t >= end) return { mouth: 0, tip: 0, hold: 0, done: true };

  if (t < T.raise) {
    const u = easeInOut(t / T.raise);
    return { mouth: 0, tip: 0, hold: u, done: false };
  }

  const afterRaise = t - T.raise;
  if (afterRaise < active - T.raise) {
    const i = Math.min(sips - 1, Math.floor(afterRaise / cycle));
    const local = afterRaise - i * cycle;
    const stroke = T.sipUp + T.sipTip + T.sipDown;
    if (local >= stroke) {
      return { mouth: 0.42, tip: 0, hold: 1, done: false };
    }
    const { toMouth, tip } = sipStroke(local);
    const hold = 1 - toMouth * 0.85;
    return { mouth: toMouth, tip, hold, done: false };
  }

  const u = easeInOut((t - active) / T.lower);
  return { mouth: 0, tip: 0, hold: 1 - u, done: false };
}

function drinkPose(kind: DrinkKind, t: number): DrinkPose {
  if (kind === 'water') return waterPose(t);
  if (kind === 'coffee') return multiSipPose(t, T.coffeeSips, T.coffeePause);
  return multiSipPose(t, T.teaSips, T.teaPause);
}

export class AvatarAnimator {
  state: AvatarState = 'stand';
  /** 앉아 있는지(읽기 상태에서도 앉아 있을 수 있다) */
  seated = false;
  /** 걷는 속도(m/s). 다리 흔들기 빠르기에 쓴다. */
  speed = 0;

  private walkW = 0;
  private sitW = 0;
  private readW = 0;
  private phase = 0;
  private bowT = -1;
  private sipT = -1;
  private sipKind: DrinkKind = 'water';
  private blinkT = -1;
  private nextBlink = 2 + Math.random() * 3;
  private pageT = -1;
  private nextPage = 4 + Math.random() * 4;
  private time = 0;

  constructor(private a: Avatar) {}

  setState(s: AvatarState, seated: boolean): void {
    this.state = s;
    this.seated = seated || s === 'sit';
  }

  /** 눈인사: 0.8초 고개 숙임 */
  bow(): void {
    this.bowT = 0;
  }

  get bowing(): boolean {
    return this.bowT >= 0;
  }

  /** 음료 마시기: 종류별 모션(물=벌컥, 커피=5모금, 차=10모금) */
  sip(kind: DrinkKind): void {
    this.sipT = 0;
    this.sipKind = kind;
    const hex = DRINK_OPTIONS.find((d) => d.id === kind)?.color ?? '#9ec9e0';
    this.a.setCupLiquid(hex);
    this.a.cup.visible = true;
  }

  get sipping(): boolean {
    return this.sipT >= 0;
  }

  update(dt: number, _t: number): void {
    const a = this.a;
    this.time += dt;
    const walking = this.state === 'walk';
    const reading = this.state === 'read';
    this.walkW = damp(this.walkW, walking ? 1 : 0, 10, dt);
    this.sitW = damp(this.sitW, this.seated ? 1 : 0, 7, dt);
    this.readW = damp(this.readW, reading ? 1 : 0, 6, dt);
    this.phase += dt * (6 + this.speed * 5) * (walking ? 1 : 0.3);

    const swing = Math.sin(this.phase) * this.walkW;
    const stride = Math.cos(this.phase) * this.walkW;
    const breath = Math.sin(this.time * 2.1);

    // 몸통: 숨쉬기 + 걸을 때 위아래 + 앉을 때 살짝 뒤로
    a.body.position.y = HIP_Y + Math.abs(Math.sin(this.phase)) * 0.02 * this.walkW;
    a.body.scale.set(1 - breath * 0.004, 1 + breath * 0.008, 1 - breath * 0.004);
    a.body.rotation.x = -0.07 * this.sitW + 0.04 * this.walkW;
    a.body.rotation.z = Math.sin(this.phase) * 0.025 * this.walkW;
    a.body.rotation.y = Math.sin(this.phase) * 0.06 * this.walkW;

    // 다리: 허벅지 흔들기 + 앞으로 나가는 다리의 무릎 굽힘. 앉으면 허벅지 수평, 정강이 수직.
    a.legL.rotation.x = swing * 0.5 - SIT_THIGH * this.sitW;
    a.legR.rotation.x = -swing * 0.5 - SIT_THIGH * this.sitW;
    a.shinL.rotation.x = SIT_KNEE * this.sitW + (0.08 * this.walkW + 0.75 * Math.max(0, -stride)) * (1 - this.sitW);
    a.shinR.rotation.x = SIT_KNEE * this.sitW + (0.08 * this.walkW + 0.75 * Math.max(0, stride)) * (1 - this.sitW);

    // 마시기 포즈
    let drinkMouth = 0;
    let drinkTip = 0;
    let drinkHold = 0;
    if (this.sipT >= 0) {
      this.sipT += dt;
      const pose = drinkPose(this.sipKind, this.sipT);
      drinkMouth = pose.mouth;
      drinkTip = pose.tip;
      drinkHold = pose.hold;
      if (pose.done || this.sipT > drinkAnimDuration(this.sipKind) + 0.05) {
        this.sipT = -1;
        a.cup.visible = false;
        drinkMouth = 0;
        drinkTip = 0;
        drinkHold = 0;
      }
    }
    const present = Math.max(drinkHold, drinkMouth * 0.85);
    const m = drinkMouth;
    const sipMute = 1 - Math.min(1, Math.max(present, m) * 1.1);

    // 팔: 걷기(다리와 반대) → 읽기(양손으로 책) → 잔 들기 → 입으로
    const rW = this.readW * sipMute;
    const hangX = (s: number) => s * 0.42;
    const relaxElbow = -0.12 - 0.28 * this.walkW - 0.1 * this.sitW;
    a.armL.rotation.x = lerp(hangX(-swing), READ.x, rW);
    a.armL.rotation.z = lerp(0.07, -READ.z, rW);
    a.foreL.rotation.x = lerp(relaxElbow - 0.15 * Math.max(0, swing), READ.elbow, rW);

    let rx = lerp(hangX(swing), READ.x, rW);
    let rz = lerp(-0.07, READ.z, rW);
    let re = lerp(relaxElbow - 0.15 * Math.max(0, -swing), READ.elbow, rW);
    rx = lerp(rx, HOLD.x, present); rz = lerp(rz, HOLD.z, present); re = lerp(re, HOLD.elbow, present);
    rx = lerp(rx, MOUTH.x, m); rz = lerp(rz, MOUTH.z, m); re = lerp(re, MOUTH.elbow, m);

    // 머리: 읽을 때 숙임. 마실 때는 입으로 갈 때 살짝 숙이고, 기울일 땐 고개를 젖힌다.
    let headX = 0.3 * rW + Math.sin(this.time * 0.9) * 0.02 * (1 - this.walkW) + 0.1 * m - 0.12 * drinkTip;
    let headZ = Math.sin(this.time * 0.6) * 0.03 * (1 - this.walkW) * (1 - this.readW) * sipMute;

    // 가끔 페이지 넘기는 손짓
    if (this.readW > 0.8) {
      this.nextPage -= dt;
      if (this.nextPage <= 0 && this.pageT < 0) {
        this.pageT = 0;
        this.nextPage = 5 + Math.random() * 6;
      }
    }
    if (this.pageT >= 0) {
      this.pageT += dt;
      const k = Math.sin(Math.min(1, this.pageT / 0.7) * Math.PI) * sipMute;
      rz += 0.35 * k;
      re += 0.35 * k;
      headZ += 0.04 * k;
      if (this.pageT > 0.7) this.pageT = -1;
    }
    a.armR.rotation.set(rx, 0, rz);
    a.foreR.rotation.x = re;

    // 눈인사
    if (this.bowT >= 0) {
      this.bowT += dt;
      const k = Math.sin(Math.min(1, this.bowT / 0.8) * Math.PI);
      headX += 0.4 * k;
      a.body.rotation.x += 0.22 * k;
      if (this.bowT > 0.8) this.bowT = -1;
    }

    // 잔: 손에 붙어 다니되 늘 세워 두고(팔 회전을 되돌림), 마실 땐 입 쪽으로 기울인다.
    if (this.sipT >= 0) {
      a.cup.visible = true;
      a.cup.scale.setScalar(0.9 + 0.12 * present);
      _qa.setFromEuler(a.armR.rotation);
      _qf.setFromEuler(a.foreR.rotation);
      _qa.multiply(_qf).invert();
      _qt.setFromAxisAngle(_x, -(0.12 * present + (0.1 + 0.95 * drinkTip) * m + 0.3 * drinkTip * (1 - m)));
      // 손이 잔 옆면을 감싸도록: 똑바로 선 잔 기준으로 몸 안쪽·아래로 조금 옮긴다
      a.cup.position.copy(_off.set(0.021, -0.025, 0.005).applyQuaternion(_qa)).add(CUP_POS);
      a.cup.quaternion.copy(_qa.multiply(_qt));
      a.body.rotation.x += -0.02 * drinkTip;
    } else {
      a.cup.visible = false;
    }

    a.head.rotation.x = headX;
    a.head.rotation.z = headZ;

    // 깜빡임
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blinkT = 0;
      this.nextBlink = 2.5 + Math.random() * 3.5;
    }
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      a.eyes.scale.y = this.blinkT < 0.13 ? 0.12 : 1;
      if (this.blinkT >= 0.13) this.blinkT = -1;
    }

    a.book.visible = this.readW > 0.45 && this.sipT < 0;
    a.book.scale.setScalar(0.85 * Math.min(1, this.readW * 1.3));
  }
}
