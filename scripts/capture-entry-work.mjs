// 입장 직후 따라가기 시점: 라운지와 작업실에서 내 아바타가 보이는지 본다(데스크톱·모바일).
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/capture-entry-work.mjs <단계명>
import { chromium } from '@playwright/test';
const stage = process.argv[2] || 'entry';
const browser = await chromium.launch({ channel: 'chromium', args: ['--ignore-gpu-blocklist', '--enable-gpu'] });
const errors = [];
const out = {};
for (const [name, viewport] of [['desktop', { width: 1280, height: 860 }], ['mobile', { width: 420, height: 860 }]]) {
  const p = await browser.newPage({ viewport });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('http://127.0.0.1:4173/?seed=1&npc=0&quality=low&presence=local&weather=clear&autostart=1&room=capture-entry');
  await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
  await p.waitForTimeout(2000);
  out[`${name}-lounge`] = await p.evaluate(() => window.__YONGSEOJEOM.meVisible());
  await p.screenshot({ path: `docs/screens/${stage}-${name}-lounge.png` });
  await p.evaluate(() => window.__YONGSEOJEOM.enterSpace('work2'));
  await p.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
  await p.waitForTimeout(4500);
  out[`${name}-work2`] = await p.evaluate(() => window.__YONGSEOJEOM.meVisible());
  await p.screenshot({ path: `docs/screens/${stage}-${name}-work2.png` });
  await p.close();
}
console.log(JSON.stringify({ visible: out, errors }));
await browser.close();
