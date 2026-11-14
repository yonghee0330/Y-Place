// 작업실 책상 위에서 타이머 상태를 보여 주는 사물들:
// 탁상시계(진행 링), '집중 중' 팻말, 스탠드 불빛과 빛 속 먼지, 쉬는 시간 머그잔 김.
// 방은 한 번에 하나만 보이므로 한 벌을 만들어 지금 방의 책상 자리로 옮겨 쓴다.
import * as THREE from 'three';
import { bevelBox } from '../scene/geom';

export type DeskPhase = 'idle' | 'focus' | 'break' | 'paused';

export interface DeskState {
  phase: DeskPhase;
  /** 0~1 진행(스톱워치는 60분에 한 바퀴) */
  progress: number;
  /** 시계에 적을 글자(예: 24:10) */
  label: string;
  /** 자리에 앉아 있으면 스탠드를 켠다 */
  seated: boolean;
}

const DUST = 46;

export class DeskFx {
  readonly group = new THREE.Group();
  private clockCanvas = document.createElement('canvas');
  private clockTex: THREE.CanvasTexture;
  private sign: THREE.Group;
  private lamp: THREE.SpotLight;
  private bulb: THREE.Mesh;
  private steam: THREE.Mesh[] = [];
  private dust: THREE.Points;
  private dustSeed: Float32Array;
  private lastKey = '';
  private lampLevel = 0;
  private steamLevel = 0;
  private state: DeskState = { phase: 'idle', progress: 0, label: '', seated: false };

  constructor(private reducedMotion: () => boolean) {
    this.group.name = 'desk-fx';
    this.group.visible = false;

    // ---- 탁상시계: 둥근 나무 몸통 + 받침 + 진행 링이 그려지는 문자판 ----
    const clock = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a623c, roughness: 0.75 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.04, 40).rotateX(Math.PI / 2), wood);
    body.position.y = 0.074;
    const foot = new THREE.Mesh(bevelBox(0.09, 0.014, 0.05, 0.004, 2), wood);
    foot.position.y = 0.007;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.005, 10, 40), new THREE.MeshStandardMaterial({ color: 0x9a7440, metalness: 0.8, roughness: 0.4 }));
    rim.position.set(0, 0.074, 0.02);
    this.clockCanvas.width = this.clockCanvas.height = 256;
    this.clockTex = new THREE.CanvasTexture(this.clockCanvas);
    this.clockTex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.055, 40), new THREE.MeshStandardMaterial({ map: this.clockTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: this.clockTex, emissiveIntensity: 0.12 }));
    face.position.set(0, 0.074, 0.0205);
    clock.add(body, foot, rim, face);
    clock.position.set(0.5, 0, 0.13);
    clock.rotation.y = 0.12;
    for (const m of [body, foot, rim]) m.castShadow = true;
    this.group.add(clock);

    // ---- '집중 중' 팻말(접은 종이 세움판) ----
    this.sign = new THREE.Group();
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const g = c.getContext('2d')!;
    const paint = () => {
      g.fillStyle = '#f4ecd9';
      g.fillRect(0, 0, 256, 128);
      g.strokeStyle = '#2e3a4a';
      g.lineWidth = 5;
      g.strokeRect(9, 9, 238, 110);
      g.fillStyle = '#2e3a4a';
      g.font = '700 54px "Noto Serif KR", serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('집중 중', 128, 68);
    };
    paint();
    const signTex = new THREE.CanvasTexture(c);
    signTex.colorSpace = THREE.SRGBColorSpace;
    void document.fonts.ready.then(() => {
      paint();
      signTex.needsUpdate = true;
    });
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf4ecd9, roughness: 0.9 });
    const front = new THREE.Mesh(bevelBox(0.15, 0.078, 0.004, 0.0015, 1), cardMat);
    front.position.set(0, 0.038, 0.018);
    front.rotation.x = -0.42;
    const back = front.clone();
    back.position.z = -0.018;
    back.rotation.x = 0.42;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.146, 0.073), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.9 }));
    label.position.set(0, 0.0385, 0.0205);
    label.rotation.x = -0.42;
    front.castShadow = back.castShadow = true;
    this.sign.add(front, back, label);
    this.sign.position.set(-0.47, 0, 0.21);
    this.sign.rotation.y = 0.3;
    this.sign.visible = false;
    this.group.add(this.sign);

    // ---- 스탠드 불빛(책상 면을 비춘다) + 전구 ----
    this.lamp = new THREE.SpotLight(0xffd9a0, 0, 2.2, 0.85, 0.7, 1.6);
    this.lamp.position.set(-0.19, 0.39, -0.11);
    this.lamp.target.position.set(0.02, 0, 0.08);
    this.group.add(this.lamp, this.lamp.target);
    this.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffc773, emissiveIntensity: 0, roughness: 0.3 }));
    this.bulb.position.set(-0.19, 0.385, -0.11);
    this.group.add(this.bulb);

    // ---- 빛 속 먼지 ----
    const pos = new Float32Array(DUST * 3);
    this.dustSeed = new Float32Array(DUST * 4);
    for (let i = 0; i < DUST; i++) {
      this.dustSeed[i * 4] = Math.random() * 0.7 - 0.45;
      this.dustSeed[i * 4 + 1] = Math.random();
      this.dustSeed[i * 4 + 2] = Math.random() * 0.5 - 0.25;
      this.dustSeed[i * 4 + 3] = Math.random() * 6.28;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.006, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true }));
    this.dust.frustumCulled = false;
    this.group.add(this.dust);

    // ---- 머그잔 김(쉬는 시간) ----
    const sc = document.createElement('canvas');
    sc.width = sc.height = 64;
    const sg = sc.getContext('2d')!;
    const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 64, 64);
    const steamTex = new THREE.CanvasTexture(sc);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.09), new THREE.MeshBasicMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false, color: 0xfff6ea }));
      m.position.set(-0.33, 0.12, 0.13);
      m.userData.phase = i / 4;
      this.steam.push(m);
      this.group.add(m);
    }
    this.drawClock();
  }

  /** 지금 방의 책상(바닥 중앙 x·z, 방향 ry, 상판 높이 h)에 맞춘다. 책상이 없는 방이면 숨긴다. */
  place(desk: { x: number; z: number; ry: number; h: number } | null): void {
    this.group.visible = !!desk;
    if (!desk) return;
    this.group.position.set(desk.x, desk.h, desk.z);
    this.group.rotation.y = desk.ry;
    this.group.updateMatrixWorld(true);
  }

  set(state: DeskState): void {
    this.state = state;
    this.sign.visible = state.phase === 'focus';
    const key = `${state.phase}|${state.label}|${Math.round(state.progress * 240)}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.drawClock();
    }
  }

  private drawClock(): void {
    const g = this.clockCanvas.getContext('2d')!;
    const { phase, progress, label } = this.state;
    g.fillStyle = '#f6efe0';
    g.fillRect(0, 0, 256, 256);
    // 눈금 12개
    g.strokeStyle = '#b8a98c';
    g.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(128 + Math.sin(a) * 104, 128 - Math.cos(a) * 104);
      g.lineTo(128 + Math.sin(a) * 114, 128 - Math.cos(a) * 114);
      g.stroke();
    }
    // 바탕 링 + 진행 링(집중은 남색, 휴식은 초록)
    g.lineWidth = 16;
    g.strokeStyle = '#e3d8c2';
    g.beginPath();
    g.arc(128, 128, 88, 0, Math.PI * 2);
    g.stroke();
    if (phase !== 'idle') {
      g.strokeStyle = phase === 'break' ? '#5b8a5a' : phase === 'paused' ? '#a89878' : '#2e3a4a';
      g.lineCap = 'round';
      g.beginPath();
      g.arc(128, 128, 88, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.004, Math.min(1, progress)));
      g.stroke();
      g.lineCap = 'butt';
    }
    g.fillStyle = '#2c2a24';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 50px "Pretendard Variable", Pretendard, system-ui, sans-serif';
    g.fillText(label || '--:--', 128, 124);
    g.font = '600 22px "Pretendard Variable", Pretendard, system-ui, sans-serif';
    g.fillStyle = '#7a6f5c';
    g.fillText(phase === 'focus' ? '집중' : phase === 'break' ? '휴식' : phase === 'paused' ? '멈춤' : '준비', 128, 168);
    this.clockTex.needsUpdate = true;
  }

  update(dt: number, t: number, camera: THREE.Camera): void {
    if (!this.group.visible) return;
    const k = 1 - Math.exp(-dt * 3);
    // 스탠드: 앉으면 켜지고, 집중 중에는 조금 더 밝다(깜빡임 없이 부드럽게)
    const lampTarget = this.state.seated ? (this.state.phase === 'focus' ? 1 : 0.7) : 0;
    this.lampLevel += (lampTarget - this.lampLevel) * k;
    this.lamp.intensity = this.lampLevel * 2.4;
    (this.bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = this.lampLevel * 6;
    // 먼지: 불빛 아래에서 아주 천천히 떠다닌다
    const still = this.reducedMotion();
    const dm = this.dust.material as THREE.PointsMaterial;
    dm.opacity = this.lampLevel * 0.55;
    if (this.lampLevel > 0.02) {
      const p = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
      const tt = still ? 0 : t;
      for (let i = 0; i < DUST; i++) {
        const s = this.dustSeed, o = i * 4;
        p.setXYZ(i,
          s[o] + Math.sin(tt * 0.11 + s[o + 3]) * 0.05,
          0.03 + ((s[o + 1] + tt * 0.006) % 1) * 0.36,
          s[o + 2] + Math.cos(tt * 0.09 + s[o + 3] * 1.7) * 0.05);
      }
      p.needsUpdate = true;
    }
    // 김: 쉬는 시간에만 피어오른다
    this.steamLevel += ((this.state.phase === 'break' ? 1 : 0) - this.steamLevel) * k;
    for (const m of this.steam) {
      const mat = m.material as THREE.MeshBasicMaterial;
      if (this.steamLevel < 0.02) {
        mat.opacity = 0;
        continue;
      }
      const ph = still ? m.userData.phase as number : ((t * 0.22 + (m.userData.phase as number)) % 1);
      m.position.set(-0.33 + Math.sin(ph * 5 + (m.userData.phase as number) * 9) * 0.012, 0.1 + ph * 0.16, 0.13);
      m.scale.setScalar(0.7 + ph * 0.9);
      mat.opacity = Math.sin(ph * Math.PI) * 0.34 * this.steamLevel;
      m.quaternion.copy(camera.quaternion);
    }
  }
}
