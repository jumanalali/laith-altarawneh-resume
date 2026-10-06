const fs=require('fs');const p='dist/tabletop.js';let s=fs.readFileSync(p,'utf8');const start=s.indexOf('  function revealToolbar('),end=s.indexOf('  return {draw,hide,revealToolbar',start);s=s.slice(0,start)+`  // A cached alpha mask exposes DOM controls through the single scene canvas.
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
          ctx.font=style.font;ctx.textBaseline='middle';ctx.fillText(el.selectedOptions[0].text,r.x+parseFloat(style.paddingLeft),r.y+r.height/2);
          ctx.strokeStyle='white';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(r.right-17,r.y+r.height/2-3);ctx.lineTo(r.right-12,r.y+r.height/2+2);ctx.lineTo(r.right-7,r.y+r.height/2-3);ctx.stroke();
        }else{ctx.beginPath();ctx.roundRect(r.x,r.y,r.width,r.height,r.height/2);ctx.fill();}
      });controlTexture.needsUpdate=true;
    }
    const auto=renderer.autoClear;renderer.autoClear=false;renderer.render(maskScene,maskCamera);
    const foreground=new Set();hands[1].pivot.traverse(o=>foreground.add(o));surfaces[pickup.index+1].group.traverse(o=>foreground.add(o));
    const hidden=[];scene.traverse(o=>{if(o.isMesh&&o.visible&&!foreground.has(o)){hidden.push(o);o.visible=false;}});
    renderer.render(scene,camera);hidden.forEach(o=>o.visible=true);renderer.autoClear=auto;
  }
`+s.slice(end);s=s.replace('return {draw,hide,revealToolbar,inspect:()=>diagnostics};','return {draw,hide,revealToolbar,dispose(){controlTexture.dispose();maskMaterial.dispose();mask.geometry.dispose();},inspect:()=>diagnostics};');fs.writeFileSync(p,s);
