// 전방향 시점 점검: 라운지·작은 모임방에서 카메라를 90°씩 돌려 아바타와 공간이 함께 보이는지 찍는다.
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/capture-orbit.mjs <단계명>
import { chromium } from '@playwright/test';
const stage = process.argv[2] || '12-orbit';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const p = await browser.newPage({ viewport: { width: 960, height: 640 } });
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('http://127.0.0.1:4173/?seed=1&npc=0&quality=low&presence=local&weather=clear&autostart=1');
await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
await p.waitForTimeout(1500);
const vis = {};
// 약 90°씩: rotate()는 픽셀당 0.006rad → 262px ≈ 90°
async function quarter() {
  await p.mouse.move(300, 320); await p.mouse.down();
  for (let x = 300; x <= 562; x += 6) await p.mouse.move(x, 320);
  await p.waitForTimeout(150);
  await p.mouse.up();
  await p.waitForTimeout(2200);
}
async function round(space) {
  for (let i = 0; i < 4; i++) {
    vis[`${space}-${i * 90}`] = await p.evaluate(() => window.__YONGSEOJEOM.meVisible());
    await p.screenshot({ path: `docs/screens/${stage}-${space}-${i * 90}.png` });
    await quarter();
  }
}
await round('shop');
await p.evaluate(() => window.__YONGSEOJEOM.enterSpace('circle'));
await p.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
await p.waitForTimeout(1500);
await round('circle');
console.log(JSON.stringify({ visible: vis, errors }));
await browser.close();
