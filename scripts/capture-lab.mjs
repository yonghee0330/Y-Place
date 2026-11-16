// 실험실 공간 점검: 로비·책방·서재·모임방·전시실의 전체 모습과 입장 직후 따라가기 시점.
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/capture-lab.mjs <단계명>
import { chromium } from '@playwright/test';
const stage = process.argv[2] || '14-lab';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const VIEWS = {
  shop: { pos: [4.4, 2.7, 3.2], tgt: [-1.2, 0.7, -1.2] },
  bookshop: { pos: [3.1, 2.4, 2.5], tgt: [-0.8, 0.8, -0.9] },
  library: { pos: [2.7, 2.3, 2.3], tgt: [-0.6, 0.8, -0.8] },
  circle: { pos: [1.8, 2.2, 1.9], tgt: [-0.4, 0.6, -0.5] },
  gallery: { pos: [3.1, 2.4, 2.3], tgt: [-0.8, 1.0, -0.9] },
};
const vis = {};
for (const [vp, viewport] of [['desktop', { width: 1280, height: 860 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await browser.newPage({ viewport });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('http://127.0.0.1:4173/?seed=1&quality=low&presence=local&weather=clear&autostart=1&npcchat=local');
  await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
  for (const id of Object.keys(VIEWS)) {
    if (id !== 'shop') {
      await p.evaluate((s) => window.__YONGSEOJEOM.enterSpace(s), id);
      await p.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
    }
    await p.waitForTimeout(1800);
    vis[`${vp}-${id}`] = await p.evaluate(() => window.__YONGSEOJEOM.meVisible());
    await p.screenshot({ path: `docs/screens/${stage}-${vp}-${id}-entry.png` });
  }
  await p.close();
}
// 전체 모습: 고정 카메라(cam=overview)로 방마다 대각선 구도
const o = await browser.newPage({ viewport: { width: 1280, height: 860 } });
o.on('pageerror', (e) => errors.push(e.message));
await o.goto('http://127.0.0.1:4173/?seed=1&quality=low&presence=local&weather=clear&cam=overview&npcchat=local');
await o.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
for (const id of Object.keys(VIEWS)) {
  if (id !== 'shop') {
    await o.evaluate((s) => window.__YONGSEOJEOM.enterSpace(s), id);
    await o.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
  }
  const v = VIEWS[id];
  await o.evaluate(([a, b]) => window.__YONGSEOJEOM.teleport(99, 99, 0), [0, 0]);
  await o.evaluate(([a, b]) => window.__YONGSEOJEOM.cameraAt(a, b, 62), [v.pos, v.tgt]);
  await o.waitForTimeout(1500);
  await o.screenshot({ path: `docs/screens/${stage}-overview-${id}.png` });
}
console.log(JSON.stringify({ visible: vis, errors }));
await browser.close();
