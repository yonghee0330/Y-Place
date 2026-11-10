// 입장 직후 따라가기 시점 확인: 두 방 모두 내 아바타가 화면에 보여야 한다.
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/capture-entry.mjs <단계명>
import { chromium } from '@playwright/test';
const stage = process.argv[2] || 'entry';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const out = {};
for (const [name, viewport] of [['desktop', { width: 1280, height: 860 }], ['mobile', { width: 420, height: 860 }]]) {
  const p = await browser.newPage({ viewport });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('http://127.0.0.1:4173/?seed=1&npc=0&quality=low&presence=local&weather=clear&autostart=1');
  await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
  await p.waitForTimeout(2000);
  out[`${name}-shop`] = await p.evaluate(() => window.__YONGSEOJEOM.meVisible());
  await p.screenshot({ path: `docs/screens/${stage}-${name}-shop.png` });
  await p.evaluate(() => window.__YONGSEOJEOM.enterSpace('circle'));
  await p.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
  await p.waitForTimeout(2000);
  out[`${name}-circle`] = await p.evaluate(() => window.__YONGSEOJEOM.meVisible());
  await p.screenshot({ path: `docs/screens/${stage}-${name}-circle.png` });
  await p.close();
}
console.log(JSON.stringify({ visible: out, errors }));
await browser.close();
