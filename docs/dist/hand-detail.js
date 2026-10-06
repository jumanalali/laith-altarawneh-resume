import * as THREE from './vendor/three.module.js';

// Surface-only detail in bind coordinates: no displaced vertices or added
// geometry. The existing skinning carries the detail with each finger.
export function refineHandSurface(mesh){
 const material=mesh.material;
 if(/nails/.test(material.name)){
  material.color.setHex(0xcfa995);material.roughness=.43;material.metalness=0;
  // Normalize each nail's existing UV island independently. No duplicate shell
  // or displacement: outlines and cuticles stay on the original skinned mesh.
  const uv=mesh.geometry.attributes.uv,weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
  const groups=new Map(),ids=[];
  for(let i=0;i<uv.count;i++){
    let slot=0;for(let k=1;k<4;k++)if(weights.getComponent(i,k)>weights.getComponent(i,slot))slot=k;
    const id=indices.getComponent(i,slot);ids.push(id);
    if(!groups.has(id))groups.set(id,[Infinity,Infinity,-Infinity,-Infinity]);
    const b=groups.get(id);b[0]=Math.min(b[0],uv.getX(i));b[1]=Math.min(b[1],uv.getY(i));b[2]=Math.max(b[2],uv.getX(i));b[3]=Math.max(b[3],uv.getY(i));
  }
  // Orient cuticle-to-tip coordinates along each weighted distal phalanx,
  // rather than assuming all exported UV islands point in the same direction.
  const position=mesh.geometry.attributes.position,axes=new Map(),ranges=new Map(),v=new THREE.Vector3();
  const joint=i=>new THREE.Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[i].clone().invert()).applyMatrix4(mesh.bindMatrixInverse);
  for(const id of groups.keys()){
    const parent=mesh.skeleton.bones.indexOf(mesh.skeleton.bones[id].parent);
    axes.set(id,joint(id).sub(joint(parent)).normalize());ranges.set(id,[Infinity,-Infinity]);
  }
  for(let i=0;i<uv.count;i++){const y=v.fromBufferAttribute(position,i).dot(axes.get(ids[i])),b=ranges.get(ids[i]);b[0]=Math.min(b[0],y);b[1]=Math.max(b[1],y);}
  const coordinates=new Float32Array(uv.count*2);
  for(let i=0;i<uv.count;i++){const b=groups.get(ids[i]),range=ranges.get(ids[i]);coordinates[i*2]=(uv.getX(i)-b[0])/Math.max(.00001,b[2]-b[0]);coordinates[i*2+1]=(v.fromBufferAttribute(position,i).dot(axes.get(ids[i]))-range[0])/Math.max(.00001,range[1]-range[0]);}
  mesh.geometry.setAttribute('nailCoordinate',new THREE.BufferAttribute(coordinates,2));
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 nailCoordinate;varying vec2 nailUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nnailUV=nailCoordinate;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 nailUV;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      float edgeDistance=min(min(nailUV.x,1.0-nailUV.x),min(nailUV.y,1.0-nailUV.y));
      float softWidth=max(.045,length(fwidth(nailUV))*.75);
      float nailEdge=1.0-smoothstep(0.0,softWidth,edgeDistance);
      float cuticle=exp(-pow((nailUV.y-.09)/max(.025,softWidth*.6),2.0));
      float tip=smoothstep(.89-softWidth*.3,.96,nailUV.y);
      diffuseColor.rgb*=1.0-.055*nailEdge-.085*cuticle;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.807,.723,.624),tip*.72);
      roughnessFactor=clamp(.40+.12*nailEdge+.06*cuticle+.045*tip,.40,.59);
    `);
  };
  material.customProgramCacheKey=()=> 'natural-nail-v3';
  return;
 }
 if(!/skin/.test(material.name)||!mesh.isSkinnedMesh)return;
 mesh.geometry.computeBoundingBox();
 const span=mesh.geometry.boundingBox.getSize(new THREE.Vector3()).length();
 const bones=mesh.skeleton.bones;
 const weighted=new Set(),skinIndices=mesh.geometry.attributes.skinIndex,skinWeights=mesh.geometry.attributes.skinWeight;
 for(let i=0;i<skinWeights.count;i++)for(let k=0;k<4;k++)if(skinWeights.getComponent(i,k)>.0001)weighted.add(skinIndices.getComponent(i,k));
 const point=index=>new THREE.Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[index].clone().invert()).applyMatrix4(mesh.bindMatrixInverse);
 const find=pattern=>bones.findIndex((b,i)=>weighted.has(i)&&pattern.test(b.name));
 const wrist=find(/_hand[LR]_/),middle=find(/_f_middle01[LR]_/),index=find(/_f_index01[LR]_/),pinky=find(/_f_pinky01[LR]_/);
 if([wrist,middle,index,pinky].some(i=>i<0))return;
 const origin=point(wrist),along=point(middle).sub(origin),palmLength=along.length();along.normalize();
 const across=point(index).sub(point(pinky)).normalize(),palmNormal=new THREE.Vector3().crossVectors(across,along).normalize();
 const joints=[],axes=[];
 bones.forEach((bone,i)=>{
  if(!weighted.has(i))return;
  if(!/_(f_(index|middle|ring|pinky)|thumb)0[23][LR]_/.test(bone.name))return;
  const parent=bones.indexOf(bone.parent);if(parent<0)return;
  const position=point(i),axis=position.clone().sub(point(parent)).normalize();
  joints.push(new THREE.Vector4(position.x,position.y,position.z,span*.075));axes.push(axis);
 });
 if(!joints.length)return;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{detailJoints:{value:joints},detailAxes:{value:axes},detailSpan:{value:span},palmOrigin:{value:origin},palmAlong:{value:along},palmAcross:{value:across},palmNormal:{value:palmNormal},palmLength:{value:palmLength}});
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 detailPosition; varying vec3 detailNormal;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndetailPosition=position;detailNormal=normal;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
  varying vec3 detailPosition; varying vec3 detailNormal;
  uniform vec4 detailJoints[${joints.length}];uniform vec3 detailAxes[${joints.length}];uniform float detailSpan;
  uniform vec3 palmOrigin,palmAlong,palmAcross,palmNormal;uniform float palmLength;
  float surfaceDetail(){
   vec3 p=detailPosition/detailSpan;
   // Band-limit the fine grain at reading distance to avoid sparkling.
   float frequency=520.0;float footprint=length(fwidth(p))*frequency;
   float grain=sin(p.x*frequency)*sin(p.y*frequency*1.13)*sin(p.z*frequency*.91);
   float height=grain*.035*(1.0-smoothstep(.3,1.3,footprint));
   for(int i=0;i<${joints.length};i++){
    vec3 d=detailPosition-detailJoints[i].xyz;float axial=dot(d,detailAxes[i]);
    float radial=length(d-detailAxes[i]*axial)/detailJoints[i].w;
    float line=axial/max(detailSpan*.006,fwidth(axial)*.8);
    height-=.24*exp(-line*line)*exp(-pow(radial,4.0));
   }
   vec3 d=(detailPosition-palmOrigin)/palmLength;
   float x=dot(d,palmAcross),y=dot(d,palmAlong);
   float facing=smoothstep(.15,.65,dot(normalize(detailNormal),palmNormal));
   float area=exp(-pow(x/.48,6.0))*smoothstep(.12,.28,y)*(1.0-smoothstep(.78,.95,y));
   float fold1=(y-(.54+.20*x+.28*x*x))/.013;
   float fold2=(y-(.72-.12*x+.12*x*x))/.011;
   height-=.18*(exp(-fold1*fold1)+.7*exp(-fold2*fold2))*area*facing;
   return height;
  }`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat handDetail=surfaceDetail();roughnessFactor=clamp(roughnessFactor+handDetail*.12,.60,.82);diffuseColor.rgb*=1.0-clamp(-handDetail,0.0,.45)*.20;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
   vec3 rx=cross(sy,normal),ry=cross(normal,sx);float det=dot(sx,rx);
   vec3 gradient=sign(det)*(dFdx(handDetail)*rx+dFdy(handDetail)*ry);
   normal=normalize(abs(det)*normal-gradient*1.0);
  `);
 };
 material.customProgramCacheKey=()=>`hand-detail-v2-${joints.length}`;
}


