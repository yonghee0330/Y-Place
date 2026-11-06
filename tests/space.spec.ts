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
 await page.screenshot({path:'docs/screens/02-circle-seated.png'});
 expect(errors).toEqual([]);
});

test('용서점 창가·벤치·스툴 다섯 자리에 클릭으로 도달한다', async ({page})=>{
 await page.goto('/?cam=overview&campos=0,2.65,0&camtgt=0,0,-.001&npc=0&quality=low&presence=local&weather=clear');
 await page.waitForFunction(()=>window.__YONGSEOJEOM_READY);
 await page.evaluate(()=> (window as any).__YONGSEOJEOM.cameraAt([0,2.65,0],[0,0,-.001],100));
 const seats=await page.evaluate(()=> (window as any).__YONGSEOJEOM.seats());
 expect(seats).toHaveLength(5);
 for(const seat of seats){
   const point=await page.evaluate((s)=> (window as any).__YONGSEOJEOM.project(s.x,s.y+.03,s.z),seat);
   expect(point.x).toBeGreaterThan(0);
   expect(point.y).toBeGreaterThan(45);
   expect(point.y).toBeLessThan(820);
   await page.mouse.click(point.x,point.y);
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().seatId)).toBe(seat.id);
   await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().state)).toBe('sit');
   console.log('착석 확인:',seat.id);
 }
 await page.screenshot({path:'docs/screens/03-shop-seats.png'});
});
