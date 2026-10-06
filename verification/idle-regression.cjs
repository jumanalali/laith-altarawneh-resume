const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict');
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4185');await p.waitForSelector('.scene-3d');
 await p.evaluate(async()=>{window.diag=(await import('./scene.js')).getSceneDiagnostics;const original=performance.now.bind(performance);window.clockOffset=0;performance.now=()=>original()+window.clockOffset;});
 const state=()=>p.evaluate(()=>diag());
 const phase=name=>p.waitForFunction(name=>diag()?.idle.phase===name,name,{timeout:7000});
 const start=async()=>{await p.evaluate(()=>clockOffset+=3100);};
 await start();await phase('rest');await p.waitForTimeout(450);
 let d=await state();assert.equal(d.coordination.hands[1].phase,'grip');assert(d.handTops.every(y=>y>=450-.1));
 assert(Math.abs(d.idle.debug.gaps.contact.palm)<.1);assert(Object.values(d.idle.debug.gaps.contact).every(v=>v>=-.01));
 const resting=JSON.stringify(d.hands[0].fingerOffsets);await p.waitForTimeout(1200);assert.equal(JSON.stringify((await state()).hands[0].fingerOffsets),resting);
 await p.screenshot({path:'verification/idle-still.png'});assert.equal((await state()).idle.phase,'rest');
 for(const target of ['rest','release','lower']){
  if(target!=='rest'){await start();await phase(target);}
  await p.evaluate(()=>scrollBy({top:200,behavior:'instant'}));await phase('return');
  for(let i=0;i<12;i++){await p.evaluate(i=>scrollTo({top:i%2?0:2400,behavior:'instant'}),i);await p.waitForTimeout(25);const s=await state();assert(s.handTops.every(y=>y>=450-.1));}
  await phase('waiting');console.log('PASS interruption',target);
 }
 await start();await phase('lower');await p.evaluate(()=>{clockOffset=0;document.querySelector('[data-open-project]').click();});await p.waitForTimeout(1400);assert.equal((await state()).idle.phase,'waiting');
 await p.locator('#next-project').click();await p.waitForTimeout(800);await p.locator('#back-profile').click();await p.waitForTimeout(1400);assert.equal((await state()).idle.phase,'waiting');assert.equal(await p.locator('.scene-3d').count(),1);
 await start();await phase('rest');await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await state()).idle.phase,'waiting');
 await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(600);assert(await p.locator('body').evaluate(e=>e.classList.contains('simple')));assert.equal(await p.locator('.scene-3d').count(),0);
 assert.deepEqual(errors,[]);await b.close();console.log('PASS still rest/contact, rapid reversals, projects, hidden tab, reduced motion');
})();


