import {readFileSync as read,writeFileSync as write,readdirSync} from 'node:fs';
let s=read('dist/scene.js','utf8');
s=s.replace("import {makeHand} from './hands.js';","import {makeHand} from './hands.js';\nimport {createTabletop} from './tabletop.js';");
let a=s.indexOf('  const projectSurfaces='),b=s.indexOf('  const loader=',a);s=s.slice(0,a)+s.slice(b);
s=s.replace('  document.body.append(canvas);','  const tabletop=createTabletop(scene,desk,plane.material,edgeMaterial,hands);\n  document.body.append(canvas);');
s=s.replace('camera.position.set(0,blend*65,config.renderer.cameraDistance+blend*140);camera.updateMatrixWorld();','camera.clearViewOffset();camera.up.set(0,1,0);camera.quaternion.identity();camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(viewportHeight/(2*config.renderer.cameraDistance)));camera.aspect=viewportWidth/viewportHeight;camera.updateProjectionMatrix();\n    camera.position.set(0,blend*65,config.renderer.cameraDistance+blend*140);camera.updateMatrixWorld();');
s=s.replace('held.visible=!portfolio.active;projectSurfaces.forEach(s=>s.group.visible=portfolio.active);','held.visible=!portfolio.active;if(!portfolio.active)tabletop.hide();');
a=s.indexOf('    if(portfolio.active){');b=s.indexOf('    const shadowKey=',a);s=s.slice(0,a)+'    if(portfolio.active){grips.position.set(0,0,0);tabletop.draw(camera,viewportWidth,viewportHeight,portfolio);}\n'+s.slice(b);
a=s.indexOf('    const projectCorners=');b=s.indexOf('    return {projectCorners',a);s=s.slice(0,a)+'    const projectCorners=tabletop.inspect()?.corners||[];\n'+s.slice(b);
s=s.replace('return {projectCorners,cameraPosition','return {tabletop:tabletop.inspect(),projectCorners,cameraPosition');write('dist/scene.js',s);
s=read('dist/portfolio.js','utf8');a=s.indexOf('const box=');b=s.indexOf('function lock',a);s=s.slice(0,a)+'export function portfolioPose(){return {active,cameraBlend,turn};}\n'+s.slice(b);
s=s.replace('selected=0,imageIndex=0,','selected=0,');a=s.indexOf('function status(){');b=s.indexOf('function select(',a);s=s.slice(0,a)+"function status(){document.querySelector('#portfolio-status').textContent=`${choice.options[selected].text}, ${selected+1} of ${documents.length}`;}\n"+s.slice(b);s=s.replace('imageIndex=0;','');
s=s.replace('details.style.transform=`translateY(${(1-t)*innerHeight}px)`;gallery.style.transform=`translateY(${(1-t)*innerHeight*1.08}px)`;','');
s=s.replace('details.style.transform=`translateY(${t*innerHeight}px)`;gallery.style.transform=`translateY(${t*innerHeight*1.08}px)`;','');
a=s.indexOf('async function changeProject');b=s.indexOf('for(const button',a);s=s.slice(0,a)+`async function changeProject(index){
 if(busy||!active)return;lock(true);
 await animate(150,t=>{turn=t;});select(index);scrollTo({top:0,behavior:'instant'});
 await animate(200,t=>{turn=1-t;});turn=0;lock(false);redraw();
}
`+s.slice(b);
s=s.split('\n').filter(line=>!line.includes("querySelector('#previous-image')")&&!line.includes("querySelector('#next-image')")).join('\n');write('dist/portfolio.js',s);
s=read('build.mjs','utf8');a=s.indexOf('const gallery=');b=s.indexOf('const portfolio=',a);s=s.slice(0,a)+`const gallery=p=>Array.from({length:3},(_,i)=>{const img=p.images?.[i]||{src:'./assets/gallery/placeholder-overview.svg',alt:'Project screenshot placeholder'};return \`<figure class="gallery-print" data-photo="\${i}"><img src="\${esc(img.src)}" alt="\${esc(img.alt)}"></figure>\`;}).join('');
`+s.slice(b);
a=s.indexOf('<div class="gallery-controls">');b=s.indexOf('</aside>',a);s=s.slice(0,a)+'</div></div></aside>'+s.slice(b+8);write('build.mjs',s);
for(const name of readdirSync('dist/assets/gallery')){const p='dist/assets/gallery/'+name;write(p,read(p,'utf8').replace(/<text[\s\S]*?<\/text>/g,''));}
