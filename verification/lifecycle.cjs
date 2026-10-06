const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.goto('http://127.0.0.1:4185');await page.waitForSelector('.scene-3d');
  await page.evaluate(async()=>{const {getSceneDiagnostics}=await import('./scene.js');window.originalCanvas=document.querySelector('.scene-3d');window.badFrames=[];window.sampleCount=0;function sample(){const c=document.querySelector('.scene-3d'),d=getSceneDiagnostics();window.sampleCount++;if(!c||c!==window.originalCanvas||!c.width||!c.height||!d||d.viewport.some(v=>!Number.isFinite(v)||v<=0)||d.cameraPosition.some(v=>!Number.isFinite(v)))window.badFrames.push({canvas:c&&[c.width,c.height],viewport:d?.viewport});requestAnimationFrame(sample);}sample();});
  const idle=()=>page.waitForFunction(()=>document.querySelector('#portfolio').getAttribute('aria-busy')==='false');
  for(let cycle=0;cycle<3;cycle++){
   const opener=page.locator('[data-open-project]').nth(cycle%2);await opener.scrollIntoViewIfNeeded();await page.waitForTimeout(500);const scroll=await page.evaluate(()=>scrollY);
   await opener.click();await idle();
   await page.locator('#next-project').click();await idle();await page.locator('#project-choice').selectOption(String(cycle%3));await idle();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
   await page.locator('#back-profile').click();await idle();await page.waitForTimeout(100);
   const state=await page.evaluate(async()=>{const c=document.querySelector('.scene-3d'),d=(await import('./scene.js')).getSceneDiagnostics();return {scroll:scrollY,host:c.parentElement.tagName,hidden:document.querySelector('#resume').hidden,inert:document.querySelector('#resume').inert,locked:document.documentElement.classList.contains('portfolio-active'),count:document.querySelectorAll('canvas.scene-3d').length,drawCalls:d.drawCalls,camera:d.cameraPosition,errors:window.badFrames};});
   assert.equal(state.scroll,scroll);assert.equal(state.host,'BODY');assert(!state.hidden&&!state.inert&&!state.locked);assert.equal(state.count,1);assert(state.drawCalls>0);assert.deepEqual(state.camera,[0,0,1500]);assert.deepEqual(state.errors,[]);
   await page.evaluate(()=>scrollBy({top:180,behavior:'instant'}));await page.waitForTimeout(100);assert(await page.evaluate(()=>scrollY)>scroll);
  }
  await page.screenshot({path:`verification/lifecycle-fixed-${viewport.width}.png`});
  assert(await page.evaluate(()=>window.sampleCount)>100);
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: 6 repeated desktop/mobile round trips with project changes; same canvas, valid dimensions on every frame, active rendering, restored camera/scroll, unlocked resume.');
})().catch(e=>{console.error(e);process.exit(1)});

