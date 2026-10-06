// The résumé and portfolio share one renderer. All text and controls stay native DOM.
const profile=document.querySelector('#resume'),portfolio=document.querySelector('#portfolio');
const details=document.querySelector('#project-details'),gallery=document.querySelector('#gallery-paper');
const documents=[...document.querySelectorAll('.project-document')];
const galleries=[...document.querySelectorAll('.project-gallery')];
const choice=document.querySelector('#project-choice'),back=document.querySelector('#back-profile');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let active=false,busy=false,selected=0,savedScroll=0,opener=null,cameraBlend=0,turn=0;
const redraw=()=>dispatchEvent(new Event('portfolio-frame'));
let pickup=null,pickupBusy=false,closeRequested=false;
export function portfolioPose(){return {active,cameraBlend,turn,pickup};}
function lock(value){busy=value;portfolio.setAttribute('aria-busy',String(value));for(const el of portfolio.querySelectorAll('button,select'))el.disabled=value;}
function animate(duration,draw){
 return new Promise(resolve=>{
  if(reduced.matches){draw(1);redraw();resolve();return;}
  const start=performance.now();
  function step(now){const t=Math.min(1,(now-start)/duration),e=t*t*(3-2*t);draw(e);redraw();if(t<1)requestAnimationFrame(step);else resolve();}
  requestAnimationFrame(step);
 });
}
function status(){document.querySelector('#portfolio-status').textContent=`${choice.options[selected].text}, ${selected+1} of ${documents.length}`;}
function select(index){
 selected=(index+documents.length)%documents.length;choice.value=String(selected);
 documents.forEach((d,i)=>d.hidden=i!==selected);galleries.forEach((g,i)=>g.hidden=i!==selected);status();if(active)fitFallback();
}
export async function openPortfolio(id,source){
 if(busy||active)return;lock(true);opener=source;savedScroll=scrollY;
 const requested=documents.findIndex(d=>d.dataset.project===id);select(requested<0?0:requested);
 profile.inert=true;
 const sheet=profile.querySelector('.held-assembly');
 await animate(380,t=>{sheet.style.transform=`translate(${-t*innerWidth*1.15}px,${-t*80}px)`;cameraBlend=t*.45;});
 profile.hidden=true;portfolio.hidden=false;active=true;document.body.classList.add('portfolio-active');document.documentElement.classList.add('portfolio-active');fitFallback();
 scrollTo({top:0,behavior:'instant'});
 await animate(460,t=>{cameraBlend=.45+t*.55;turn=Math.sin(t*Math.PI)*.65;});
 details.style.transform='';gallery.style.transform='';turn=0;lock(false);redraw();document.querySelector('#portfolio-heading').focus({preventScroll:true});
}
async function closePortfolio(){
 if(pickup){await closePhoto();if(pickup)return;}
 if(busy||!active)return;lock(true);
 await animate(350,t=>{cameraBlend=1-t*.55;turn=-Math.sin(t*Math.PI)*.55;});
 portfolio.hidden=true;profile.hidden=false;active=false;document.body.classList.remove('portfolio-active');document.documentElement.classList.remove('portfolio-active');
 const sheet=profile.querySelector('.held-assembly');sheet.style.transform=`translate(${-innerWidth*1.15}px,-80px)`;
 scrollTo({top:savedScroll,behavior:'instant'});
 await animate(380,t=>{sheet.style.transform=`translate(${-(1-t)*innerWidth*1.15}px,${-(1-t)*80}px)`;cameraBlend=.45*(1-t);turn=0;});
 sheet.style.transform='';details.style.transform='';gallery.style.transform='';profile.inert=false;lock(false);redraw();opener?.focus({preventScroll:true});
}
async function changeProject(index){
 if(pickup){await closePhoto();if(pickup)return;}
 if(busy||!active)return;lock(true);
 await animate(150,t=>{turn=t;});select(index);scrollTo({top:0,behavior:'instant'});
 await animate(200,t=>{turn=1-t;});turn=0;lock(false);redraw();
}
for(const button of document.querySelectorAll('[data-open-project]'))button.addEventListener('click',()=>openPortfolio(button.dataset.openProject,button));
back.addEventListener('click',closePortfolio);
document.querySelector('.wordmark').addEventListener('click',e=>{if(active){e.preventDefault();closePortfolio();}});
document.querySelector('#previous-project').addEventListener('click',()=>changeProject(selected-1));
document.querySelector('#next-project').addEventListener('click',()=>changeProject(selected+1));
choice.addEventListener('change',()=>changeProject(+choice.value));
addEventListener('keydown',e=>{if(e.key==='Escape'&&active){if(pickup)closePhoto();else closePortfolio();}});

function fitFallback(){
 if(!active||!document.body.classList.contains('simple'))return;
 const layout=document.querySelector('.portfolio-layout');layout.style.transform='';layout.style.height='auto';
 const top=document.querySelector('#back-profile').getBoundingClientRect().bottom+12;
 const bottom=document.querySelector('.portfolio-toolbar').getBoundingClientRect().top-16;
 const scale=Math.min(1,(bottom-top)/layout.offsetHeight,(innerWidth-32)/layout.offsetWidth);
 layout.style.marginTop=`${Math.max(0,top-portfolio.getBoundingClientRect().top-parseFloat(getComputedStyle(portfolio).paddingTop))}px`;
 layout.style.transform='scale('+scale+')';layout.style.transformOrigin='top center';
}
addEventListener('resize',fitFallback);
document.fonts.ready.then(fitFallback);

// Native modal keeps viewing and keyboard focus inside the existing scene.
const viewer=document.createElement('dialog');viewer.className='photo-viewer';
viewer.setAttribute('aria-label','Project photograph');
viewer.innerHTML='<button type="button" autofocus>Close photograph</button><img alt="">';
document.body.append(viewer);
viewer.querySelector('button').addEventListener('click',()=>viewer.close());
viewer.addEventListener('click',e=>{if(e.target===viewer)viewer.close();});
for(const photo of document.querySelectorAll('.gallery-print')){
 photo.tabIndex=0;photo.setAttribute('role','button');photo.setAttribute('aria-label','View project photograph');photo.setAttribute('aria-haspopup','dialog');
 const show=()=>{if(busy||pickup)return;if(document.body.classList.contains('scene')){openPhoto(photo);return;}const source=photo.querySelector('img'),image=viewer.querySelector('img');image.src=source.currentSrc||source.src;image.alt=source.alt;viewer.showModal();};
 photo.addEventListener('click',show);
 photo.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
}
viewer.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});
const photoClose=document.createElement('button');photoClose.className='photo-close';photoClose.textContent='×';photoClose.setAttribute('aria-label','Close photo');photoClose.hidden=true;document.querySelector('#portfolio').append(photoClose);
photoClose.addEventListener('click',closePhoto);
async function openPhoto(photo){
 if(pickup||busy)return;pickup={index:[...photo.parentElement.children].indexOf(photo),progress:0};pickupBusy=true;lock(true);photoClose.hidden=false;photoClose.disabled=true;
 photo.classList.add('photo-held');document.body.classList.add('photo-presenting');
 await animate(1100,t=>{pickup.progress=t;});pickupBusy=false;lock(false);photoClose.disabled=false;photoClose.focus({preventScroll:true});if(closeRequested){closeRequested=false;closePhoto();}
}
async function closePhoto(){
 if(!pickup)return;if(pickupBusy){closeRequested=true;return;}closeRequested=false;pickupBusy=true;lock(true);photoClose.disabled=true;
 const photo=document.querySelector('.photo-held');
 await animate(1000,t=>{pickup.progress=1-t;});pickup=null;pickupBusy=false;closeRequested=false;photoClose.hidden=true;photo?.classList.remove('photo-held');document.body.classList.remove('photo-presenting');lock(false);redraw();photo?.focus({preventScroll:true});
}


