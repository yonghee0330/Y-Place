// 라운지·작업실 캡처: node scripts/capture-lounge.mjs <단계>  (npm run preview가 4173에서 떠 있어야 한다)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const stage = process.argv[2] || 'latest';
fs.mkdirSync('docs/screens', { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', args: ['--ignore-gpu-blocklist', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:4173/?cam=overview&campos=0,2.4,2.02&camtgt=0,.7,-.5&seed=1&npc=0&quality=high&presence=local&weather=clear');
await page.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
const Y = (fn, arg) => page.evaluate(fn, arg);
const shot = async (name, pos, tgt, wait = 700) => {
  await Y(([p, t]) => window.__YONGSEOJEOM.cameraAt(p, t), [pos, tgt]);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `docs/screens/${stage}-${name}.png` });
};
await shot('lounge', [0.6, 2.45, 2.1], [-0.2, 0.7, -0.6]);
await shot('lounge-massage', [0.5, 1.5, 0.35], [-0.85, 0.6, -1.5]);
await shot('lounge-coffee', [-0.2, 1.65, 0.3], [-2.3, 0.95, 1.0]);
await shot('lounge-doors', [-1.6, 1.7, 0.2], [2.7, 1.1, 0.0]);
await shot('lounge-sofa', [1.0, 1.7, -1.9], [0.9, 0.5, 0.6]);
await Y(() => window.__YONGSEOJEOM.placeAtSeat?.('massage-1'));
await shot('lounge-massage-seated', [-0.4, 1.15, 0.1], [-1.25, 0.7, -1.4]);
for (const n of [1, 2, 3, 4]) {
  await Y((id) => window.__YONGSEOJEOM.enterSpace(id), `work${n}`);
  await page.waitForTimeout(3500);
  await shot(`work${n}`, [-0.9, 2.0, 1.45], [0.35, 0.75, -1.1], 900);
}
await shot('work4-desk', [-0.75, 1.35, 0.15], [0.45, 0.95, -1.4]);
await Y(() => window.__YONGSEOJEOM.enterSpace('circle'));
await shot('circle', [0, 2.55, 1.85], [0, 0.5, -0.25], 1500);
console.log(JSON.stringify({ errors }));
await browser.close();
