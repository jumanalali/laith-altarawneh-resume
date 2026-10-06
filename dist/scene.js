import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {config} from './config.js';
import {createDesk} from './desk.js';
import {makeHand} from './hands.js';
import {createHandMotion} from './hand-motion.js';
import {createReadingIdle} from './reading-idle.js';
import {createTabletop} from './tabletop.js';
let inspect=()=>null;
export function getSceneDiagnostics(){return inspect();}

// A single perspective camera and renderer light the solid desk, articulated
// hands and paper together. At paper Z=0, one world unit equals one CSS pixel.
export async function prepareScene(){
  const assembly=document.querySelector('.held-assembly'),paper=document.querySelector('.paper');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  const canvas=renderer.domElement;canvas.className='scene-3d';canvas.setAttribute('aria-hidden','true');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,25,6500);
  camera.position.z=config.renderer.cameraDistance;
  document.querySelector('#resume').style.perspective=`${config.renderer.cameraDistance}px`;
  scene.add(new THREE.HemisphereLight(0xfff5e9,0x5b5145,1.9));
  const key=new THREE.DirectionalLight(0xffefd9,2.2);key.position.set(-850,1400,1500);key.target.position.set(0,-150,-600);
  key.castShadow=true;key.shadow.camera.left=-2000;key.shadow.camera.right=2000;key.shadow.camera.top=2000;key.shadow.camera.bottom=-2000;key.shadow.camera.near=100;key.shadow.camera.far=6500;key.shadow.bias=-.00008;key.shadow.normalBias=.4;key.shadow.radius=5;key.shadow.blurSamples=8;
  key.shadow.intensity=.55;key.shadow.radius=9;
  scene.add(key,key.target);
  const fill=new THREE.DirectionalLight(0xc9d8e8,.65);fill.position.set(1000,200,800);scene.add(fill);
  const bounce=new THREE.DirectionalLight(0xd4bfa8,.55);bounce.position.set(0,-400,1400);scene.add(bounce);
  const desk=createDesk();scene.add(desk.root);
  const held=new THREE.Group();held.name='continuous-paper';scene.add(held);
  const grips=new THREE.Group();grips.name='stationary-paper-guides';scene.add(grips);
  // First fill only the depth buffer: the paper-shaped transparent opening
  // exposes the HTML underneath; it still occludes rear fingers and casts light.
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide}));
  plane.name='html-paper-depth-and-shadow';plane.renderOrder=-100;plane.castShadow=true;held.add(plane);
  const edgeMaterial=new THREE.MeshStandardMaterial({color:0xd5ccba,roughness:.95});
  const edges=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),[edgeMaterial,edgeMaterial,edgeMaterial,edgeMaterial,plane.material,edgeMaterial]);
  edges.name='paper-physical-thickness';edges.renderOrder=-99;held.add(edges);
  const loader=new GLTFLoader();let assets,poseData;
  try{const loaded=await Promise.all([loader.loadAsync(config.hands.model),fetch('./assets/models/starter-poses.json').then(r=>{if(!r.ok)throw Error('Missing starter-poses.json');return r.json();})]);assets=[loaded[0]];poseData=loaded[1];}catch(error){renderer.dispose();throw error;}
  const hands=[-1,1].map(side=>makeHand(assets[0].scene.getObjectByName(side<0?'left_hand_root':'right_hand_root'),side,poseData));
  hands.forEach(hand=>{hand.pivot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});grips.add(hand.pivot);});
  const handMotion=createHandMotion();
  const readingIdle=createReadingIdle();
  const tabletop=createTabletop(scene,desk,plane.material,edgeMaterial,hands);
  document.body.append(canvas);
  let width=0,height=0,lastPose=null,viewportWidth=0,viewportHeight=0,projectionScale=1,shadowPose='';
  function syncCanvasHost(portfolio){
    const host=portfolio.active?document.querySelector('#portfolio'):document.body;
    if(canvas.parentElement===host)return false;
    host.append(canvas);return true;
  }
  function resize(portfolio=lastPose?.portfolio||{active:false}){
    // ResizeObserver can run after a container is hidden but before the next
    // transition frame. Rehome the shared canvas before reading its dimensions.
    syncCanvasHost(portfolio);
    const rect=canvas.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return;
    renderer.shadowMap.needsUpdate=true;
    // innerWidth includes a classic scrollbar; the CSS canvas does not. Mixing
    // them compressed the depth mask and exposed a strip of desk on the right.
    viewportWidth=rect.width;viewportHeight=rect.height;
    renderer.setPixelRatio(Math.min(devicePixelRatio,viewportWidth<=700?config.renderer.mobilePixelRatio:config.renderer.maxPixelRatio));
    renderer.setSize(viewportWidth,viewportHeight,false);
    camera.aspect=viewportWidth/viewportHeight;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(viewportHeight/(2*config.renderer.cameraDistance)));camera.updateProjectionMatrix();
    const shadowSize=viewportWidth<=700?1024:2048;
    if(key.shadow.mapSize.x!==shadowSize){key.shadow.map?.dispose();key.shadow.map=null;key.shadow.mapSize.set(shadowSize,shadowSize);}
    desk.resize(viewportWidth,viewportHeight);
  }
  function draw(pose){
    lastPose=pose;
    const portfolio=pose.portfolio||{active:false,cameraBlend:0,turn:0},blend=portfolio.cameraBlend||0;
    // Keep the depth canvas and toolbar in the same stacking context when the
    // portfolio becomes a fixed viewport. The toolbar stays above the scene.
    if(syncCanvasHost(portfolio))resize(portfolio);
    // Dolly upward and back to frame two documents; screen-to-world projection
    // follows that same camera, keeping selectable HTML and depth geometry aligned.
    camera.clearViewOffset();camera.up.set(0,1,0);camera.quaternion.identity();camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(viewportHeight/(2*config.renderer.cameraDistance)));camera.aspect=viewportWidth/viewportHeight;camera.updateProjectionMatrix();
    camera.position.set(0,blend*65,config.renderer.cameraDistance+blend*140);camera.updateMatrixWorld();
    held.visible=!portfolio.active;if(!portfolio.active)tabletop.hide();
    width=pose.width;height=pose.height;
    const motion=pose.motion||0,elevation=config.paper.elevation+Math.abs(motion)*config.paper.scrollLift;
    projectionScale=(camera.position.z-elevation)/config.renderer.cameraDistance;
    plane.scale.set(width*projectionScale,height*projectionScale,1);
    edges.scale.set(width*projectionScale,height*projectionScale,config.paper.thickness);
    edges.position.z=-config.paper.thickness/2;
    const centerX=pose.left+width/2-viewportWidth/2;
    // Read the actual document position; never move content separately from its
    // surface. The entire full-height depth plane follows the same native scroll.
    held.position.set(centerX*projectionScale,camera.position.y+(viewportHeight/2-(pose.top+height/2))*projectionScale,elevation);
    const reading=!portfolio.active&&blend===0;
    const metric=Math.min(config.hands.scale,width*config.hands.mobileScaleRatio)*config.hands.assemblyScale*.1;
    const now=performance.now(),coordination=handMotion.inspect();
    const idleLeft=readingIdle.prepare(reading&&viewportWidth-width>180,!coordination.active&&!coordination.pending,now);
    const tracking=handMotion.update({...pose,right:pose.left+width,bottom:pose.top+height,idleLeft},metric,reading);
    grips.position.set(0,0,elevation);
    const wrist=motion*config.scroll.wrist;
    for(const [i,hand] of hands.entries()){
      const state=tracking?.hands[i],open=state?state.open*state.open*(3-2*state.open):0;
      const y=state?.y??viewportHeight*config.scroll.gripFraction;
      hand.pose(motion,portfolio.active?Math.max(0,(blend-.45)/.55):0,portfolio.turn||0,open,.38+(y/viewportHeight-.64)*.9+(state?.outward||0)*.2);
      const scale=Math.min(config.hands.scale,width*config.hands.mobileScaleRatio)*config.hands.assemblyScale*projectionScale;
      hand.content.scale.setScalar(scale);hand.content.position.copy(hand.anchor).multiplyScalar(-scale);
      const asymmetry=hand.side<0?1:.82;
      const edge=state?.x??(hand.side<0?pose.left:pose.left+width);
      const x=edge-hand.side*config.hands.edgeInset+hand.side*(state?.outward||0)*metric;
      hand.pivot.position.set((x-viewportWidth/2)*projectionScale,camera.position.y+(viewportHeight/2-y)*projectionScale,config.hands.contactDepth);
      hand.pivot.rotation.set(wrist*.28*asymmetry,-hand.side*.35+hand.side*wrist*asymmetry,-hand.side*wrist*.45*asymmetry+THREE.MathUtils.degToRad(hand.side*2*Math.sin(Math.PI*open)));
      if(reading){
        const safe=hand.keepBelow(camera,viewportHeight);
        state.fingertipTop=safe.top;
        if(safe.correction>0){state.y+=safe.correction/projectionScale;state.velocity=0;state.anchor=state.y-pose.top;state.slipped=true;}
      }
    }
    const idle=reading?readingIdle.apply(hands[0],desk,camera,pose,viewportWidth,viewportHeight,now):{active:false};
    if(idle.returned)handMotion.reanchor('left',tracking.hands[0].y);
    if(portfolio.active){grips.position.set(0,0,0);tabletop.draw(camera,viewportWidth,viewportHeight,portfolio);}
    const shadowKey=JSON.stringify([pose,tracking?.hands,idleLeft?hands[0].pivot.position.toArray():null,readingIdle.inspect().phase]);
    if(shadowKey!==shadowPose){renderer.shadowMap.needsUpdate=true;shadowPose=shadowKey;}
    const animateSteam=desk.updateSteam(performance.now()/1000,camera);
    renderer.render(scene,camera);
    tabletop.revealToolbar(renderer,camera,portfolio.pickup);
    return {steam:animateSteam,hands:!!tracking?.pending||idle.active,wake:idle.wake};
  }
  inspect=()=>{
    const handTops=hands.map(hand=>hand.keepBelow(camera,viewportHeight,.45,false).top);
    const bounds=desk.top.geometry.boundingBox.getSize(new THREE.Vector3());
    const corners=[[-width/2,height/2],[width/2,height/2],[width/2,-height/2],[-width/2,-height/2]].map(([x,y])=>{
      const p=held.localToWorld(new THREE.Vector3(x*projectionScale,y*projectionScale,0)).project(camera);return [(p.x+1)*viewportWidth/2,(1-p.y)*viewportHeight/2];
    });
    const projectCorners=tabletop.inspect()?.corners||[];
    const deskCorners=[[-1350,-1050],[1350,-1050],[1350,1050],[-1350,1050]].map(([x,z])=>{const p=desk.root.localToWorld(new THREE.Vector3(x,0,z)).project(camera);return [(p.x+1)*viewportWidth/2,(1-p.y)*viewportHeight/2];});
    return {idle:readingIdle.inspect(),handTops,coordination:handMotion.inspect(),deskCorners,hands:hands.map(h=>h.inspect()),tabletop:tabletop.inspect(),projectCorners,cameraPosition:camera.position.toArray(),viewport:[viewportWidth,viewportHeight],elevation:held.position.z,handRotations:hands.map(h=>h.pivot.rotation.toArray()),deskGeometry:desk.top.geometry.type,deskDimensions:bounds.toArray(),deskMatrix:desk.root.matrixWorld.toArray(),camera:camera.type,paperCorners:corners,gripPosition:grips.position.toArray(),handCount:hands.length,skinnedMeshes:hands.flatMap(a=>{let meshes=[];a.pivot.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o.name)});return meshes}),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textureCount:renderer.info.memory.textures,pose:lastPose};
  };
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();window.dispatchEvent(new Event('scene-failed'));});
  return {assembly,paper,resize,draw,resetIdle:readingIdle.reset,dispose(){
    tabletop.dispose();
    const geometry=new Set(),materials=new Set(),textures=new Set();
    scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value)}});
    geometry.forEach(o=>o.dispose());materials.forEach(o=>o.dispose());textures.forEach(o=>o.dispose());key.shadow.map?.dispose();renderer.dispose();canvas.remove();inspect=()=>null;
  }};
}



