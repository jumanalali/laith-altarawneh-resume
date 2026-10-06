import * as THREE from './vendor/three.module.js';
import {config} from './config.js';

// Physical sheets are defined in desk coordinates, just like the notebook.
// The DOM uses the same projection matrix, retaining selectable, sharp text.
export function createTabletop(scene,desk,depthMaterial,edgeMaterial,hands){
  const root=new THREE.Group();root.name='tabletop-portfolio';desk.root.add(root);root.visible=false;
  const surfaces=Array.from({length:4},()=>{
    const group=new THREE.Group();root.add(group);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(1,1),depthMaterial);face.rotation.x=-Math.PI/2;face.renderOrder=-100;face.castShadow=true;group.add(face);
    const edge=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),[edgeMaterial,edgeMaterial,depthMaterial,edgeMaterial,edgeMaterial,edgeMaterial]);edge.renderOrder=-99;edge.castShadow=true;edge.receiveShadow=true;group.add(edge);
    return {group,face,edge};
  });
  const viewport=new THREE.Matrix4(),map=new THREE.Matrix4(),projection=new THREE.Matrix4();
  const normal=new THREE.Vector3(),target=new THREE.Vector3();
  let diagnostics=null;
  function hide(){root.visible=false;desk.placePortfolioProps(0);document.body.classList.remove('tabletop-ready');}
  function draw(camera,width,height,pose){
    const startPosition=camera.position.clone(),startRotation=camera.quaternion.clone(),startFov=camera.fov;
    root.visible=true;document.body.classList.add('tabletop-ready');
    const summary=document.querySelector('#project-details');
    const photos=[...document.querySelectorAll('.project-gallery:not([hidden]) .gallery-print')];
    const elements=[summary,...photos];
    const mobile=width<=800,inset=mobile?158:138;
    const virtualHeight=height;
    document.querySelector('.portfolio-layout').style.height=`${virtualHeight-inset}px`;
    const summaryWidth=mobile?800:800,summaryDepth=summary.offsetHeight/summary.offsetWidth*summaryWidth;
    const top=mobile?-900:-650;
    const layouts=mobile?[
      {x:0,z:top+summaryDepth/2,w:800,d:summaryDepth,a:-.012},
      {x:-278,z:top+summaryDepth+160,w:255,d:191,a:-.07},
      {x:0,z:top+summaryDepth+178,w:255,d:191,a:.055},
      {x:278,z:top+summaryDepth+152,w:255,d:191,a:-.035}
    ]:[
      {x:-280,z:top+summaryDepth/2,w:800,d:summaryDepth,a:-.012},
      {x:495,z:-405,w:520,d:390,a:-.065},
      {x:900,z:-80,w:520,d:390,a:.055},
      {x:500,z:340,w:520,d:390,a:-.04}
    ];
    if(mobile){
      const span=summaryDepth+380,fit=Math.min(1,1800/span),center=top+span/2;
      layouts.forEach(r=>{r.x*=fit;r.z=(r.z-center)*fit;r.w*=fit;r.d*=fit;});
    }
    layouts.forEach(r=>{r.z+=180;});
    // Retain the original framing envelope so the summary, desk and hands
    // keep their existing screen size while only the photographs shrink.
    layouts.forEach((r,i)=>{r.photoScale=i?.82:1;r.w*=r.photoScale;r.d*=r.photoScale;});
    layouts.forEach((r,i)=>{
      const s=surfaces[i];s.group.position.set(r.x,2.2+i*.12,r.z+pose.turn*8);s.group.rotation.set(0,r.a,0);
      s.face.scale.set(r.w,r.d,1);s.edge.scale.set(r.w,1.1,r.d);s.edge.position.y=-.6;
    });
    desk.root.updateMatrixWorld(true);
    const bounds=new THREE.Box3();surfaces.forEach(s=>bounds.expandByObject(s.group));
    target.copy(desk.root.localToWorld(new THREE.Vector3(0,0,0)));
    normal.set(0,1,0).transformDirection(desk.root.matrixWorld);
    const forward=new THREE.Vector3(0,0,1).transformDirection(desk.root.matrixWorld);
    const direction=normal.clone().multiplyScalar(.94).addScaledVector(forward,.342).normalize();
    const up=new THREE.Vector3(0,0,-1).transformDirection(desk.root.matrixWorld);
    camera.clearViewOffset();camera.fov=36;camera.aspect=width/virtualHeight;camera.updateProjectionMatrix();
    let distance=desk.root.scale.x*700,offsetX=0,offsetY=0;
    // Fit the actual four paper footprints, keeping clear of the toolbar.
    for(let iteration=0;iteration<120;iteration++){
      camera.position.copy(target).addScaledVector(direction,distance);camera.up.copy(up);camera.lookAt(target);
      camera.clearViewOffset();camera.updateMatrixWorld();
      const deskCorners=[[-1357,-1057],[1357,-1057],[1357,1057],[-1357,1057]].map(([x,z])=>desk.root.localToWorld(new THREE.Vector3(x,0,z)).project(camera));
      const xs=deskCorners.map(p=>(p.x+1)*width/2),ys=deskCorners.map(p=>(1-p.y)*height/2);
      offsetX=(Math.min(...xs)+Math.max(...xs)-width)/2;
      offsetY=(Math.min(...ys)+Math.max(...ys)-height)/2;
      camera.setViewOffset(width,height,offsetX,offsetY,width,height);camera.updateMatrixWorld();
      let fit=true;
      for(const [i,s] of surfaces.entries())for(const [x,z] of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){
        const p=s.group.localToWorld(new THREE.Vector3(x*s.face.scale.x/layouts[i].photoScale,0,z*s.face.scale.y/layouts[i].photoScale)).project(camera);
        const px=(p.x+1)*width/2,py=(1-p.y)*height/2;
        if(px<12||px>width-12||py<inset+8||py>virtualHeight-(mobile?140:90))fit=false;
      }
      if(fit)break;distance*=1.035;
    }
    const blend=THREE.MathUtils.clamp((pose.cameraBlend-.45)/.55,0,1);
    camera.position.lerpVectors(startPosition,camera.position.clone(),blend);
    camera.quaternion.slerpQuaternions(startRotation,camera.quaternion.clone(),blend);
    camera.fov=THREE.MathUtils.lerp(startFov,36,blend);
    camera.setViewOffset(width,THREE.MathUtils.lerp(height,virtualHeight,blend),offsetX*blend,offsetY*blend,width,height);camera.updateMatrixWorld();
    let lifted=null,reach=0;
    // Apply the desk-surface offsets after solving the original camera fit:
    // photographs, hands and framing therefore retain their exact positions.
    desk.placePortfolioProps(blend);
    const summaryShift=(mobile?25:110)*blend;
    layouts[0].z+=summaryShift;surfaces[0].group.position.z+=summaryShift;
    desk.root.updateMatrixWorld(true);
    if(pose.pickup){
      const i=pose.pickup.index+1,s=surfaces[i],r=layouts[i];
      const smooth=v=>{v=THREE.MathUtils.clamp(v,0,1);return v*v*(3-2*v);};
      reach=smooth(pose.pickup.progress/.3);
      const lift=smooth((pose.pickup.progress-.3)/.7);
      const worldPosition=s.group.getWorldPosition(new THREE.Vector3());
      const worldRotation=s.group.getWorldQuaternion(new THREE.Quaternion());
      const fraction=Math.min((mobile?.70:.52)*.85,height*.68/width*r.w/r.d);
      const distance=r.w*desk.root.scale.x/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect*fraction);
      const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,0),camera);
      const destination=ray.ray.at(distance,new THREE.Vector3());
      const facing=camera.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));
      worldPosition.lerp(destination,lift);worldRotation.slerp(facing,lift);
      s.group.position.copy(root.worldToLocal(worldPosition));
      s.group.quaternion.copy(root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldRotation));
      s.group.updateMatrixWorld(true);lifted={s,r,worldRotation};
    }
    viewport.set(width/2,0,0,width/2,0,-height/2,0,height/2,0,0,1,0,0,0,0,1);
    const corners=[];
    elements.forEach((el,i)=>{
      if(!el)return;const s=surfaces[i],r=layouts[i],w=el.offsetWidth,h=el.offsetHeight;
      // CSS (x,y) maps to the tabletop's (x,z); all four sheets are coplanar.
      map.set(r.w/w,0,0,-r.w/2,0,0,1,0,0,r.d/h,0,-r.d/2,0,0,0,1);
      projection.copy(viewport).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(s.group.matrixWorld).multiply(map);
      const values=projection.elements,denominator=values[15];
      el.style.transform=`matrix3d(${values.map(v=>v/denominator).join(',')})`;
      corners.push([[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>{
        const p=new THREE.Vector4(x,y,0,1).applyMatrix4(projection);return [p.x/p.w,p.y/p.w];
      }));
    });
    // Hands rest alongside the near table edge, away from all paper footprints.
    if(pose.pickup){
      const corner=corners[pose.pickup.index+1][1],close=document.querySelector('.photo-close');
      close.style.left=`${Math.max(8,Math.min(width-44,corner[0]-36))}px`;
      close.style.top=`${Math.max(8,corner[1]-44)}px`;
    }
    hands.forEach((hand,i)=>{
      const size=(mobile?350:1000)*config.hands.assemblyScale*desk.root.scale.x;
      hand.content.scale.setScalar(size);hand.content.position.copy(hand.anchor).multiplyScalar(-size);
      const rest=desk.root.localToWorld(new THREE.Vector3(mobile?hand.side*230:hand.side<0?-560:1000,65*config.hands.assemblyScale,mobile?980:600));
      if(mobile){
        const front=desk.root.localToWorld(new THREE.Vector3(0,0,1050)).project(camera);
        const screenY=Math.min(height-17,(1-front.y)*height/2-18);
        const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(hand.side*.76,1-2*screenY/height),camera);
        const planePoint=desk.root.localToWorld(new THREE.Vector3(0,65*config.hands.assemblyScale,0));
        ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal,planePoint),rest);
      }
      hand.pivot.position.copy(rest);
      hand.pivot.quaternion.copy(desk.root.quaternion);
      hand.pivot.rotateX(-Math.PI/2);hand.pivot.rotateZ(-hand.side*.16+pose.turn*.015);
    });
    if(lifted){
      const hand=hands[1],{s,r,worldRotation}=lifted;
      // Both paper and the fixed thumb-tip grip use this same rigid transform.
      const contact=s.group.localToWorld(new THREE.Vector3(r.w*.485,5,r.d*.18));
      const orientation=worldRotation.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-.35));
      hand.pivot.position.lerp(contact,reach);hand.pivot.quaternion.slerp(orientation,reach);
      hand.pose(0,1-reach,0,Math.sin(Math.PI*reach)*.8,.38);
    }
    diagnostics={corners,layouts,virtualHeight,tableNormal:normal.toArray(),paperNormals:surfaces.map(s=>new THREE.Vector3(0,1,0).transformDirection(s.group.matrixWorld).toArray())};
  }
  // A cached alpha mask exposes DOM controls through the single scene canvas.
  // Unlike rectangular clearing, glyph-shaped holes keep the selector transparent.
  const controlCanvas=document.createElement('canvas'),controlTexture=new THREE.CanvasTexture(controlCanvas);
  const maskScene=new THREE.Scene(),maskCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const maskMaterial=new THREE.MeshBasicMaterial({map:controlTexture,transparent:true,depthTest:false,depthWrite:false,blending:THREE.CustomBlending,blendSrc:THREE.ZeroFactor,blendDst:THREE.OneMinusSrcAlphaFactor});
  const mask=new THREE.Mesh(new THREE.PlaneGeometry(2,2),maskMaterial);maskScene.add(mask);let maskKey='';
  function revealToolbar(renderer,camera,pickup){
    if(!pickup)return;
    const controls=[...document.querySelectorAll('#back-profile,.portfolio-toolbar button,.portfolio-toolbar select')];
    const boxes=controls.map(el=>el.getBoundingClientRect());
    const key=JSON.stringify([innerWidth,innerHeight,controls.map((el,i)=>[el.value,boxes[i].x,boxes[i].y,boxes[i].width,boxes[i].height])]);
    if(key!==maskKey){
      maskKey=key;const ratio=Math.min(devicePixelRatio,2);controlCanvas.width=innerWidth*ratio;controlCanvas.height=innerHeight*ratio;
      const ctx=controlCanvas.getContext('2d');ctx.scale(ratio,ratio);ctx.fillStyle='white';
      controls.forEach((el,i)=>{const r=boxes[i],style=getComputedStyle(el);
        if(el.tagName==='SELECT'){
          ctx.font=style.font;ctx.textAlign='center';ctx.textBaseline='middle';
          const textX=r.x+(r.width+parseFloat(style.paddingLeft)-parseFloat(style.paddingRight))/2;
          ctx.fillText(el.selectedOptions[0].text,textX,r.y+r.height/2);ctx.strokeStyle='white';ctx.lineWidth=.8;ctx.strokeText(el.selectedOptions[0].text,textX,r.y+r.height/2);
          ctx.strokeStyle='white';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(r.right-17,r.y+r.height/2-3);ctx.lineTo(r.right-12,r.y+r.height/2+2);ctx.lineTo(r.right-7,r.y+r.height/2-3);ctx.stroke();
        }else{ctx.beginPath();ctx.roundRect(r.x,r.y,r.width,r.height,r.height/2);ctx.fill();}
      });controlTexture.needsUpdate=true;
    }
    const auto=renderer.autoClear;renderer.autoClear=false;renderer.render(maskScene,maskCamera);
    const foreground=new Set();hands[1].pivot.traverse(o=>foreground.add(o));surfaces[pickup.index+1].group.traverse(o=>foreground.add(o));
    const hidden=[];scene.traverse(o=>{if(o.isMesh&&o.visible&&!foreground.has(o)){hidden.push(o);o.visible=false;}});
    renderer.render(scene,camera);hidden.forEach(o=>o.visible=true);renderer.autoClear=auto;
  }
  return {draw,hide,revealToolbar,dispose(){controlTexture.dispose();maskMaterial.dispose();mask.geometry.dispose();},inspect:()=>diagnostics};
}


