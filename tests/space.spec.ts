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

test('로비 안마 의자·소파·벤치·카페 여덟 자리에 클릭으로 도달한다', async ({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/?cam=overview&campos=0,2.65,0&camtgt=0,0,-.001&npc=0&quality=low&presence=local&weather=clear');
 await page.waitForFunction(()=>window.__YONGSEOJEOM_READY);
 await page.evaluate(()=> (window as any).__YONGSEOJEOM.cameraAt([0,2.65,0],[0,0,-.001],100));
 const seats=await page.evaluate(()=> (window as any).__YONGSEOJEOM.seats());
 expect(seats.map((s:any)=>s.id)).toEqual(['massage-1','massage-2','sofa-1','sofa-2','sofa-3','bench-1','bench-2','cafe-1']);
 for(const seat of seats){
   console.log("클릭 시작:",seat.id);
   // 로비가 넓어 한 화면에 다 담기지 않으므로, 자리마다 바로 위에서 내려다보고 누른다
   await page.evaluate((s)=> (window as any).__YONGSEOJEOM.cameraAt([s.x,2.6,s.z+.01],[s.x,0,s.z],70),seat);
   const point=await page.evaluate((s)=> (window as any).__YONGSEOJEOM.project(s.x,s.y+.03,s.z),seat);
   expect(point.x).toBeGreaterThan(0);
   expect(point.y).toBeGreaterThan(45);
   expect(point.y).toBeLessThan(820);
   await page.mouse.click(point.x,point.y);
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().seatId)).toBe(seat.id);
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().state)).toBe('sit');
   console.log('착석 확인:',seat.id);
 }
 await page.evaluate(()=> (window as any).__YONGSEOJEOM.cameraAt([3.6,2.6,3.0],[-1,0.4,-1.2],70));
 await page.screenshot({animations:'disabled',path:'docs/screens/09-lounge-seats.png'});
 expect(errors).toEqual([]);
});
