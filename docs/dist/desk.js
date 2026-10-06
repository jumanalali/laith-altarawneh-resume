import * as THREE from './vendor/three.module.js';
import {config} from './config.js';
import {createSteam} from './steam.js';

// Original solid geometry, built in desk-local coordinates: X across the grain,
// Y up, Z toward the seated visitor. Nothing here is a billboard or photograph.
export function createDesk(){
  const root=new THREE.Group();root.name='walnut-desk';
  const {width,depth,thickness,bevel}=config.desk;
  const grain=woodTexture();
  const wood=new THREE.MeshPhysicalMaterial({map:grain,color:0xbcb4a9,roughness:.56,metalness:0,bumpMap:grain,bumpScale:.2,clearcoat:.08,clearcoatRoughness:.7});
  const edgeWood=new THREE.MeshStandardMaterial({map:grain,color:0x9c8976,roughness:.67,metalness:0});
  const top=slab(width,depth,thickness,bevel,[wood,edgeWood]);
  top.name='solid-beveled-walnut-tabletop';top.castShadow=true;top.receiveShadow=true;root.add(top);
  const frame=new THREE.MeshStandardMaterial({color:0x33241c,roughness:.72});
  // Solid apron and four tapered supports are visible below the front edge.
  for(const side of [-1,1]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(42,105,depth-110),frame);
    rail.position.set(side*(width/2-90),-thickness-48,0);rail.castShadow=true;rail.receiveShadow=true;root.add(rail);
    for(const end of [-1,1]){
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(35,24,690,4),frame);
      leg.rotation.y=Math.PI/4;leg.position.set(side*(width*.36),-thickness-335,end*(depth/2-110));leg.castShadow=true;leg.receiveShadow=true;root.add(leg);
    }
  }
  const apron=new THREE.Mesh(new THREE.BoxGeometry(width-170,95,35),frame);
  apron.position.set(0,-thickness-42,depth/2-75);apron.castShadow=true;root.add(apron);

  const props=new THREE.Group();props.name='mesh-desk-objects';root.add(props);
  const notebook=new THREE.Group();notebook.name='notebook';
  const leather=new THREE.MeshStandardMaterial({color:0x232825,roughness:.93});
  const pages=new THREE.MeshStandardMaterial({color:0xc8bca2,roughness:.98});
  for(const [w,d,t,y,material] of [[330,430,5,10,leather],[318,414,21,32,pages],[330,430,5,38,leather]]){
    const part=slab(w,d,t,2,material);part.position.y=y;part.castShadow=true;part.receiveShadow=true;notebook.add(part);
  }
  // Actual edge grooves in the exposed page block, not painted-on fake depth.
  for(let i=0;i<5;i++){
    const line=new THREE.Mesh(new THREE.BoxGeometry(317,1,1),new THREE.MeshStandardMaterial({color:0x9b8e73,roughness:1}));
    line.position.set(0,13+i*3.7,207);notebook.add(line);
  }
  notebook.position.set(-width*.34,0,-depth*.17);notebook.rotation.y=-.18;props.add(notebook);
  const pen=new THREE.Group();pen.name='pen';
  const bronze=new THREE.MeshStandardMaterial({color:0x8c7048,metalness:.74,roughness:.33});
  const black=new THREE.MeshStandardMaterial({color:0x22231f,roughness:.38,metalness:.2});
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(7,7,260,16),black);barrel.castShadow=true;pen.add(barrel);
  for(const y of [-113,100]){const band=new THREE.Mesh(new THREE.CylinderGeometry(7.5,7.5,9,16),bronze);band.position.y=y;pen.add(band);}
  const nib=new THREE.Mesh(new THREE.ConeGeometry(7,28,16),bronze);nib.rotation.z=Math.PI;nib.position.y=-143;pen.add(nib);
  pen.rotation.set(Math.PI/2,0,-.2);pen.position.set(-width*.28,15,depth*.12);props.add(pen);

  const cup=new THREE.Group();cup.name='ceramic-coffee-cup';
  const ceramic=new THREE.MeshStandardMaterial({color:0xbcb09a,roughness:.3,metalness:0});
  const profile=[[0,0],[57,0],[65,7],[75,108],[73,117],[67,118],[63,109],[54,14],[0,14]].map(p=>new THREE.Vector2(...p));
  const vessel=new THREE.Mesh(new THREE.LatheGeometry(profile,40),ceramic);vessel.castShadow=true;vessel.receiveShadow=true;cup.add(vessel);
  // Both ends enter the outer wall below the lip. The old rotated torus put
  // its top end through the rim; liquid also exceeded the inner wall radius.
  const handlePath=new THREE.CubicBezierCurve3(new THREE.Vector3(69,91,0),new THREE.Vector3(127,104,0),new THREE.Vector3(126,22,0),new THREE.Vector3(62,29,0));
  const handle=new THREE.Mesh(new THREE.TubeGeometry(handlePath,48,7,16,false),ceramic);handle.name='cup-handle';handle.castShadow=true;handle.receiveShadow=true;cup.add(handle);
  const coffee=new THREE.Mesh(new THREE.CircleGeometry(61.5,64),new THREE.MeshStandardMaterial({color:0x24130b,roughness:.22}));coffee.rotation.x=-Math.PI/2;coffee.position.y=102;cup.add(coffee);
  const steam=createSteam();cup.add(steam.mesh);
  const coaster=new THREE.Mesh(new THREE.CylinderGeometry(95,95,8,40),new THREE.MeshStandardMaterial({color:0x66513b,roughness:.98}));coaster.position.y=0;coaster.receiveShadow=true;cup.add(coaster);
  cup.position.set(width*.36,8,-depth*.23);props.add(cup);
  root.rotation.x=config.desk.angle;
  function resize(viewWidth,viewHeight){
    const scale=viewHeight/1000;
    root.scale.setScalar(scale);
    // Balance the projected front and back tabletop edges about viewport center.
    const halfDepth=depth/2*scale;
    const rise=Math.sin(config.desk.angle)*halfDepth,reach=Math.cos(config.desk.angle)*halfDepth;
    root.position.set(0,rise*reach/(config.renderer.cameraDistance-config.desk.distance),config.desk.distance);
    props.visible=viewWidth>700;
  }
  const steamPoint=new THREE.Vector3();
  return {root,top,resize,placePortfolioProps(amount=0){
    notebook.position.z=-depth*.17+160*amount;
    cup.position.z=-depth*.23+220*amount;
  },updateSteam(time,camera){
    const enabled=props.visible&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
    steam.mesh.visible=enabled;if(!enabled)return false;
    steam.update(time,camera);steam.mesh.getWorldPosition(steamPoint).project(camera);
    return Math.abs(steamPoint.x)<1.15&&steamPoint.y> -1.2&&steamPoint.y<1.4;
  }};
}

function slab(width,depth,thickness,bevel,material){
  const r=Math.max(bevel*2,6),x=-width/2,y=-depth/2;
  const shape=new THREE.Shape();shape.moveTo(x+r,y);shape.lineTo(x+width-r,y);shape.quadraticCurveTo(x+width,y,x+width,y+r);shape.lineTo(x+width,y+depth-r);shape.quadraticCurveTo(x+width,y+depth,x+width-r,y+depth);shape.lineTo(x+r,y+depth);shape.quadraticCurveTo(x,y+depth,x,y+depth-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness-2*bevel,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:6});
  geometry.rotateX(-Math.PI/2);geometry.translate(0,-thickness+bevel,0);
  const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
  for(let i=0;i<p.count;i++){
    if(Math.abs(n.getY(i))>.5)uv.setXY(i,p.getX(i)/width+.5,p.getZ(i)/depth+.5);
    else uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i)/depth:p.getX(i)/width)+.5,p.getY(i)/thickness*.13+.5);
  }
  uv.needsUpdate=true;geometry.computeBoundingBox();return new THREE.Mesh(geometry,material);
}

function woodTexture(){
  // Seeded procedural walnut grain supplies surface detail only. The solid
  // extrusion above supplies all silhouette, thickness, bevels and perspective.
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d'),data=ctx.createImageData(canvas.width,canvas.height);
  let seed=90210;
  for(let y=0;y<512;y++)for(let x=0;x<1024;x++){
    seed=(seed*1664525+1013904223)>>>0;
    const drift=5*Math.sin(x*.004+y*.012)+1.5*Math.sin(x*.017+y*.018);
    const knot=Math.exp(-((x-720)**2/50000+(y-300)**2/6000));
    const ring=y+drift+12*knot*Math.sin(x*.008)+4*Math.sin(x*.0016+y*.011);
    const growth=Math.pow(.5+.5*Math.sin(ring*.29),12);
    const grain=-growth*10+Math.sin(ring*1.3)*1.8+Math.sin(ring*.039)*2.5;
    const pores=(seed>>>26)/63*3;
    const v=grain+pores,index=(y*1024+x)*4;
    data.data[index]=91+v;data.data[index+1]=63+v*.7;data.data[index+2]=43+v*.5;data.data[index+3]=255;
  }
  ctx.putImageData(data,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
