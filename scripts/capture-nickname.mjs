// 닉네임 입력 점검: 시작 화면에 입력 칸이 보이고, 입력한 닉네임으로 입장해 이름표·설정에 반영되는지 본다.
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/capture-nickname.mjs
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const out = {};
for (const [vp, viewport] of [['desktop', { width: 1280, height: 860 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await browser.newPage({ viewport });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('http://127.0.0.1:4173/?seed=1&quality=low&presence=local&weather=clear&npcchat=local');
  await p.waitForSelector('#start-nick');
  const before = await p.$eval('#start-nick', (i) => ({ value: i.value, placeholder: i.placeholder }));
  if (vp === 'desktop') await p.fill('#start-nick', '  밤 산책 <b>러 ');
  await p.waitForTimeout(300);
  await p.screenshot({ path: `docs/screens/16-nick-${vp}-start.png` });
  const ph = await p.$eval('#start-nick', (i) => i.placeholder);
  await p.press('#start-nick', 'Enter');
  await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
  await p.waitForTimeout(1500);
  const me = await p.evaluate(() => window.__YONGSEOJEOM.me().nickname ?? null);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('yongseojeom.profile')).nickname);
  const npcNames = await p.evaluate(() => [...document.querySelectorAll('canvas')].length && null);
  await p.screenshot({ path: `docs/screens/16-nick-${vp}-inside.png` });
  out[vp] = { before, placeholder: ph, me, saved, npcNames };
  await p.close();
}
console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();
