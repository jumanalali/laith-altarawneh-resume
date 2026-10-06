import * as THREE from './vendor/three.module.js';

// A fixed-length centerline changes bend independently of the hand's wrist.
// Rings follow its tangent, preserving cross-section rather than stretching skin.
export function makeSleeve(wrist, side, color) {
  const group = new THREE.Group(); group.scale.setScalar(.1); wrist.add(group);
  const sign = side === 'right' ? -1 : 1;
  const cloth = new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,side:THREE.DoubleSide});
  const cuffCloth = new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,side:THREE.DoubleSide});
  const segments=64, rows=55, length=10.376;
  function mesh(rings,material) {
    const positions=new Float32Array(rings*segments*3),indices=[];
    for(let row=0;row<rings-1;row++)for(let i=0;i<segments;i++) {
      const a=row*segments+i,b=a+segments,n=row*segments+(i+1)%segments;
      indices.push(a,b,n,b,n+segments,n);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
    const result=new THREE.Mesh(geometry,material);result.frustumCulled=false;group.add(result);return result;
  }
  cloth.name=side+'_sleeve';cuffCloth.name=side+'_cuff';
  const sleeve=mesh(rows+2,cloth), cuff=mesh(7,cuffCloth);
  const round=n=>Math.sign(n)*Math.pow(Math.abs(n),.85);
  const profile=[[-.17,.239,.181],[-.155,.248,.189],[.07,.248,.189],[.089,.24,.182],[.089,.226,.171],[.075,.219,.164],[.014,.219,.164]];
  const c=cuff.geometry.attributes.position;
  profile.forEach(([y,rx,rz],row)=>{for(let j=0;j<segments;j++){const a=j/segments*Math.PI*2;c.setXYZ(row*segments+j,rx*round(Math.cos(a)),y,rz*round(Math.sin(a))-.012);}});
  cuff.geometry.computeVertexNormals();
  let currentBend=NaN, centers=[];
  function update(bend) {
    bend=THREE.MathUtils.clamp(bend,.16,.62);
    if(Math.abs(bend-currentBend)<.0001)return;
    currentBend=bend;centers=[];
    let x=0,y=-.14;const p=sleeve.geometry.attributes.position;
    // Geometry rows run from closed remote end toward cuff for outward normals.
    for(let i=0;i<=rows;i++) {
      const t=i/rows,theta=sign*bend*t*t*(3-2*t);
      if(i){x+=Math.sin(theta)*length/rows;y-=Math.cos(theta)*length/rows;}
      centers.push([x,y,-.012]);
      // Widen the covered forearm around its unchanged centerline. Ease out
      // from the original cuff opening so neither wrist nor hand is scaled.
      const fullness=1+.18*THREE.MathUtils.smoothstep(t,0,.12);
      const radius=(.238+.13*Math.sin(t*Math.PI*.7))*fullness;
      const depth=(.18+.075*Math.sin(t*Math.PI*.7))*fullness;
      for(let j=0;j<segments;j++) {
        const a=j/segments*Math.PI*2;
        // Two restrained, asymmetric fabric compressions close to the cuff.
        const fold=.012*Math.sin(t*52+a*.45)*Math.exp(-Math.pow((t-.1)/.085,2));
        const across=(radius+fold)*round(Math.cos(a));
        p.setXYZ((rows-i+1)*segments+j,x+across*Math.cos(theta),y+across*Math.sin(theta),(depth+fold*.5)*round(Math.sin(a))-.012);
      }
    }
    for(let j=0;j<segments;j++)p.setXYZ(j,x,y,-.012);
    p.needsUpdate=true;sleeve.geometry.computeVertexNormals();
  }
  update(.38);
  return {group,sleeve,cuff,update,get bend(){return currentBend;},get centerline(){return centers;},length,segments};
}
