const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4185');await page.waitForSelector('.scene-3d');
 const idle=()=>page.waitForFunction(()=>document.querySelector('#portfolio').getAttribute('aria-busy')==='false');
 const check=async()=>{
  const state=await page.evaluate(async()=>{
   const photos=[...document.querySelectorAll('.project-gallery:not([hidden]) .gallery-print')];
   const d=(await import('./scene.js')).getSceneDiagnostics();
   return {count:photos.length,loaded:photos.every(p=>p.querySelector('img').naturalWidth>0),overflow:document.documentElement.scrollWidth>innerWidth,
    selected:document.querySelector('.project-document:not([hidden])').dataset.project,gallery:document.querySelector('.project-gallery:not([hidden])').dataset.gallery,
    normals:d?.tabletop,rects:[document.querySelector('#project-details'),...photos].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})};
  });
  assert.equal(state.selected,state.gallery);assert.equal(state.count,3);assert(state.loaded);assert(!state.overflow);
  assert.equal(await page.locator('#next-image,#previous-image,#image-status,.gallery-print figcaption').count(),0);
  if(state.normals){
   for(const normal of state.normals.paperNormals)assert.deepEqual(normal,state.normals.tableNormal);
   for(const [i,r] of state.rects.entries()){
    const corners=state.normals.corners[i],xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
    const expected=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
    assert(r.every((v,k)=>Math.abs(v-expected[k])<1),'DOM and physical paper must align');
    assert(r[0]>=0&&r[2]<=await page.evaluate(()=>innerWidth),'no lateral clipping');
   }
  }
  return state;
 };
 await page.locator('[data-open-project="project-freelance"]').scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);
 await page.locator('[data-open-project="project-freelance"]').click();await page.waitForTimeout(580);await page.screenshot({path:'verification/tabletop-enter.png'});await idle();assert.equal((await check()).selected,'project-freelance');
 const stable=await page.locator('.project-gallery:not([hidden]) .gallery-print').evaluateAll(es=>es.map(e=>e.style.transform));await page.waitForTimeout(120);
 assert.deepEqual(await page.locator('.project-gallery:not([hidden]) .gallery-print').evaluateAll(es=>es.map(e=>e.style.transform)),stable);
 await page.locator('#next-project').click();await page.waitForTimeout(80);await page.screenshot({path:'verification/tabletop-switch.png'});await idle();assert.equal((await check()).selected,'project-htu');
 await page.locator('#previous-project').click();await idle();assert.equal((await check()).selected,'project-freelance');
 await page.locator('#project-choice').selectOption('0');await idle();assert.equal((await check()).selected,'project-rahma');
 await page.locator('#back-profile').click();await page.waitForTimeout(190);await page.screenshot({path:'verification/tabletop-return.png'});await idle();assert.equal(await page.evaluate(()=>scrollY),before);
 for(const width of [320,390,800,1024,1440]){
  await page.setViewportSize({width,height:width===1440?1000:844});await page.locator('[data-open-project=""]').first().click();await idle();await check();
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(100);
  const bottom=await check();assert(bottom.rects.every(r=>r[3]<=844+160),'paper ends reachable');
  await page.keyboard.press('Escape');await idle();assert.equal(await page.locator('#resume:visible').count(),1);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('[data-open-project=""]').first().click();await idle();await check();await page.locator('#next-project').click();await idle();await check();await page.locator('#back-profile').click();await idle();
 const fallback=await browser.newPage();await fallback.route('**/refined-hands.glb',r=>r.abort());await fallback.goto('http://127.0.0.1:4185');await fallback.locator('[data-open-project=""]').first().click();await fallback.waitForFunction(()=>document.querySelector('#portfolio').getAttribute('aria-busy')==='false');assert.equal(await fallback.locator('.gallery-print:visible').count(),3);
 const noJS=await browser.newPage({javaScriptEnabled:false});await noJS.goto('http://127.0.0.1:4185');assert.equal(await noJS.locator('.project-document:visible').count(),3);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: three loaded prints, physical/DOM alignment, stable arrangement, project selector/previous/next, exact return position, five viewport widths, reduced motion, model-failure and no-JS fallbacks.');
})().catch(e=>{console.error(e);process.exit(1)});
