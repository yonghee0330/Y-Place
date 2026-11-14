import { test, expect } from '@playwright/test';

test('모임방 5개 좌석을 실제 클릭해서 각각 앉고 중앙을 바라본다', async ({page})=>{
 const errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/?cam=overview&campos=0,2.55,1.85&camtgt=0,0.3,0&npc=0&quality=low&presence=local&weather=clear');
 await page.waitForFunction(()=>window.__YONGSEOJEOM_READY);
 await page.evaluate(()=> (window as any).__YONGSEOJEOM.enterSpace('circle'));
 const seats=await page.evaluate(()=> (window as any).__YONGSEOJEOM.seats());
 expect(seats).toHaveLength(5);
 for(const seat of seats){
   console.log("클릭 시작:",seat.id);
   const point=await page.evaluate((s)=> (window as any).__YONGSEOJEOM.project(s.x,s.y+.03,s.z),seat);
   expect(point.x).toBeGreaterThan(0);
   expect(point.y).toBeGreaterThan(45);
   expect(point.y).toBeLessThan(820);
   await page.mouse.click(point.x,point.y);
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().seatId)).toBe(seat.id);
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().state)).toBe('sit');
   console.log('착석 확인:',seat.id);
   const me=await page.evaluate(()=> (window as any).__YONGSEOJEOM.me());
   expect(me.state).toBe('sit');
   const dot=(Math.sin(me.rotationY)*-seat.x+Math.cos(me.rotationY)*-seat.z)/Math.hypot(seat.x,seat.z);
   expect(dot).toBeGreaterThan(.99);
 }
 await page.screenshot({animations:'disabled',path:'docs/screens/05-circle-seated.png'});
 expect(errors).toEqual([]);
});

test('라운지 안마 의자·소파·벤치·카페 여덟 자리에 클릭으로 도달한다', async ({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/?cam=overview&campos=0,2.65,0&camtgt=0,0,-.001&npc=0&quality=low&presence=local&weather=clear');
 await page.waitForFunction(()=>window.__YONGSEOJEOM_READY);
 await page.evaluate(()=> (window as any).__YONGSEOJEOM.cameraAt([0,2.65,0],[0,0,-.001],100));
 const seats=await page.evaluate(()=> (window as any).__YONGSEOJEOM.seats());
 expect(seats.map((s:any)=>s.id)).toEqual(['massage-1','massage-2','sofa-1','sofa-2','sofa-3','bench-1','bench-2','cafe-1']);
 for(const seat of seats){
   console.log("클릭 시작:",seat.id);
   const point=await page.evaluate((s)=> (window as any).__YONGSEOJEOM.project(s.x,s.y+.03,s.z),seat);
   expect(point.x).toBeGreaterThan(0);
   expect(point.y).toBeGreaterThan(45);
   expect(point.y).toBeLessThan(820);
   await page.mouse.click(point.x,point.y);
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().seatId)).toBe(seat.id);
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().state)).toBe('sit');
   console.log('착석 확인:',seat.id);
 }
 await page.screenshot({animations:'disabled',path:'docs/screens/09-lounge-seats.png'});
 expect(errors).toEqual([]);
});

test('작업실 네 곳: 들어가면 책상 의자에 앉고, 한 명만 들어갈 수 있고, 문으로 라운지에 돌아온다', async ({context,page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/?npc=0&quality=low&presence=local&weather=clear&autostart=1&room=e2e-work');
 await page.waitForFunction(()=>window.__YONGSEOJEOM_READY);
 for(const id of ['work1','work2','work3','work4']){
   await page.evaluate((to)=> (window as any).__YONGSEOJEOM.enterSpace(to),id);
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.space())).toBe(id);
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().seatId)).toBe('desk-1');
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().state)).toBe('sit');
 }
 // 작업실 4에 내가 있는 동안 다른 사람은 못 들어온다
 const visitor=await context.newPage();
 await visitor.goto('/?npc=0&quality=low&presence=local&weather=clear&autostart=1&room=e2e-work');
 await visitor.waitForFunction(()=>window.__YONGSEOJEOM_READY);
 await visitor.evaluate(()=> (window as any).__YONGSEOJEOM.enterSpace('work4'));
 await expect.poll(()=>visitor.evaluate(()=> (window as any).__YONGSEOJEOM.toasts().join(' '))).toContain('자리가 다 찼어요');
 await expect.poll(()=>visitor.evaluate(()=> (window as any).__YONGSEOJEOM.space())).toBe('shop');
 // 빈 작업실에는 들어갈 수 있다
 await visitor.evaluate(()=> (window as any).__YONGSEOJEOM.enterSpace('work2'));
 await expect.poll(()=>visitor.evaluate(()=> (window as any).__YONGSEOJEOM.space())).toBe('work2');
 await visitor.close();
 await page.evaluate(()=> (window as any).__YONGSEOJEOM.enterSpace('shop'));
 await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.space())).toBe('shop');
 expect(await page.evaluate(()=> (window as any).__YONGSEOJEOM.toasts().join(' '))).toContain('라운지로 돌아왔어요');
 expect(errors).toEqual([]);
});

test('개인 작업실 문은 하나: 누르면 1~4를 고르고, 고른 방에 들어간다', async ({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/?autostart=1&npc=0&quality=low&presence=local&weather=clear&room=e2e-door&cam=overview&campos=0,1.6,1.8&camtgt=1,1,-2');
 await page.waitForFunction(()=>window.__YONGSEOJEOM_READY);
 const doors=await page.evaluate(()=> (window as any).__YONGSEOJEOM.portals().filter((p:any)=>p.choose));
 expect(doors).toHaveLength(1);
 expect(doors[0].label).toBe('개인 작업실');
 const p=doors[0];
 await page.evaluate((p)=> (window as any).__YONGSEOJEOM.cameraAt([0.4,1.5,0.35],[p.x,1.2,p.z]),p);
 const xy=await page.evaluate((p)=> (window as any).__YONGSEOJEOM.project(p.x,1.1,p.z),p);
 await page.mouse.click(xy.x,xy.y);
 const sheet=page.locator('#room-pick-sheet');
 await expect(sheet).toBeVisible();
 await expect(sheet.locator('[data-room]')).toHaveCount(4);
 await sheet.locator('[data-room="work3"]').click();
 await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.space())).toBe('work3');
 expect(errors).toEqual([]);
});

test('작업 세션: 시작하면 타이머가 돌고, 마치면 오늘 기록에 쌓인다', async ({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 // 1분을 0.5초로 센다
 await page.goto('/?autostart=1&npc=0&quality=low&presence=local&weather=clear&room=e2e-timer&worksec=0.5');
 await page.waitForFunction(()=>window.__YONGSEOJEOM_READY);
 await page.evaluate(()=> (window as any).__YONGSEOJEOM.enterSpace('work1'));
 await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().seatId)).toBe('desk-1');
 await expect(page.locator('.work-panel')).toBeVisible();
 // 앉기 의식: 할 일을 적고 25/5로 시작
 await page.locator('.work-panel [data-act="sit"]').click();
 await expect(page.locator('#work-ritual')).toBeVisible();
 await page.locator('#work-ritual [data-goal]').first().fill('테스트 원고 쓰기');
 await page.locator('#wp-task').fill('1장 초고');
 await page.locator('#work-ritual [data-act="start"]').click();
 await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.work().phase)).toBe('focus');
 // 25분(=12.5초) 뒤 저절로 휴식으로 넘어간다
 await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.work().phase),{timeout:30_000}).toBe('break');
 // 집중 모드: 다른 화면 요소가 숨는다
 await page.evaluate(()=> (window as any).__YONGSEOJEOM.workFocusMode(true));
 await expect(page.locator('.hud')).toHaveClass(/is-hidden/);
 await page.evaluate(()=> (window as any).__YONGSEOJEOM.workFocusMode(false));
 await page.locator('.work-panel [data-act="finish"]').click();
 await expect(page.locator('#work-review')).toBeVisible();
 await page.locator('#work-review [data-result] [data-v="done"]').click();
 await page.locator('#work-review [data-focus] [data-v="4"]').click();
 await page.locator('#work-review [data-act="save"]').click();
 const w=await page.evaluate(()=> (window as any).__YONGSEOJEOM.work());
 expect(w.phase).toBe('idle');
 expect(w.sessions).toBe(1);
 expect(w.todaySec).toBeGreaterThanOrEqual(25*60);
 expect(errors).toEqual([]);
});
