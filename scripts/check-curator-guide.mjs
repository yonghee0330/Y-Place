// 고요 선택 버튼: 네 → 스테디셀러 → 추천 답이 오고 다음 버튼이 남는지(신간 버튼은 없어야 함)
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:4173/?seed=1&quality=low&presence=local&weather=clear&autostart=1&npcchat=local');
await page.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
await page.evaluate(() => window.__YONGSEOJEOM.enterSpace('bookshop'));
await page.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
await page.waitForTimeout(600);

const [nx, , nz] = await page.evaluate(() => window.__YONGSEOJEOM.talkNpcPos('curator'));
await page.evaluate(([x, z]) => window.__YONGSEOJEOM.teleport(x, z, 0), [nx - 0.85, nz + 0.35]);
await page.waitForFunction(() => window.__YONGSEOJEOM.talk().prompt, {}, { timeout: 20000 });
await page.click('.talk-prompt');
await page.waitForSelector('.chat-choice');

const first = await page.evaluate(() => [...document.querySelectorAll('.chat-choice')].map((b) => b.textContent));
await page.click('.chat-choice'); // 네, 부탁해요 (첫 버튼)
await page.waitForFunction(() => [...document.querySelectorAll('.chat-choice')].some((b) => b.textContent?.includes('스테디셀러')));
const second = await page.evaluate(() => [...document.querySelectorAll('.chat-choice')].map((b) => b.textContent));
await page.click('button.chat-choice:has-text("스테디셀러")');
await page.waitForFunction(() => [...document.querySelectorAll('.chat-npc')].pop()?.textContent?.includes('「'));
const reply = await page.evaluate(() => [...document.querySelectorAll('.chat-npc')].pop()?.textContent ?? '');
const after = await page.evaluate(() => [...document.querySelectorAll('.chat-choice')].map((b) => b.textContent));
const hudHasNew = await page.evaluate(() => !!document.querySelector('[data-act="newreleases"]'));
await page.screenshot({ path: 'docs/screens/19-curator-guide.png' });

console.log(JSON.stringify({ first, second, reply, after, errors }, null, 2));
await browser.close();

const fail = [];
if (!first.some((t) => t.includes('네'))) fail.push('offer');
if (!second.some((t) => t.includes('스테디셀러')) || second.some((t) => t.includes('신간'))) fail.push('source');
if (after.some((t) => t.includes('신간'))) fail.push('after-newrelease');
if (hudHasNew) fail.push('hud-newrelease');
if (!reply.includes('「')) fail.push('reply');
if (!after.some((t) => t.includes('다시'))) fail.push('after');
if (errors.length) fail.push('console');
if (fail.length) {
  console.error('FAIL', fail);
  process.exit(1);
}
console.log('OK');
