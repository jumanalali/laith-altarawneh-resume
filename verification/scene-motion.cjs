const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,channel:'msedge',args:['--disable-features=OverlayScrollbar']});
const page=await browser.newPage({viewport:{width:1874,height:918}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4185');await page.waitForSelector('.scene-3d');
// Force classic scrollbar space even on test hosts that use overlay scrollbars.
await page.addStyleTag({content:'html{overflow-y:scroll;scrollbar-gutter:stable}'});
await page.evaluate(()=>dispatchEvent(new Event('resize')));
const shot=async(name)=>{await page.screenshot({path:`verification/${name}.png`});};
const diagnostics=()=>page.evaluate(async()=>{
 const d=(await import('./scene.js')).getSceneDiagnostics(),r=document.querySelector('.paper').getBoundingClientRect();
 return {...d,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},canvasWidth:document.querySelector('canvas.scene-3d').getBoundingClientRect().width};
});
await page.evaluate(()=>scrollTo({top:430,behavior:'instant'}));await page.waitForTimeout(1300);await shot('scene-rest');const rest=await diagnostics();
const frames=[];
for(const [name,steps] of [['forward',[450,480,520,570,620]],['reverse',[580,530,470,400,350]]]){
 for(const top of steps){await page.evaluate(top=>scrollTo({top,behavior:'instant'}),top);await page.waitForTimeout(30);frames.push(await diagnostics());}
 await shot(`scene-${name}`);
}
await page.waitForTimeout(1400);const settled=await diagnostics();await shot('scene-settled');
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo({top:350,behavior:'instant'}));await page.waitForTimeout(1200);await shot('scene-mobile');const mobile=await diagnostics();
for(const d of [rest,...frames,settled,mobile]){
 const expected=[[d.rect.left,d.rect.top],[d.rect.right,d.rect.top],[d.rect.right,d.rect.bottom],[d.rect.left,d.rect.bottom]];
 d.cornerError=Math.max(...d.paperCorners.flatMap((p,i)=>p.map((x,j)=>Math.abs(x-expected[i][j]))));
 assert(d.cornerError<.1,`mask drift: ${d.cornerError}`);assert.equal(d.canvasWidth,d.viewport[0]);
}
assert.equal(settled.pose.motion,0);assert(frames.some(d=>d.pose.motion>0));assert(frames.some(d=>d.pose.motion<0));
assert.deepEqual(rest.deskMatrix,settled.deskMatrix);assert.deepEqual(errors,[]);
fs.writeFileSync('verification/scene-motion.json',JSON.stringify({rest,frames,settled,mobile,errors},null,2));
console.log(JSON.stringify({maxCornerError:Math.max(...frames.map(d=>d.cornerError)),motion:frames.map(d=>d.pose.motion),settled:settled.pose.motion,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
