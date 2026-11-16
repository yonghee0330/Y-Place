// NPC 대화 점검: 바리스타·모임지기에게 다가가면 버튼이 뜨고, 질문하면 답이 오고, 멀어지면 창이 닫힌다.
// 사용: npm run build && npx vite preview --port 4173 --host 127.0.0.1 → node scripts/capture-npc-chat.mjs [local]
// 'local'을 주면 AI 서버 없이 안내 답으로 시험한다(비용 없음).
import { chromium } from '@playwright/test';
const local = process.argv[2] === 'local';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const out = {};
for (const [vp, viewport] of [['desktop', { width: 1280, height: 860 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await browser.newPage({ viewport });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`http://127.0.0.1:4173/?seed=1&quality=low&presence=local&weather=clear&autostart=1${local ? '&npcchat=local' : ''}`);
  await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 240000 });
  for (const [space, npc] of [['shop', 'barista'], ['circle', 'host']]) {
    if (space !== 'shop') {
      await p.evaluate((s) => window.__YONGSEOJEOM.enterSpace(s), space);
      await p.waitForFunction(() => !window.__YONGSEOJEOM.switchingSpace());
    }
    await p.waitForTimeout(1200);
    const far = await p.evaluate(() => window.__YONGSEOJEOM.talk());
    const [nx, , nz] = await p.evaluate((id) => window.__YONGSEOJEOM.talkNpcPos(id), npc);
    // NPC 앞 1m쯤으로 걸어간다
    await p.evaluate(([x, z]) => window.__YONGSEOJEOM.walkTo(x, z), [nx + (space === 'shop' ? 1.0 : -0.3), nz + (space === 'shop' ? 0 : 0.95)]);
    await p.waitForFunction(() => window.__YONGSEOJEOM.talk().prompt, {}, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `docs/screens/13-npc-${vp}-${space}-near.png` });
    await p.click('.talk-prompt');
    await p.fill('.chat-input', '안녕하세요! 여기서 집중해서 작업하려면 어디로 가면 돼요?');
    await p.click('.chat-send');
    await p.waitForFunction(() => document.querySelectorAll('.chat-npc').length >= 2 && !document.querySelector('.chat-typing'), {}, { timeout: 40000 });
    const reply = await p.evaluate(() => [...document.querySelectorAll('.chat-npc')].pop().textContent);
    await p.screenshot({ path: `docs/screens/13-npc-${vp}-${space}-chat.png` });
    await p.keyboard.press('Escape');
    // 멀어지면 버튼이 사라진다
    await p.evaluate(([x, z]) => window.__YONGSEOJEOM.teleport(x, z, 0), [nx + (space === 'shop' ? 3 : -2), nz + 2.5]);
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => window.__YONGSEOJEOM.talk());
    out[`${vp}-${space}`] = { farPrompt: far.prompt, reply, afterPrompt: after.prompt };
  }
  await p.close();
}
console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();
