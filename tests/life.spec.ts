import { test, expect } from '@playwright/test';
const url='/?autostart=1&npc=0&quality=low&presence=local&weather=clear';
async function ready(page:any){await page.waitForFunction(()=>window.__YONGSEOJEOM_READY);}

test('나무 문 클릭으로 두 공간을 왕복한다',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'&cam=overview&campos=0,1.6,1.8&camtgt=1,1,-2');await ready(page);
 for(const target of ['circle','shop']){
  const p=await page.evaluate(()=> (window as any).__YONGSEOJEOM.portals()[0]);
  await page.evaluate((p)=> (window as any).__YONGSEOJEOM.cameraAt([0,1.65,.5],[p.x,1.3,p.z]),p);
  const xy=await page.evaluate((p)=> (window as any).__YONGSEOJEOM.project(p.x,1.2,p.z),p);
  console.log("문 클릭",target,xy);
  await page.mouse.click(xy.x,xy.y);
  await expect(page.locator('#portal-sheet')).toBeVisible();
  await page.locator('#portal-sheet [data-act="enter"]').click();
  await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.space())).toBe(target);
  await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.switchingSpace())).toBe(false);
 }
 expect(errors).toEqual([]);
});

test('폭 420px: 시작→입장→앉기→책 고르기→소리 켜기',async({browser})=>{
 const context=await browser.newContext({viewport:{width:420,height:900},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage();const errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('/?npc=0&quality=low&presence=local&weather=clear');
 await page.screenshot({path:'docs/screens/04-mobile-start.png'});
 await page.getByRole('button',{name:'책방 입장하기',exact:true}).tap();await ready(page);
 await page.screenshot({path:'docs/screens/04-mobile-shop.png'});
 await page.getByRole('button',{name:'앉기 (단축키 4)',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().state)).toBe('sit');
 await page.getByRole('button',{name:'책 펼치기 (단축키 2)',exact:true}).tap();
 const input=page.locator('#book-title');await input.fill('데미안');
 expect(await input.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
 // iOS에서 바뀌는 visualViewport 이벤트에 대한 레이아웃 계약 검사.
 await page.evaluate(()=>{Object.defineProperty(window.visualViewport!,'height',{configurable:true,get:()=>460});window.visualViewport!.dispatchEvent(new Event('resize'));});
 await expect.poll(()=>page.locator('#book-sheet').evaluate(e=>e.getBoundingClientRect().bottom)).toBeLessThanOrEqual(461);
 await page.screenshot({path:'docs/screens/04-mobile-keyboard-sheet.png'});
 await page.evaluate(()=>{delete (window.visualViewport as any).height;window.visualViewport!.dispatchEvent(new Event('resize'));});
 await page.locator('#book-sheet [data-act="search"]').tap();
 await page.getByRole('option').filter({hasText:'데미안'}).tap();
 await page.getByRole('button',{name:'이 책으로 읽기',exact:true}).tap();
 await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.me().book?.title)).toBe('데미안');
 await page.getByRole('button',{name:'서점 소리 켜기',exact:true}).tap();
 await expect(page.locator('[data-act="sound"]')).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.sound().enabled)).toBe(true);
 await expect.poll(()=>page.evaluate(()=> (window as any).__YONGSEOJEOM.sound().state)).toBe('running');
 await page.screenshot({path:'docs/screens/04-mobile-reading.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(420);
 expect(errors).toEqual([]);await context.close();
});

test('만석인 모임방 입장을 거절하고 용서점으로 복귀한다',async({context,page})=>{
 await page.goto(url+'&cap=1');await ready(page);
 await page.evaluate(()=> (window as any).__YONGSEOJEOM.enterSpace('circle'));
 await page.evaluate(()=> (window as any).__YONGSEOJEOM_LOOP.stop());
 const visitor=await context.newPage();await visitor.goto(url+'&cap=1');await ready(visitor);
 await visitor.evaluate(()=> (window as any).__YONGSEOJEOM.enterSpace('circle'));
 await expect.poll(()=>visitor.evaluate(()=> (window as any).__YONGSEOJEOM.space())).toBe('shop');
 expect(await visitor.evaluate(()=> (window as any).__YONGSEOJEOM.toasts().join(' '))).toContain('자리가 다 찼어요');
 await visitor.close();
});
