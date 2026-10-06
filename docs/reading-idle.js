import * as THREE from './vendor/three.module.js';
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function createReadingIdle(){
 let debug={},restCache=null;
 let phase='waiting',lastScroll=scrollY,lastInput=performance.now(),started=0,used=false,snapshot=null,last=null,open=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const save=hand=>({position:hand.pivot.getWorldPosition(new THREE.Vector3()),rotation:hand.pivot.getWorldQuaternion(new THREE.Quaternion()),open,fingers:hand.capturePose()});
 const reset=()=>{phase='waiting';lastScroll=scrollY;lastInput=performance.now();used=false;snapshot=null;last=null;open=0;restCache=null;};
 function prepare(enabled,ready,now){
  if(!enabled||document.hidden||reduced.matches){reset();return false;}
  if(scrollY!==lastScroll){lastInput=now;used=false;lastScroll=scrollY;if(phase!=='waiting'&&phase!=='return'){phase='return';started=now;snapshot=last;}}
  if(phase==='waiting'&&!used&&ready&&now-lastInput>=3000){phase='release';started=now;used=true;snapshot=null;}
  return phase!=='waiting';
 }
 function apply(hand,desk,camera,rect,width,height,now){
  if(phase==='waiting')return {active:false,wake:Math.max(1,3000-(now-lastInput))};
  hand.pivot.updateWorldMatrix(true,true);
  const grip=save(hand);grip.open=0;
  if(!snapshot)snapshot=grip;
  const normal=new THREE.Vector3(0,1,0).transformDirection(desk.root.matrixWorld);
  const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,desk.root.localToWorld(new THREE.Vector3(0,2,0)));
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(2*Math.max(65,rect.left-115)/width-1,1-2*.68),camera);
  const rest=ray.ray.intersectPlane(plane,new THREE.Vector3());
  if(!rest){reset();return {active:false,wake:3000};}
  const rotation=desk.root.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-1.0)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),.12)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.35));
  // Build a resting pose against the actual tabletop plane, including skin.
  const place=(position,quaternion)=>{hand.pivot.position.copy(hand.pivot.parent.worldToLocal(position.clone()));hand.pivot.quaternion.copy(hand.pivot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(quaternion));hand.pivot.updateMatrixWorld(true);};
  const cacheKey=[width,height,rect.left,hand.content.scale.x].join(':');
  if(restCache?.key!==cacheKey){
   hand.pose(0,0,0,.88,.42);place(rest,rotation);hand.alignPalm(normal);hand.seatPalm(plane);hand.pivot.updateMatrixWorld(true);
   const gaps=hand.restFingers(plane);hand.seatOnPlane(plane);gaps.contact=hand.deskContact(plane);
   restCache={key:cacheKey,pose:save(hand),gaps};
  }
  const t=(now-started)/1000,resting=restCache.pose,gaps=restCache.gaps;
  let position,quaternion,fingerBlend=0;
  if(phase==='release'){
   open=.88*ease(t/.32);position=snapshot.position;quaternion=snapshot.rotation;
   if(t>=.32){phase='lower';started=now;}
  }else if(phase==='lower'){
   const blend=ease(t/1.0);open=.88;position=snapshot.position.clone().lerp(resting.position,blend);quaternion=snapshot.rotation.clone().slerp(resting.rotation,blend);fingerBlend=blend;
   if(t>=1){phase='rest';started=now;}
  }else if(phase==='return'){
   const blend=ease(t/.85);open=snapshot.open*(1-ease((t-.50)/.35));position=snapshot.position.clone().lerp(grip.position,blend);quaternion=snapshot.rotation.clone().slerp(grip.rotation,blend);
   if(t>=.85){hand.pose();place(grip.position,grip.rotation);phase='waiting';last=null;return {active:false,returned:true,wake:Math.max(1,3000-(now-lastInput))};}
  }else{open=.88;position=resting.position;quaternion=resting.rotation;fingerBlend=1;}
  hand.pose(0,0,0,open,.38+.04*(open/.88));place(position,quaternion);
  if(phase==='return')hand.blendPose(snapshot.fingers,1-ease(t/.85));else if(fingerBlend)hand.blendPose(resting.fingers,fingerBlend);
  const bound=hand.keepBelow(camera,height);debug={gaps,bound};last=save(hand);
  return {active:phase!=='rest',wake:used?null:Math.max(1,3000-(now-lastInput))};
 }
 return {prepare,apply,reset,inspect:()=>({phase,used,open,lastInput,debug}),get reserved(){return phase!=='waiting';}};
}









