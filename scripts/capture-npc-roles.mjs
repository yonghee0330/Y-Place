// 방마다 있는 역할 NPC 점검: 그 방에 들어가 NPC 앞까지 걸어가면 "이야기하기"가 뜨고, 대화 창이 열린다.
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/capture-npc-roles.mjs
// 안내 답(npcchat=local)으로만 시험한다(비용 없음). AI 답은 Worker에 직접 묻어 확인한다.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const out = {};
const NPCS = [['shop', 'barista'], ['shop', 'researcher'], ['bookshop', 'bookseller'], ['bookshop', 'curator'], ['circle', 'host'], ['gallery', 'docent']];
const p = await browser.newPage({ viewport: { width: 1280, height: 860 } });
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('http://127.0.0.1:4173/?seed=1&quality=low&presence=local&weather=clear&autostart=1&npcchat=local');
await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
for (const [space, npc] of NPCS) {
  await p.evaluate((s) => window.__YONGSEOJEOM.enterSpace(s), space);
  await p.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `docs/screens/15-npc-${npc}-enter.png` });
  const [nx, , nz] = await p.evaluate((id) => window.__YONGSEOJEOM.talkNpcPos(id), npc);
  const [mx, , mz] = await p.evaluate(() => window.__YONGSEOJEOM.me().position ?? [0, 0, 0]);
  // NPC에서 내 쪽으로 1m 떨어진 곳까지 걸어간다
  const d = Math.hypot(mx - nx, mz - nz) || 1;
  const dest = await p.evaluate(([x, z]) => window.__YONGSEOJEOM.walkTo(x, z), [nx + (mx - nx) / d, nz + (mz - nz) / d]);
  await p.waitForFunction((id) => window.__YONGSEOJEOM.talk().near === id && window.__YONGSEOJEOM.talk().prompt, npc, { timeout: 30000 });
  await p.waitForTimeout(1200);
  await p.click('.talk-prompt');
  await p.fill('.chat-input', '여기서는 어떤 아이디어를 시험해 볼 수 있어요?');
  await p.click('.chat-send');
  await p.waitForFunction(() => document.querySelectorAll('.chat-npc').length >= 2 && !document.querySelector('.chat-typing'), {}, { timeout: 20000 });
  const reply = await p.evaluate(() => [...document.querySelectorAll('.chat-npc')].pop().textContent);
  const title = await p.evaluate(() => document.querySelector('.npc-chat-sheet h2, .npc-chat-sheet .sheet-title')?.textContent ?? '');
  await p.screenshot({ path: `docs/screens/15-npc-${npc}-chat.png` });
  await p.keyboard.press('Escape');
  out[npc] = { space, walked: !!dest, title, reply };
}
console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();
