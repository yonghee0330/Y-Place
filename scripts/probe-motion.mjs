// 이동·카메라 부드러움 측정: 걷기 출발·정지 속도, 가속도, 몸 회전 속도, 카메라 360° 회전 중 튐·아바타 가림.
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/probe-motion.mjs
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const p = await browser.newPage({ viewport: { width: 960, height: 640 } });
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('http://127.0.0.1:4173/?seed=1&npc=0&quality=low&presence=local&weather=clear&autostart=1');
await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
await p.waitForTimeout(1500);

// 프레임마다 내 위치·방향·카메라를 기록
await p.evaluate(() => {
  const Y = window.__YONGSEOJEOM;
  window.__probe = [];
  const tick = () => {
    const s = Y.me();
    window.__probe.push({ t: performance.now(), x: s.position[0], z: s.position[2], ry: s.rotationY, cam: Y.camera().position, vis: Y.meVisible() });
    window.__probeRaf = requestAnimationFrame(tick);
  };
  tick();
});
const take = async () => p.evaluate(() => { const r = window.__probe; window.__probe = []; return r; });
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function walkStats(f) {
  const sp = [];
  for (let i = 1; i < f.length; i++) {
    const dt = (f[i].t - f[i - 1].t) / 1000;
    if (dt <= 0) continue;
    sp.push({ v: Math.hypot(f[i].x - f[i - 1].x, f[i].z - f[i - 1].z) / dt, w: Math.abs(wrap(f[i].ry - f[i - 1].ry)) / dt, dt });
  }
  const moving = sp.map((s) => s.v > 0.02);
  const first = moving.indexOf(true), last = moving.lastIndexOf(true);
  let maxAcc = 0;
  for (let i = Math.max(1, first); i <= last + 1 && i < sp.length; i++) maxAcc = Math.max(maxAcc, Math.abs(sp[i].v - sp[i - 1].v) / sp[i].dt);
  return {
    frames: sp.length,
    startSpeed: +sp[first]?.v.toFixed(2),
    stopSpeed: +sp[last]?.v.toFixed(2),
    maxAccel: +maxAcc.toFixed(1),
    maxTurnRate: +Math.max(...sp.map((s) => s.w)).toFixed(1),
  };
}

const out = {};
// 1) 모서리가 있는 경로 걷기(라운지)
await p.evaluate(() => window.__YONGSEOJEOM.teleport(-1.6, 1.2, 0));
await p.waitForTimeout(600); await take();
await p.evaluate(() => window.__YONGSEOJEOM.walkTo(1.6, -1.5));
await p.waitForFunction(() => window.__YONGSEOJEOM.me().state !== 'walk', {}, { timeout: 30000 });
await p.waitForTimeout(500);
out.walk = walkStats(await take());

async function orbit() {
  await p.waitForTimeout(1500); await take();
  await p.mouse.move(100, 320); await p.mouse.down();
  for (let i = 0; i < 2; i++) {
    for (let x = 100; x <= 880; x += 10) await p.mouse.move(x, 320);
    await p.mouse.up(); await p.mouse.move(100, 320); await p.mouse.down();
  }
  await p.mouse.up();
  await p.waitForTimeout(1200);
  const f = await take();
  let maxCamJump = 0, yawJumps = 0, hidden = 0, prevYaw = null;
  // 첫 표본은 자리 이동 직후 프레임과 섞일 수 있어 건너뛴다
  for (let i = 2; i < f.length; i++) {
    const [ax, ay, az] = f[i - 1].cam, [bx, by, bz] = f[i].cam;
    const dt = Math.max(1e-3, (f[i].t - f[i - 1].t) / 1000);
    maxCamJump = Math.max(maxCamJump, Math.hypot(bx - ax, by - ay, bz - az) / dt);
    const yaw = Math.atan2(bx - f[i].x, bz - f[i].z);
    if (prevYaw !== null && Math.abs(wrap(yaw - prevYaw)) > 0.5) yawJumps++;
    prevYaw = yaw;
    if (!f[i].vis) hidden++;
  }
  const jumps = f.slice(1).map((b, i) => ({ i, d: +Math.hypot(b.cam[0]-f[i].cam[0], b.cam[1]-f[i].cam[1], b.cam[2]-f[i].cam[2]).toFixed(3), dt: +(b.t-f[i].t).toFixed(1), cam: b.cam.map((v) => +v.toFixed(2)) })).sort((a, b) => b.d - a.d).slice(0, 3);
  if (process.env.DEBUG) console.error(JSON.stringify(jumps));
  return { frames: f.length, maxCamSpeed: +maxCamJump.toFixed(1), yawJumpsOver30deg: yawJumps, hiddenFrames: hidden };
}
// 2) 라운지 입장 자리에서 카메라 360°×2 드래그
await p.evaluate(() => window.__YONGSEOJEOM.teleport(0.1, 1.05, Math.PI));
out.orbitShop = await orbit();
// 3) 작은 모임방 벽 쪽 의자에 앉아 360°×2 (예전엔 시점이 휙 돌던 곳)
await p.evaluate(() => window.__YONGSEOJEOM.enterSpace('circle'));
await p.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
for (const id of ['circle-1', 'circle-4']) {
  await p.evaluate((sid) => window.__YONGSEOJEOM.placeAtSeat(sid), id);
  out[`orbit-${id}`] = await orbit();
}
console.log(JSON.stringify({ ...out, errors }));
await browser.close();
