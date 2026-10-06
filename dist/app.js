import {config} from './config.js';
import {portfolioPose} from './portfolio.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const simple=new URLSearchParams(location.search).get('view')==='simple';
const toggle=document.querySelector('#view-toggle');
let dispose=()=>{};
function staticView(){
  document.body.classList.remove('scene');document.body.classList.add('simple');
  toggle.textContent=simple?'Read interactive version':'Read simple version';
  toggle.href=simple?'./':'?view=simple';
}
staticView();
if(!simple&&!reduced.matches){
  try{const {prepareScene}=await import('./scene.js');start(await prepareScene());}
  catch(error){staticView();console.info('3D unavailable; the complete static resume remains readable.',error.message);}
}
reduced.addEventListener('change',()=>location.reload());
addEventListener('scene-failed',()=>{dispose();staticView();});

function start(scene){
  // The document is the scroll surface. Paper height plus main padding defines
  // native scroll distance; there is no virtual chapter timeline or inner scroller.
  document.body.classList.remove('simple');document.body.classList.add('scene');
  let frame=0,steamTimer=0,stopped=false,lastTime=performance.now(),lastScroll=scrollY,motion=0;
  function render(time=performance.now()){
    frame=0;clearTimeout(steamTimer);if(stopped||document.hidden)return;
    const dt=Math.max(1,Math.min(64,time-lastTime)),delta=scrollY-lastScroll;
    lastScroll=scrollY;lastTime=time;
    const target=Math.max(-1,Math.min(1,delta/dt*.35));
    motion+=(target-motion)*(1-Math.exp(-dt/config.scroll.settleMs));
    if(!delta&&Math.abs(motion)<.0005)motion=0;
    const rect=scene.paper.getBoundingClientRect();
    // Native document layout owns the full travel, including both reading margins.
    const layout=getComputedStyle(document.querySelector('#resume'));
    const travel=Math.max(0,rect.height+parseFloat(layout.paddingTop)+parseFloat(layout.paddingBottom)-innerHeight);
    scene.paper.dataset.scrollDistance=String(travel);
    const animation=scene.draw({left:rect.left,top:rect.top,width:rect.width,height:rect.height,scroll:scrollY,motion,portfolio:portfolioPose()});
    document.body.classList.toggle('has-scrolled',scrollY>24);
    if(motion||animation.hands)schedule();
    else if(animation.steam)steamTimer=setTimeout(schedule,50);
    else if(animation.wake!=null)steamTimer=setTimeout(schedule,animation.wake);
  }
  function schedule(){if(!frame&&!stopped)frame=requestAnimationFrame(render);}
  function measure(){if(stopped)return;cancelAnimationFrame(frame);frame=0;scene.resize(portfolioPose());render();}
  const controller=new AbortController(),{signal}=controller;
  addEventListener('scroll',schedule,{passive:true,signal});
  addEventListener('resize',measure,{passive:true,signal});
  document.addEventListener('visibilitychange',()=>{scene.resetIdle();clearTimeout(steamTimer);cancelAnimationFrame(frame);frame=0;if(!document.hidden){lastTime=performance.now();schedule();}},{signal});
  // Portfolio transforms are applied in its RAF callback. Draw in that same
  // frame so the depth mask never trails the DOM by one frame during turns.
  addEventListener('portfolio-frame',()=>{cancelAnimationFrame(frame);frame=0;render();},{signal});
  const observer=new ResizeObserver(measure);observer.observe(scene.paper);
  observer.observe(document.querySelector('#project-details'));observer.observe(document.querySelector('#gallery-paper'));
  document.fonts.ready.then(measure);measure();
  dispose=()=>{stopped=true;clearTimeout(steamTimer);cancelAnimationFrame(frame);controller.abort();observer.disconnect();scene.dispose();};
}
