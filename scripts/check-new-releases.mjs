// A2 신간 제안: 서재 입장 → 신간 시트 → 책 고르기 → 큐레이터 로컬 추천 답
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:4173/?seed=1&quality=low&presence=local&weather=clear&hour=14&autostart=1&npcchat=local');
await page.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });

await page.evaluate(() => window.__YONGSEOJEOM.enterSpace('bookshop'));
await page.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
await page.waitForTimeout(800);
await page.screenshot({ path: 'docs/screens/18-new-release-bookshop.png' });

await page.click('[data-act="newreleases"]');
await page.waitForSelector('.new-release-sheet .nr-item', { timeout: 10000 });
const count = await page.evaluate(() => document.querySelectorAll('.nr-item').length);
await page.screenshot({ path: 'docs/screens/18-new-release-sheet.png' });
await page.click('.nr-item');
await page.waitForSelector('[data-act="read"]');
const title = await page.evaluate(() => document.querySelector('.nr-detail-title')?.textContent ?? '');
await page.click('[data-act="read"]');
await page.waitForTimeout(500);
const reading = await page.evaluate(() => window.__YONGSEOJEOM.me()?.book?.title ?? null);

const [nx, , nz] = await page.evaluate(() => window.__YONGSEOJEOM.talkNpcPos('curator'));
await page.evaluate(([x, z]) => window.__YONGSEOJEOM.teleport(x, z, 0), [nx - 0.9, nz + 0.4]);
await page.waitForFunction(() => window.__YONGSEOJEOM.talk().prompt, {}, { timeout: 20000 });
await page.click('.talk-prompt');
await page.fill('.chat-input', '이번 주 신간 추천해 주세요');
await page.click('.chat-send');
await page.waitForFunction(
  () => document.querySelectorAll('.chat-npc').length >= 2 && !document.querySelector('.chat-typing'),
  {},
  { timeout: 15000 },
);
const reply = await page.evaluate(() => [...document.querySelectorAll('.chat-npc')].pop()?.textContent ?? '');
await page.screenshot({ path: 'docs/screens/18-new-release-curator.png' });

console.log(JSON.stringify({ count, title, reading, reply, errors }, null, 2));
await browser.close();

const fail = [];
if (count < 10) fail.push('list-count');
if (!title) fail.push('detail-title');
if (reading !== title) fail.push('reading-mismatch');
if (!/신간|「/.test(reply)) fail.push('curator-reply');
if (errors.length) fail.push('console');
if (fail.length) {
  console.error('FAIL', fail);
  process.exit(1);
}
console.log('OK');
