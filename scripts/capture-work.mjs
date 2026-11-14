// 개인 작업실 캡처: 라운지 문, 내 자리 시점(집중·휴식·집중 모드), 시간대 4개, 모바일.
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/capture-work.mjs <단계명>
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const stage = process.argv[2] || 'work';
fs.mkdirSync('docs/screens', { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', args: ['--ignore-gpu-blocklist', '--enable-gpu'] });
const errors = [];
const open = async (viewport, extra = '') => {
  const p = await browser.newPage({ viewport });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`http://127.0.0.1:4173/?seed=1&npc=0&quality=high&presence=local&weather=clear&autostart=1&room=capture-work&worksec=60${extra}`);
  await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
  return p;
};
const Y = (p, fn, arg) => p.evaluate(fn, arg);
// 1) 라운지의 '개인 작업실' 문
{
  const p = await open({ width: 1440, height: 960 }, '&hour=13&cam=overview&campos=-1.4,1.7,0.6&camtgt=2.7,1.1,0.35');
  await p.waitForTimeout(800);
  await p.screenshot({ path: `docs/screens/${stage}-door.png` });
  await p.close();
}
// 2) 내 자리 시점: 시간대 4개(집중 중)
for (const [name, hour] of [['morning', 8], ['day', 13], ['sunset', 18], ['night', 22]]) {
  const p = await open({ width: 1440, height: 960 }, `&hour=${hour}`);
  await Y(p, () => window.__YONGSEOJEOM.enterSpace('work2'));
  await p.waitForTimeout(4000);
  await Y(p, () => window.__YONGSEOJEOM.workBegin('1장 초고 끝내기', '50/10'));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `docs/screens/${stage}-desk-${name}.png` });
  if (name === 'night') {
    await Y(p, () => window.__YONGSEOJEOM.workFocusMode(true));
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `docs/screens/${stage}-desk-focusmode.png` });
  }
  await p.close();
}
// 3) 라운지 해질녘·밤
for (const [name, hour] of [['sunset', 18], ['night', 22]]) {
  const p = await open({ width: 1440, height: 960 }, `&hour=${hour}&cam=overview&campos=0.6,2.45,2.1&camtgt=-0.2,0.7,-0.6`);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `docs/screens/${stage}-lounge-${name}.png` });
  await p.close();
}
// 4) 모바일: 작업실 패널
{
  const p = await open({ width: 390, height: 844 }, '&hour=15');
  await Y(p, () => window.__YONGSEOJEOM.enterSpace('work4'));
  await p.waitForTimeout(4000);
  await Y(p, () => window.__YONGSEOJEOM.workBegin('메일 정리', '25/5'));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `docs/screens/${stage}-mobile-desk.png` });
  await p.close();
}
console.log(JSON.stringify({ errors }));
await browser.close();
