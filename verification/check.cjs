const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
 await page.goto('http://127.0.0.1:4185');await page.waitForSelector('.scene-3d');await page.waitForTimeout(200);
 const snapshot=()=>page.evaluate(async()=>{
  const r=document.querySelector('.paper').getBoundingClientRect();const d=(await import('./scene.js')).getSceneDiagnostics();
  const rects=[...document.querySelectorAll('.resume-section')].map(s=>({id:s.id,top:s.getBoundingClientRect().top,bottom:s.getBoundingClientRect().bottom,opacity:getComputedStyle(s).opacity,position:getComputedStyle(s).position}));
  return {scroll:scrollY,paperTop:r.top,paperBottom:r.bottom,paperHeight:r.height,sections:rects,desk:d.deskMatrix,hands:d.gripPosition,projectedTop:d.paperCorners[0][1],projectedBottom:d.paperCorners[2][1],horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
 });
 const start=await snapshot();await page.screenshot({path:'verification/continuous-desktop.png'});
 await page.evaluate(()=>scrollTo({top:850,behavior:'instant'}));await page.waitForTimeout(100);const middle=await snapshot();await page.screenshot({path:'verification/continuous-middle.png'});
 await page.evaluate(()=>scrollTo({top:1500,behavior:'instant'}));await page.waitForTimeout(100);await page.evaluate(()=>scrollTo({top:850,behavior:'instant'}));await page.waitForTimeout(100);const reverse=await snapshot();
 const checks=await page.evaluate(()=>({papers:document.querySelectorAll('.paper').length,menu:document.querySelectorAll('nav,.chapter-nav,.nav-heading,.progress-label,.place').length,oldIdentity:/Alaa|Jarwan/i.test(document.body.innerText+' '+document.title+' '+document.querySelector('meta[name=description]').content),location:/Amman,\s*Jordan/i.test(document.body.innerText),counters:/\b0[1-7]\s*\/\s*0[1-7]\b/.test(document.body.innerText),nestedScrollers:[...document.querySelectorAll('main *')].filter(e=>['auto','scroll','hidden'].includes(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+1).length,links:[...document.querySelectorAll('.resume-link')].map(a=>a.getAttribute('href')),unlinkedActions:document.querySelectorAll('.unlinked-action').length,text:document.querySelector('.paper').innerText}));
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(100);const end=await snapshot();await page.screenshot({path:'verification/continuous-end.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(150);const mobileStart=await snapshot();await page.screenshot({path:'verification/continuous-mobile.png'});
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(100);const mobileEnd=await snapshot();await page.screenshot({path:'verification/continuous-mobile-end.png'});
 const source=await import('../src/content.js');const norm=s=>s.replace(/<br>/g,' ').replace(/\s+/g,' ').trim();const allText=norm(checks.text),missing=[];
 for(const section of source.resume.sections){for(const value of [section.title,...section.blocks.flatMap(b=>[b.label,b.text,b.meta,b.title,b.action?.label])])if(value&&!allText.includes(norm(value)))missing.push(value)}
 delete checks.text;
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();const reduced={mode:await page.locator('body').getAttribute('class'),sections:await page.locator('.resume-section:visible').count()};
 await page.emulateMedia({reducedMotion:'no-preference'});await page.route('**/left-hand.glb',r=>r.abort());await page.reload();await page.waitForTimeout(300);const fallback={mode:await page.locator('body').getAttribute('class'),sections:await page.locator('.resume-section:visible').count()};
 const noJSPage=await browser.newPage({javaScriptEnabled:false});await noJSPage.goto('http://127.0.0.1:4185');const noJS=await noJSPage.locator('.resume-section:visible').count();
 const result={checks,missingText:missing,start,middle,reverse,end,mobileStart,mobileEnd,reduced,fallback,noJS,errors,failed:failed.filter(u=>!u.includes('left-hand.glb'))};fs.writeFileSync('verification/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
})();

