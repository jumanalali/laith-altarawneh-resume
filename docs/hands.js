import * as THREE from './vendor/three.module.js';
import {config} from './config.js';
import {makeSleeve} from './sleeve.js';
import {refineHandSurface} from './hand-detail.js';
// Imported Hold pose, independent skeletons, and original detailed normals stay intact.
// GLTFLoader sanitizes dots from the Blender joint names.
export function makeHand(model,side,poseData){
  const prefix=side<0?'left':'right',letter=side<0?'L':'R';
  const content=new THREE.Group(),normalized=new THREE.Group();normalized.scale.setScalar(.1);normalized.add(model);content.add(normalized);
  const pivot=new THREE.Group();pivot.add(content);pivot.updateMatrixWorld(true);
  const wristNode=model.getObjectByName(prefix+'_hand'+letter+'_'+(side<0?'031':'010'));
  const staticCloth=[];model.traverse(o=>{if(o.isMesh&&/sleeve|cuff/.test(o.material.name))staticCloth.push(o);});
  staticCloth.forEach(o=>{o.removeFromParent();o.geometry.dispose();o.material.dispose();});
  const sleeve=makeSleeve(wristNode,prefix,config.hands.sleeveColor);
  const meshes=[],weighted=new Set();
  model.traverse(o=>{
    if(!o.isMesh)return;meshes.push(o);o.frustumCulled=false;
    const source=o.material,cloth=/sleeve|cuff/.test(source.name);
    o.material=source.clone();o.material.color.setHex(cloth?config.hands.sleeveColor:config.hands.skinColor);
    o.material.roughness=cloth?.98:.72;o.material.metalness=0;
    if(!cloth)refineHandSurface(o);
    if(o.isSkinnedMesh){const indices=o.geometry.attributes.skinIndex,w=o.geometry.attributes.skinWeight;
      for(let i=0;i<w.count;i++)for(let k=0;k<4;k++)if(w.getComponent(i,k)>.0001)weighted.add(o.skeleton.bones[indices.getComponent(i,k)]);
    }
  });
  const wrist=[...weighted].find(b=>b.name===`${prefix}_hand${letter}_${side<0?'031':'010'}`);
  if(!wrist)throw new Error(`Missing weighted ${prefix} wrist`);
  const fingers=[...weighted].filter(b=>/_(f_(index|middle|ring|pinky)|thumb)0[123]/.test(b.name));
  const baseline=new Map([...weighted].map(b=>[b,b.quaternion.clone()]));
  const thumb=[...weighted].find(b=>b.name.startsWith(`${prefix}_thumb03${letter}_`));
  const thumbTip=thumb.children.find(b=>b.isBone)||thumb;
  const anchor=new THREE.Vector3(),q=new THREE.Quaternion(),axis=new THREE.Vector3(1,0,0),releaseDelta=new Map();
  const clean=name=>name.replaceAll('.','');
  for(const [bone] of baseline){
    let closed=new THREE.Quaternion(),open=new THREE.Quaternion();
    if(side>0){
      const original=Object.keys(poseData.poses.Hold.bones).find(n=>clean(n)===bone.name.slice(prefix.length+1));
      if(!original||!poseData.poses.Release.bones[original])throw Error('Missing starter pose: '+bone.name);
      closed.fromArray(poseData.poses.Hold.bones[original].quaternion);open.fromArray(poseData.poses.Release.bones[original].quaternion);
    }else{
      // Original renderer's measured left-hand curl/spread, relative to Hold.
      const make=isOpen=>{
        const result=new THREE.Quaternion(),turn=(a,degrees)=>result.multiply(new THREE.Quaternion().setFromAxisAngle(a,THREE.MathUtils.degToRad(degrees)));
        const finger=bone.name.match(/f_(index|middle|ring|pinky)0[123]L_/);
        if(finger)turn(axis,isOpen?0:{index:14,middle:15,ring:20,pinky:22}[finger[1]]);
        if(bone===wrist)turn(new THREE.Vector3(0,0,1),5);
        if(bone.name.includes('thumb01L_')){turn(axis,isOpen?0:20);turn(new THREE.Vector3(0,0,1),isOpen?35:10);turn(new THREE.Vector3(0,1,0),30);}
        if(bone.name.includes('thumb02L_'))turn(axis,isOpen?0:5);
        if(bone.name.includes('thumb03L_'))turn(axis,isOpen?0:45);
        return result;
      };closed=make(false);open=make(true);
    }
    releaseDelta.set(bone,closed.invert().multiply(open));
  }
  let opening=0;
  function pose(motion=0,relax=0,turn=0,release=0,bend=.38){
    opening=release;
    for(const [b,base] of baseline){
      const target=base.clone().multiply(releaseDelta.get(b));
      b.quaternion.slerpQuaternions(base,target,release);
    }
    wrist.quaternion.multiply(q.setFromAxisAngle(axis,motion*.009+turn*.006));
    for(const b of fingers){
      const index=/index/.test(b.name),thumbJoint=/thumb/.test(b.name);
      const amount=(motion*(thumbJoint?.002:index?.005:.012)+turn*.009-relax*(thumbJoint?.012:.045))*(side<0?1:.88)*(1-release);
      b.quaternion.multiply(q.setFromAxisAngle(axis,amount));
    }
    sleeve.update(bend);pivot.updateMatrixWorld(true);
  }
  pose();
  // A fixed Hold contact reference lets opening fingers actually leave the edge.
  anchor.copy(content.worldToLocal(thumbTip.getWorldPosition(new THREE.Vector3())));anchor.z-=.004;
  function inspect(){return {opening,sleeveBend:sleeve.bend,sleeveLength:sleeve.length,wrist:wrist.name,weighted:[...weighted].map(b=>b.name),materials:meshes.map(m=>({name:m.material.name,color:m.material.color.getHexString()})),anchor:anchor.toArray(),fingerOffsets:fingers.map(b=>({name:b.name,angle:b.quaternion.angleTo(baseline.get(b))})),meshes:meshes.length};}
  const vertex=new THREE.Vector3(),projected=new THREE.Vector3();
  function keepBelow(camera,viewportHeight,fraction=.45,constrain=true){
    pivot.updateWorldMatrix(true,true);
    const limit=1-2*fraction,tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    let correction=0,top=viewportHeight;
    for(const mesh of meshes){
      if(/sleeve|cuff/.test(mesh.material.name))continue;
      if(mesh.isSkinnedMesh)mesh.skeleton.update();
      const count=mesh.geometry.attributes.position.count;
      for(let i=0;i<count;i++){
        mesh.getVertexPosition(i,vertex);vertex.applyMatrix4(mesh.matrixWorld);
        projected.copy(vertex).project(camera);
        top=Math.min(top,(1-projected.y)*viewportHeight/2);
        correction=Math.max(correction,(projected.y-limit)*(camera.position.z-vertex.z)*tangent);
      }
    }
    if(constrain&&correction>0){pivot.position.y-=correction+.01;pivot.updateMatrixWorld(true);}
    return {correction,top};
  }
  function seatOnPlane(plane){
    pivot.updateMatrixWorld(true);let lowest=Infinity;
    for(const mesh of meshes){
      if(!mesh.isSkinnedMesh)continue;mesh.skeleton.update();
      for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,vertex);vertex.applyMatrix4(mesh.matrixWorld);lowest=Math.min(lowest,plane.distanceToPoint(vertex));}
    }
    const world=pivot.getWorldPosition(new THREE.Vector3()).addScaledVector(plane.normal,-lowest);
    pivot.position.copy(pivot.parent.worldToLocal(world));pivot.updateMatrixWorld(true);
    return lowest;
  }
  const contactSamples=new Map();
  for(const name of ['index','middle','ring','pinky']){
    const samples=[];
    for(const mesh of meshes){
      if(!mesh.isSkinnedMesh||/nail/i.test(mesh.material.name))continue;
      const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
      for(let i=0;i<weights.count;i++)for(let k=0;k<4;k++){
        if(weights.getComponent(i,k)>.5&&mesh.skeleton.bones[indices.getComponent(i,k)].name.includes(`f_${name}03`)){samples.push([mesh,i]);break;}
      }
    }
    contactSamples.set(name,samples);
  }
  const capturePose=()=>new Map([...baseline.keys()].map(b=>[b,b.quaternion.clone()]));
  function alignPalm(normal){
    pivot.updateMatrixWorld(true);
    const origin=wrist.getWorldPosition(new THREE.Vector3());
    const index=fingers.find(b=>b.name.includes('f_index01')).getWorldPosition(new THREE.Vector3()).sub(origin);
    const pinky=fingers.find(b=>b.name.includes('f_pinky01')).getWorldPosition(new THREE.Vector3()).sub(origin);
    const palm=index.cross(pinky).normalize();if(palm.dot(normal)<0)palm.negate();
    const world=pivot.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(palm,normal));
    pivot.quaternion.copy(pivot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));pivot.updateMatrixWorld(true);
  }
  function blendPose(saved,amount){for(const [bone,rotation] of saved)bone.quaternion.slerp(rotation,amount);pivot.updateMatrixWorld(true);}
  // A single relaxed pose, solved once per viewport. Keep the middle and distal
  // joints gently extended rather than folding all fingers underneath the palm.
  function restFingers(plane){
    const gaps={};
    for(const [name,samples] of contactSamples){
      for(const [joint,angle] of [['02',-.30],['03',-.20]]){
        const b=fingers.find(b=>b.name.includes(`f_${name}${joint}`));
        if(b)b.quaternion.multiply(q.setFromAxisAngle(axis,angle));
      }
      const bone=fingers.find(b=>b.name.includes(`f_${name}01`));if(!bone||!samples.length)continue;
      const base=bone.quaternion.clone();let angle=0;
      const gap=a=>{bone.quaternion.copy(base).multiply(q.setFromAxisAngle(axis,a));pivot.updateMatrixWorld(true);for(const m of meshes)if(m.isSkinnedMesh)m.skeleton.update();let d=Infinity;for(const [mesh,i] of samples){mesh.getVertexPosition(i,vertex);vertex.applyMatrix4(mesh.matrixWorld);d=Math.min(d,plane.distanceToPoint(vertex));}return d;};
      const target=.6;
      for(let i=0;i<5;i++){const d=gap(angle),slope=(gap(angle+.005)-d)/.005;if(Math.abs(slope)<.1)break;angle=THREE.MathUtils.clamp(angle+(target-d)/slope,-.65,1.15);}
      gaps[name]=gap(angle);
    }
    return gaps;
  }
  const surfaceSamples={palm:[],thumb:[],fingers:[]};
  for(const mesh of meshes){if(!mesh.isSkinnedMesh||/nail/.test(mesh.material.name))continue;
    const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
    for(let i=0;i<weights.count;i++){let k=0;for(let n=1;n<4;n++)if(weights.getComponent(i,n)>weights.getComponent(i,k))k=n;const b=mesh.skeleton.bones[indices.getComponent(i,k)],part=b===wrist?'palm':/thumb/.test(b.name)?'thumb':'fingers';surfaceSamples[part].push([mesh,i]);}
  }
  function deskContact(plane,only){
    pivot.updateMatrixWorld(true);const distances={palm:Infinity,thumb:Infinity,fingers:Infinity};
    for(const mesh of meshes)if(mesh.isSkinnedMesh)mesh.skeleton.update();
    for(const part of only?[only]:Object.keys(surfaceSamples))for(const [mesh,i] of surfaceSamples[part]){mesh.getVertexPosition(i,vertex);vertex.applyMatrix4(mesh.matrixWorld);distances[part]=Math.min(distances[part],plane.distanceToPoint(vertex));}
    return distances;
  }
  function seatPalm(plane){
    const distance=deskContact(plane,'palm').palm;
    const world=pivot.getWorldPosition(new THREE.Vector3()).addScaledVector(plane.normal,.6-distance);
    pivot.position.copy(pivot.parent.worldToLocal(world));pivot.updateMatrixWorld(true);
    const thumbBase=fingers.find(b=>b.name.includes('thumb01'));
    const axes=[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)];
    for(let i=0;i<16;i++){
      const gap=deskContact(plane,'thumb').thumb;if(gap>=.5)break;
      const base=thumbBase.quaternion.clone();let best=gap,bestPose=base;
      for(const a of axes)for(const sign of [-1,1]){
        thumbBase.quaternion.copy(base).multiply(q.setFromAxisAngle(a,.08*sign));
        const next=deskContact(plane,'thumb').thumb;if(next>best){best=next;bestPose=thumbBase.quaternion.clone();}
      }
      thumbBase.quaternion.copy(bestPose);if(best<=gap)break;
    }
    pivot.updateMatrixWorld(true);
  }
  return {side,pivot,content,anchor,pose,inspect,keepBelow,seatOnPlane,capturePose,blendPose,restFingers,alignPalm,deskContact,seatPalm};
}



