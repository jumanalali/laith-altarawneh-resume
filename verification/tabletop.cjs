const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4185');await page.waitForSelector('.scene-3d');
 const idle=()=>page.waitForFunction(()=>document.querySelector('#portfolio').getAttribute('aria-busy')==='false');
 await page.locator('[data-open-project=""]').first().click();await idle();await page.waitForTimeout(150);
 const snapshot=()=>page.evaluate(async()=>({diagnostics:(await import('./scene.js')).getSceneDiagnostics(),rects:[document.querySelector('#project-details'),...document.querySelectorAll('.project-gallery:not([hidden]) .gallery-print')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}}),overflow:document.documentElement.scrollWidth>innerWidth}));
 const desktop=await snapshot();await page.screenshot({path:'verification/tabletop-desktop.png'});
 await page.locator('#next-project').click();await idle();const second=await snapshot();await page.screenshot({path:'verification/tabletop-second.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);const mobile=await snapshot();await page.screenshot({path:'verification/tabletop-mobile.png'});
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(100);await page.screenshot({path:'verification/tabletop-mobile-bottom.png'});
 await page.locator('#back-profile').click();await idle();assert.equal(await page.locator('#resume:visible').count(),1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({desktop,second,mobile,errors}));fs.writeFileSync('verification/tabletop.json',JSON.stringify({desktop,second,mobile,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
