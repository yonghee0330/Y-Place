// 성능 측정: 그리기 호출·삼각형 수·프레임 시간(소프트웨어 렌더라 절대값보다 이전 버전과의 비교용).
// 사용: npx vite preview --port 4180 --host 127.0.0.1 → node scripts/perf-probe.mjs 4180 high
import { chromium } from '@playwright/test';
const port = process.argv[2], q = process.argv[3] || 'high';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const t0=Date.now();
await p.goto(`http://127.0.0.1:${port}/?seed=1&quality=${q}&presence=local&weather=clear&autostart=1&npcchat=local`);
await p.waitForFunction(() => window.__YONGSEOJEOM_READY === true, {}, { timeout: 300000 });
const load=(Date.now()-t0)/1000;
await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const s = window.__YONGSEOJEOM_STATS;
  // count scene stats



  // frame timing over 3s
  const ts=[]; let last=performance.now();
  await new Promise(res=>{ const f=(n)=>{ ts.push(n-last); last=n; if(ts.length<90) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  ts.sort((a,b)=>a-b);
  return { ...s, medianMs: ts[45].toFixed(1), p90: ts[81].toFixed(1) };
});
console.log(JSON.stringify({ load, ...r, errs }));
await b.close();
