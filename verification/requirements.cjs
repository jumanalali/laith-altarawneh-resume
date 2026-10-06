const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4185');await page.waitForSelector('.scene-3d');
 const imported=await page.evaluate(source=>{
  const ref=new DOMParser().parseFromString(source.replace(/<br\s*\/?\s*>/gi,' '),'text/html');
  const norm=s=>s.replace(/\s+/g,' ').trim();
  const text=norm(document.querySelector('.paper').innerText+' '+[...document.querySelectorAll('.project-document p,.project-document h3,.project-document h4')].map(e=>e.textContent).join(' '));
  const content=[...ref.querySelectorAll('.paper-section p:not(.section-label):not(.location),.paper-section h1,.paper-section h2,.paper-section h3')].map(e=>norm(e.textContent));
  for(const t of ref.querySelectorAll('template'))for(const e of t.content.querySelectorAll('p:not(.section-label),h2,h3'))content.push(norm(e.textContent));
  const expectedLinks=[...ref.querySelectorAll('template')].flatMap(t=>[...t.content.querySelectorAll('a')].map(a=>a.getAttribute('href')));
  return {missing:content.filter(s=>!text.includes(s)),expectedLinks,actualLinks:[...document.querySelectorAll('.live-links a')].map(a=>a.href)};
 },fs.readFileSync('reference.html','utf8'));
 assert.deepEqual(imported.missing,[]);assert.deepEqual(imported.actualLinks,imported.expectedLinks);
 await page.locator('.resume-link').first().click();await page.waitForFunction(()=>document.querySelector('#portfolio').getAttribute('aria-busy')==='false');
 await page.locator('#back-profile').click();await page.waitForFunction(()=>document.querySelector('#portfolio').hidden);
 await page.waitForFunction(()=>document.querySelector('#portfolio').getAttribute('aria-busy')==='false');
 const widths=[];
 for(const [width,height] of [[1440,1000],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(80);
  const start=await page.evaluate(()=>({top:document.querySelector('.paper').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth}));
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(80);
  const end=await page.evaluate(()=>({bottom:document.querySelector('.paper').getBoundingClientRect().bottom,viewport:innerHeight,travel:+document.querySelector('.paper').dataset.scrollDistance,actual:document.documentElement.scrollHeight-innerHeight}));
  assert(!start.overflow);assert(start.top>=0);assert(end.bottom<=height);assert(Math.abs(end.travel-end.actual)<1);
  widths.push({width,height,start,end});
 }
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)}});
 await fallback.goto('http://127.0.0.1:4185');assert.equal(await fallback.locator('.resume-section:visible').count(),6);assert.equal(await fallback.locator('body').getAttribute('class'),'simple');
 assert.deepEqual(errors,[]);
 fs.writeFileSync('verification/requirements.json',JSON.stringify({imported,widths,webglFallback:true,errors},null,2));
 console.log('PASS: complete reference text, exact external links, scene navigation, four viewports, native full-height travel, and unavailable WebGL fallback.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


