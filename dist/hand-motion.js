// Coordination ported from supplied playground.js; the existing scene owns RAF.
export function createHandMotion(){
 const hands=['left','right'].map(side=>({side,anchor:0,x:0,y:0,phase:'grip',elapsed:0,open:0,outward:0,velocity:0,target:0,targetFraction:0}));
 const coordination={active:null,lastScroll:scrollY,lastTime:0,speed:0,direction:0};
 const model={frame:0,state:'reading'},handsLayer={},handHost={hidden:false};
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=(v,min,max)=>Math.min(Math.max(v,min),Math.max(min,max)),ease=t=>t*t*(3-2*t);
 let rect=null,pending=false,initialized=false,metric=170,lastWidth=0,lastHeight=0;
 const paper={getBoundingClientRect:()=>rect},handScale=()=>metric,enabled=()=>true,handVisibility=()=>{};
  function handGeometry(hand, rect) {
    const scale = handScale(), left = hand.side === 'left';
    // Reserve the far ring's radius too, not just the arm centerline endpoint.
    const min = Math.max(innerHeight * .45 + scale*.9, innerHeight - scale * 3.05, rect.top + scale * .25);
    const max = Math.min(innerHeight * .91, rect.bottom - scale * .85);
    return { x:left ? rect.left : rect.right, min, max,
      low:Math.min(max-25,min+70), high:Math.min(max,innerHeight*(left?.85:.78)),
      target:clamp(innerHeight*(left?.74:.64),min,max), visible:max>=min };
  }

  function paintHand(hand,x,y) { hand.x=x; hand.y=y; }
  function renderHands() {}
  function placeGrips(rect) {
    hands.forEach(hand=>{
      const pose=handGeometry(hand,rect);
      hand.phase='grip';hand.open=0;hand.outward=0;hand.velocity=0;hand.elapsed=0;hand.slipped=false;
      hand.anchor=pose.target-rect.top;hand.target=pose.target;
      paintHand(hand,pose.x,pose.target);
    });
  }
  function resetHands(preserve=false) {
    cancelAnimationFrame(model.frame);model.frame=0;handsLayer.hidden=true;
    const rect=paper.getBoundingClientRect();
    if(preserve && !reducedMotion.matches) {
      hands.forEach(hand=>{
        // Layout changes retain the rendered pose and phase. Travel retargets
        // from it on the next frame; no interpolation start or clock is reset.
        hand.anchor=hand.y-rect.top;
      });
    } else {
      coordination.active=null;placeGrips(rect);
    }
    coordination.lastScroll=scrollY;coordination.lastTime=performance.now();renderHands(rect);scheduleHands();
  }
  function startRelease(hand) {
    coordination.active=hand.side;hand.phase='release';hand.elapsed=0;
    hand.startOpen=hand.open;hand.velocity=0;
    // This is the last rendered pose, not an already-scrolled destination.
    // The supporting hand continues to use its unchanged paper attachment.
    hand.targetFraction=destinationFraction(hand);
  }
  function destinationFraction(hand) {
    return coordination.direction<0 ? (hand.side==='left'?.74:.72) : (hand.side==='left'?.84:.80);
  }
  function phase(hand,name) { hand.phase=name;hand.elapsed=0; }
  function trackTarget(hand,target,dt) {
    // Exact critically damped step, with velocity retained when the live target
    // changes. Scroll never resets the phase, origin, or animation progress.
    const omega=22,offset=hand.y-target,c=hand.velocity+omega*offset,decay=Math.exp(-omega*dt);
    const next=target+(offset+c*dt)*decay;
    const step=clamp(next-hand.y,-1200*dt,1200*dt);
    hand.y+=step;
    hand.velocity=clamp((hand.velocity-omega*c*dt)*decay,-1200,1200);
  }
  function needsHandover(hand,p,rect) {
    const y=rect.top+hand.anchor;
    const lead=Math.min(120,Math.abs(coordination.speed)*.45);
    const low=p.low+(coordination.direction>0?lead:0),high=p.high-(coordination.direction<0?lead:0);
    const target=clamp(innerHeight*destinationFraction(hand),p.min,p.max);
    return hand.slipped||(y<low-12||y>high+12)&&Math.abs(target-y)>45;
  }
  function updateHands(now) {
    model.frame=0;if(model.state!=='reading')return;
    const rect=paper.getBoundingClientRect(),delta=scrollY-coordination.lastScroll;
    const elapsed=Math.max(0,(now-coordination.lastTime)/1000),dt=Math.min(.05,elapsed);
    coordination.lastTime=now;coordination.lastScroll=scrollY;
    coordination.speed=coordination.speed*Math.exp(-elapsed*7)+delta*7;
    if(Math.abs(delta)>1)coordination.direction=Math.sign(delta);
    if(!enabled()) { coordination.active=null;placeGrips(rect);handVisibility();return; }
    if(reducedMotion.matches){coordination.active=null;placeGrips(rect);renderHands(rect);return;}
    const geometry=new Map(hands.map(h=>[h,handGeometry(h,rect)]));
    if([...geometry.values()].some(p=>!p.visible)) { handHost.hidden=true;return; }
    // A scrollbar/Home/End jump during closure can strand that grip offscreen.
    // Reopen from the visible pose, without a fade, teleport, or queued gesture.
    const active=hands.find(h=>h.side===coordination.active);
    if(active?.phase==='regrip'&&Math.abs(delta)>innerHeight*.6)startRelease(active);
    if(!coordination.active&&!rect.idleLeft) {
      const candidates=hands.filter(h=>needsHandover(h,geometry.get(h),rect));
      // Right is preferred unless the supporting left is closer to its reach limit.
      candidates.sort((a,b)=>{
        const urgency=h=>{const p=geometry.get(h),y=rect.top+h.anchor;return Math.max(p.low-y,y-p.high)+(h.side==='right'?15:0);};
        return urgency(b)-urgency(a);
      });
      if(candidates.length)startRelease(candidates[0]);
    }
    hands.forEach(hand=>{
      if(rect.idleLeft&&hand.side==='left')return;
      const p=geometry.get(hand);
      hand.x+=(p.x-hand.x)*(1-Math.exp(-dt*22));
      if(Math.abs(p.x-hand.x)<.1)hand.x=p.x;
      if(hand.side!==coordination.active){followGrip(hand,p,dt);hand.open=0;hand.outward=0;hand.phase='grip';return;}
      hand.elapsed+=dt;
      if(Math.abs(delta)>10)hand.targetFraction=destinationFraction(hand);
      hand.target=clamp(innerHeight*hand.targetFraction,p.min,p.max);
      if(hand.phase==='release') {
        const t=clamp(hand.elapsed/.17,0,1);hand.open=hand.startOpen+(1-hand.startOpen)*t;
        if(t===1)phase(hand,'depart');
      } else if(hand.phase==='depart') {
        hand.outward=.28*ease(clamp(hand.elapsed/.11,0,1));
        if(hand.elapsed>=.11)phase(hand,'travel');
      } else if(hand.phase==='travel'||hand.phase==='approach') {
        trackTarget(hand,hand.target,dt);
        if(hand.phase==='travel'&&Math.abs(hand.y-hand.target)<1&&Math.abs(hand.velocity)<20)phase(hand,'approach');
        if(hand.phase==='approach') {
          hand.outward=.28*(1-ease(clamp(hand.elapsed/.14,0,1)));
          if(hand.elapsed>=.14&&Math.abs(hand.y-hand.target)<1){
            hand.anchor=hand.y-rect.top;hand.velocity=0;hand.slipped=false;phase(hand,'regrip');
          }
        }
      } else if(hand.phase==='regrip') {
        followGrip(hand,p,dt);hand.open=1-clamp(hand.elapsed/.18,0,1);
        if(hand.open===0){phase(hand,'grip');coordination.active=null;}
      }
    });
    hands.forEach(hand=>{
      const p=geometry.get(hand),safe=clamp(hand.y,p.min,p.max);
      if(safe!==hand.y){hand.y=safe;hand.velocity=0;hand.anchor=safe-rect.top;hand.slipped=true;}
      hand.target=clamp(hand.target,p.min,p.max);
    });
    renderHands(rect);
    // One extra pass after closure selects any newly necessary support handover.
    if(coordination.active || (!rect.idleLeft&&hands.some(h=>Math.abs(h.x-geometry.get(h).x)>.1||needsHandover(h,geometry.get(h),rect))))scheduleHands();
  }

  function scheduleHands() {
    if (!model.frame && model.state === 'reading') pending = true;
  }
  function followGrip(hand,p,dt){
    const desired=rect.top+hand.anchor;
    // Paper can slide through the supporting grip during a jump while the
    // other hand completes its release. Never teleport with the document.
    const target=clamp(desired,p.min+12,p.max);
    const step=clamp(target-hand.y,-700*dt,700*dt);
    hand.y+=step;hand.velocity=0;
    if(target!==desired||Math.abs(target-hand.y)>.1){hand.anchor=hand.y-rect.top;hand.slipped=true;}
  }


 return {update(next,scale,reading,now=performance.now()){
  pending=false;if(!reading){initialized=false;return null;}
  rect=next;metric=scale;
  if(!initialized){resetHands();initialized=true;}
  else if(lastWidth!==innerWidth||lastHeight!==innerHeight){resetHands(true);}
  lastWidth=innerWidth;lastHeight=innerHeight;handHost.hidden=false;updateHands(now);
  return {hands,active:coordination.active,pending,visible:!handHost.hidden};
 },reanchor(side,y){const h=hands.find(h=>h.side===side);h.y=y;h.anchor=y-rect.top;h.phase='grip';h.open=0;h.velocity=0;h.slipped=false;},inspect:()=>({active:coordination.active,pending,hands:hands.map(h=>({...h}))})};
}
