import * as THREE from './vendor/three.module.js';

// Three soft ribbons in one draw call. The cup owns their transform, so the
// coffee surface, desk tilt, camera dolly and ordinary depth test stay coherent.
export function createSteam(){
  const positions=[],uvs=[],phases=[],indices=[];
  const segments=32;
  for(let wisp=0;wisp<3;wisp++){
    const base=positions.length/3;
    for(let j=0;j<=segments;j++)for(const side of [-1,1]){
      positions.push((wisp-1)*19,0,(wisp%2?1:-1)*9);
      uvs.push(side,j/segments);phases.push(wisp*.3333);
    }
    for(let j=0;j<segments;j++){const a=base+j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({
    transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
    uniforms:{time:{value:0},right:{value:new THREE.Vector3(1,0,0)}},
    vertexShader:`
      uniform float time; uniform vec3 right; attribute float phase;
      varying vec2 ribbon; varying float age;
      void main(){
        ribbon=uv; age=fract(time/8.5+phase);
        float h=uv.y;
        vec3 p=position;
        p.y+=h*(180.0+phase*45.0);
        p.x+=h*(sin(h*7.0-time*.42+phase*9.0)*12.0+sin(time*.21+phase*8.0)*8.0);
        p.z+=h*sin(h*5.0-time*.3+phase*6.0)*8.0;
        p+=right*uv.x*(3.5+h*3.0);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader:`
      varying vec2 ribbon; varying float age;
      void main(){
        float edge=exp(-ribbon.x*ribbon.x*3.5)*(1.0-smoothstep(.65,1.0,abs(ribbon.x)));
        float height=smoothstep(0.0,.09,ribbon.y)*(1.0-smoothstep(.65,1.0,ribbon.y));
        float plume=exp(-pow((ribbon.y-age)*3.3,2.0))*sin(age*3.14159265);
        gl_FragColor=vec4(.91,.89,.84,edge*height*plume*.16);
      }`
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.name='coffee-steam';mesh.position.y=103;mesh.frustumCulled=false;
  const rotation=new THREE.Quaternion(),cameraRight=new THREE.Vector3();
  return {mesh,update(time,camera){
    material.uniforms.time.value=time;
    mesh.getWorldQuaternion(rotation).invert();cameraRight.setFromMatrixColumn(camera.matrixWorld,0).applyQuaternion(rotation);
    material.uniforms.right.value.copy(cameraRight);
  }};
}
