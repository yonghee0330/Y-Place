// 구역 걷기 점검: 광장에서 다른 구역으로 한 번 클릭해 걸어가면, 문틀을 넘을 때 멈추지 않고 끝까지 도착해야 한다.
// 사용: npm run build && npx vite preview --port 4180 --host 127.0.0.1 → node scripts/check-zone-walk.mjs [port]
import { chromium } from '@playwright/test';
const port = process.argv[2] || '4180';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(`http://127.0.0.1:${port}/?seed=1&quality=low&presence=local&weather=clear&autostart=1&npcchat=local`);
await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 300000 });
const results = {};
for (const [name, x, z] of [['market', 8, -3.2], ['cowork', -6, 7.1]]) {
  await p.evaluate(([x, z]) => window.__YONGSEOJEOM.walkTo(x, z), [x, z]);
  const spaces = [];
  let pos;
  for (let i = 0; i < 240; i++) {
    await p.waitForTimeout(250);
    const s = await p.evaluate(() => ({ space: window.__YONGSEOJEOM.space(), pos: window.__YONGSEOJEOM.me().position }));
    if (spaces.at(-1) !== s.space) spaces.push(s.space);
    pos = s.pos;
    if (Math.hypot(pos[0] - x, pos[2] - z) < 0.4) break;
  }
  results[name] = { arrived: Math.hypot(pos[0] - x, pos[2] - z) < 0.4, spaces, end: pos.map((v) => +v.toFixed(2)) };
}
console.log(JSON.stringify({ results, errors }));
await b.close();
