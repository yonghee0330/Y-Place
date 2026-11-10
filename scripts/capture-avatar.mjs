// 아바타 점검 캡처: 정면·옆·운영자·걷기·마시기·앉아 읽기·기본 따라가기 시점.
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/capture-avatar.mjs <단계명>
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const stage = process.argv[2] || 'avatar';
fs.mkdirSync('docs/screens', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const base = 'http://127.0.0.1:4173/?seed=1&npc=0&quality=low&presence=local&weather=clear';
async function open(extra, viewport = { width: 1280, height: 860 }) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + extra);
  await page.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
  return page;
}
const Y = (p, fn, arg) => p.evaluate(fn, arg);
const shot = (p, name) => p.screenshot({ path: `docs/screens/${stage}-${name}.png` });

const p = await open('&cam=overview');
await Y(p, () => window.__YONGSEOJEOM.teleport(0.6, 1.0, 0));
await Y(p, () => window.__YONGSEOJEOM.cameraAt([0.6, 0.95, 2.05], [0.6, 0.6, 1.0], 55));
await p.waitForTimeout(800);
await shot(p, 'front');
await Y(p, () => window.__YONGSEOJEOM.cameraAt([2.0, 0.85, 1.0], [0.6, 0.55, 1.0], 55));
await p.waitForTimeout(400);
await shot(p, 'side');
await Y(p, () => window.__YONGSEOJEOM.debugLook({ color: '#d6b0ab', hair: 'curtain', manager: true }));
await Y(p, () => window.__YONGSEOJEOM.cameraAt([0.85, 1.05, 1.95], [0.6, 0.7, 1.0], 42));
await p.waitForTimeout(400);
await shot(p, 'manager');
await Y(p, () => window.__YONGSEOJEOM.cameraAt([0.6, 1.0, 1.6], [0.6, 0.92, 1.0], 30));
await p.waitForTimeout(300);
await shot(p, 'manager-face');
await Y(p, () => window.__YONGSEOJEOM.cameraAt([0.75, 0.95, 2.05], [0.6, 0.65, 1.0], 48));
await Y(p, () => window.__YONGSEOJEOM.sipNow('coffee'));
await p.waitForTimeout(2600);
await shot(p, 'drink');
await p.waitForTimeout(3500);
await Y(p, () => window.__YONGSEOJEOM.teleport(1.1, -1.6, 0));
await Y(p, () => window.__YONGSEOJEOM.walkTo(1.1, 1.3));
await Y(p, () => window.__YONGSEOJEOM.cameraAt([2.3, 0.9, 0.1], [1.1, 0.55, -0.1], 62));
await p.waitForTimeout(1500);
await shot(p, 'walk');
await p.close();

const c = await open('&cam=overview');
await Y(c, () => window.__YONGSEOJEOM.enterSpace('circle'));
await c.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
await Y(c, () => window.__YONGSEOJEOM.placeAtSeat('circle-1'));
await Y(c, () => window.__YONGSEOJEOM.setReading(true));
await Y(c, () => window.__YONGSEOJEOM.cameraAt([1.5, 1.45, -1.2], [0, 0.75, 0.75], 50));
await c.waitForTimeout(2200);
await shot(c, 'circle-read');
await Y(c, () => window.__YONGSEOJEOM.cameraAt([1.65, 0.85, 1.05], [0, 0.65, 1.0], 50));
await c.waitForTimeout(400);
await shot(c, 'circle-side');
await c.close();

const f = await open('&autostart=1');
await f.waitForTimeout(1500);
await shot(f, 'follow');
await Y(f, () => window.__YONGSEOJEOM.sit('read-1'));
await f.waitForFunction(() => window.__YONGSEOJEOM.me().state === 'sit', {}, { timeout: 60000 });
await f.waitForTimeout(1500);
await shot(f, 'follow-sit');
await f.close();

console.log(JSON.stringify({ errors }));
await browser.close();
