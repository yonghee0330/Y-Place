import { test, expect } from '@playwright/test';

test('모임 실험실 5개 좌석을 실제 클릭해서 각각 앉고 중앙을 바라본다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?cam=overview&npc=0&quality=low&presence=local&weather=clear&autostart=1');
  await page.waitForFunction(() => window.__YONGSEOJEOM_READY);
  await page.evaluate(() => (window as any).__YONGSEOJEOM.enterSpace('circle'));
  const seats = await page.evaluate(() =>
    (window as any).__YONGSEOJEOM.seats().filter((s: any) => s.id.startsWith('circle-')));
  expect(seats).toHaveLength(5);
  for (const seat of seats) {
    await page.evaluate((s) => (window as any).__YONGSEOJEOM.cameraAt([s.x, 2.6, s.z + 0.01], [s.x, 0, s.z], 70), seat);
    const point = await page.evaluate((s) => (window as any).__YONGSEOJEOM.project(s.x, s.y + 0.03, s.z), seat);
    expect(point.x).toBeGreaterThan(0);
    await page.mouse.click(point.x, point.y);
    await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.me().seatId)).toBe(seat.id);
    await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.me().state)).toBe('sit');
    const me = await page.evaluate(() => (window as any).__YONGSEOJEOM.me());
    const cx = seats.reduce((a: number, s: any) => a + s.x, 0) / seats.length;
    const cz = seats.reduce((a: number, s: any) => a + s.z, 0) / seats.length;
    const dx = cx - seat.x, dz = cz - seat.z;
    const dot = (Math.sin(me.rotationY) * dx + Math.cos(me.rotationY) * dz) / Math.hypot(dx, dz);
    expect(dot).toBeGreaterThan(0.95);
  }
  await page.screenshot({ animations: 'disabled', path: 'docs/screens/05-circle-seated.png' });
  expect(errors).toEqual([]);
});

test('광장 안마 의자·소파·벤치·카페 여덟 자리에 클릭으로 도달한다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?cam=overview&npc=0&quality=low&presence=local&weather=clear&autostart=1');
  await page.waitForFunction(() => window.__YONGSEOJEOM_READY);
  await page.evaluate(() => (window as any).__YONGSEOJEOM.enterSpace('shop'));
  const want = ['massage-1', 'massage-2', 'sofa-1', 'sofa-2', 'sofa-3', 'bench-1', 'bench-2', 'cafe-1'];
  const seats = await page.evaluate((ids) =>
    (window as any).__YONGSEOJEOM.seats().filter((s: any) => ids.includes(s.id)), want);
  expect(seats.map((s: any) => s.id).sort()).toEqual([...want].sort());
  for (const seat of seats) {
    await page.evaluate((s) => (window as any).__YONGSEOJEOM.cameraAt([s.x, 2.6, s.z + 0.01], [s.x, 0, s.z], 70), seat);
    const point = await page.evaluate((s) => (window as any).__YONGSEOJEOM.project(s.x, s.y + 0.03, s.z), seat);
    await page.mouse.click(point.x, point.y);
    await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.me().seatId)).toBe(seat.id);
    await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.me().state)).toBe('sit');
  }
  expect(errors).toEqual([]);
});

test('공동 작업실·신기술 개발실로 이동해 책상에 앉고 광장으로 돌아온다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?npc=0&quality=low&presence=local&weather=clear&autostart=1&room=e2e-work');
  await page.waitForFunction(() => window.__YONGSEOJEOM_READY);
  await page.evaluate(() => (window as any).__YONGSEOJEOM.enterSpace('cowork'));
  await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.space())).toBe('cowork');
  await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.me().seatId)).toBe('desk-1');
  await page.evaluate(() => (window as any).__YONGSEOJEOM.enterSpace('tech'));
  await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.space())).toBe('tech');
  await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.me().seatId)).toBe('desk-tech-1');
  await page.evaluate(() => (window as any).__YONGSEOJEOM.enterSpace('shop'));
  await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.space())).toBe('shop');
  expect(await page.evaluate(() => (window as any).__YONGSEOJEOM.toasts().join(' '))).toContain('실험실 광장');
  expect(errors).toEqual([]);
});

test('열린 문틀을 누르면 해당 구역으로 바로 이동한다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?autostart=1&npc=0&quality=low&presence=local&weather=clear&room=e2e-door');
  await page.waitForFunction(() => window.__YONGSEOJEOM_READY);
  const door = await page.evaluate(() =>
    (window as any).__YONGSEOJEOM.portals().find((p: any) => p.to === 'bookshop'));
  expect(door).toBeTruthy();
  await page.evaluate((p) => (window as any).__YONGSEOJEOM.cameraAt([p.x, 1.6, p.z + 1.2], [p.x, 1.1, p.z], 70), door);
  const xy = await page.evaluate((p) => (window as any).__YONGSEOJEOM.project(p.x, 1.1, p.z), door);
  await page.mouse.click(xy.x, xy.y);
  await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.space())).toBe('bookshop');
  expect(errors).toEqual([]);
});

test('작업 세션: 시작하면 타이머가 돌고, 마치면 오늘 기록에 쌓인다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?autostart=1&npc=0&quality=low&presence=local&weather=clear&room=e2e-timer&worksec=0.5');
  await page.waitForFunction(() => window.__YONGSEOJEOM_READY);
  await page.evaluate(() => (window as any).__YONGSEOJEOM.enterSpace('cowork'));
  await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.me().seatId)).toBe('desk-1');
  await expect(page.locator('.work-panel')).toBeVisible();
  await page.locator('.work-panel [data-act="sit"]').click();
  await expect(page.locator('#work-ritual')).toBeVisible();
  await page.locator('#work-ritual [data-goal]').first().fill('테스트 원고 쓰기');
  await page.locator('#wp-task').fill('1장 초고');
  await page.locator('#work-ritual [data-act="start"]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.work().phase)).toBe('focus');
  await expect.poll(() => page.evaluate(() => (window as any).__YONGSEOJEOM.work().phase), { timeout: 30_000 }).toBe('break');
  await page.evaluate(() => (window as any).__YONGSEOJEOM.workFocusMode(true));
  await expect(page.locator('.hud')).toHaveClass(/is-hidden/);
  await page.evaluate(() => (window as any).__YONGSEOJEOM.workFocusMode(false));
  await page.locator('.work-panel [data-act="finish"]').click();
  await expect(page.locator('#work-review')).toBeVisible();
  await page.locator('#work-review [data-result] [data-v="done"]').click();
  await page.locator('#work-review [data-focus] [data-v="4"]').click();
  await page.locator('#work-review [data-act="save"]').click();
  const w = await page.evaluate(() => (window as any).__YONGSEOJEOM.work());
  expect(w.phase).toBe('idle');
  expect(w.sessions).toBe(1);
  expect(w.todaySec).toBeGreaterThanOrEqual(25 * 60);
  expect(errors).toEqual([]);
});
