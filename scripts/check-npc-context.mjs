// A1 장면 맥락: 로컬 안내 답이 인원·날씨·자리·읽는 책을 맞는지 점검.
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/check-npc-context.mjs
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

// 카페 의자(cafe-1)는 바리스타와 1.4m라 앉은 채로 대화 가능. 소파는 멀어서 창이 닫힌다.
await page.evaluate(() => window.__YONGSEOJEOM.placeAtSeat('cafe-1'));
await page.waitForTimeout(500);
const ctx = await page.evaluate(() => window.__YONGSEOJEOM.sceneContext());

await page.waitForFunction(() => window.__YONGSEOJEOM.talk().prompt, {}, { timeout: 30000 });
await page.click('.talk-prompt');

async function ask(q) {
  await page.fill('.chat-input', q);
  await page.click('.chat-send');
  await page.waitForFunction(
    () => document.querySelectorAll('.chat-npc').length >= 1 && !document.querySelector('.chat-typing'),
    {},
    { timeout: 15000 },
  );
  return page.evaluate(() => [...document.querySelectorAll('.chat-npc')].pop().textContent);
}

const replies = {
  count: await ask('지금 몇 명 있어요?'),
  weather: await ask('날씨 어때요?'),
  seat: await ask('내가 어디에 앉아 있어요?'),
  books: await ask('저 사람 뭐 읽어요?'),
};

await page.screenshot({ path: 'docs/screens/17-npc-context-chat.png' });
console.log(JSON.stringify({ ctx, replies, errors }, null, 2));
await browser.close();

const fail = [];
if (!ctx?.space?.includes('로비')) fail.push('space');
if (ctx?.visitorCount < 1) fail.push('visitorCount');
if (!String(ctx?.weather || '').includes('맑')) fail.push('weather');
if (ctx?.timeOfDay !== '낮') fail.push('timeOfDay');
if (!String(ctx?.mySeat || '').includes('카페')) fail.push('mySeat');
if (!replies.count.includes('명')) fail.push('reply-count');
if (!replies.weather.includes('맑') && !replies.weather.includes('부천')) fail.push('reply-weather');
if (!replies.seat.includes('앉아') || !replies.seat.includes('카페')) fail.push('reply-seat');
if (!replies.books.includes('책')) fail.push('reply-books');
if (errors.length) fail.push('console');
if (fail.length) {
  console.error('FAIL', fail);
  process.exit(1);
}
console.log('OK');
