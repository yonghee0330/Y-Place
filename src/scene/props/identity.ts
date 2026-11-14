// 운영자 사진의 합판 간판·동심원 패브릭을 절차적으로 재해석한다.
import * as THREE from 'three';
import { bevelBox } from '../geom';
import { ROOM, currentSpaceId, isWorkSpace, spaceLabel } from '../layout';

function texture(paint: (c:CanvasRenderingContext2D)=>void): THREE.CanvasTexture {
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=768;
  const c=canvas.getContext('2d')!;paint(c);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
  void document.fonts.ready.then(()=>{paint(c);t.needsUpdate=true;});
  return t;
}
export function buildIdentity(): THREE.Group {
  const group=new THREE.Group();
  const shop=currentSpaceId()==='shop';
  const work=isWorkSpace(currentSpaceId());
  const sign=texture(c=>{
    c.fillStyle=shop?'#c6a170':'#e2d7c3';c.fillRect(0,0,768,768);
    c.strokeStyle='rgba(80,56,30,.09)';c.lineWidth=1;
    for(let i=0;i<120;i++){c.beginPath();c.moveTo(0,i*7);c.bezierCurveTo(200,i*7+5,500,i*7-3,768,i*7+3);c.stroke();}
    c.fillStyle='#382e24';c.font='500 66px "Noto Serif KR",serif';
    c.fillText(shop?'Y-Place':work?spaceLabel():'작은',58,128);if(!shop&&!work)c.fillText('모임방',58,225);
    c.strokeStyle='#544436';c.lineWidth=2;c.beginPath();c.moveTo(58,570);c.lineTo(710,275);c.stroke();
    c.font='500 35px "Noto Serif KR",serif';
    c.fillText(shop?'쉬어 가는 라운지':work?'혼자 집중하는':'다섯 자리,',shop?360:430,615);c.fillText(shop?'천천히 머무는 곳':work?'나만의 자리':'함께 읽는 시간',shop?360:work?430:360,672);
    c.font='20px serif';c.fillText('Y-PLACE',58,720);
  });
  const w=shop?.7:.7,h=shop?.82:.78;
  const board=new THREE.Mesh(bevelBox(w+.025,h+.025,.03,.006),new THREE.MeshStandardMaterial({color:0xb08c60,roughness:.9}));
  const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:sign,roughness:.95}));
  face.position.z=.018;board.add(face);board.position.set(shop?1.58:.65,1.8,shop?ROOM.z1-.045:ROOM.z0+.045);board.rotation.y=shop?Math.PI:0;
  // 작업실은 뒷벽에 책상·메모판이 있어 왼쪽 벽에 작게 건다
  if(work){board.scale.setScalar(.62);board.position.set(ROOM.x0+.03,1.72,.35);board.rotation.y=Math.PI/2;}
  group.add(board);
  if(shop){
    const fabric=texture(c=>{
      const colors=['#b88061','#d4ad7e','#e6cfaa','#365d5a','#a45148','#dfc39d'];
      c.fillStyle='#dfc39d';c.fillRect(0,0,768,768);
      for(let j=0;j<12;j++){
        const r=350-j*26;c.strokeStyle=colors[j%colors.length];c.lineWidth=18;c.beginPath();c.arc(384,384,r,0,Math.PI*2);c.stroke();
        for(let k=0;k<64;k++){
          const a=k*Math.PI/32;c.save();c.translate(384+Math.sin(a)*r,384+Math.cos(a)*r);c.rotate(-a);c.fillStyle=colors[(j+3)%colors.length];
          c.beginPath();c.moveTo(-7,-8);c.lineTo(7,-8);c.lineTo(0,8);c.fill();c.restore();
        }
      }
      c.fillStyle='rgba(255,250,230,.16)';for(let i=0;i<768;i+=3)c.fillRect(i,0,1,768);
    });
    const g=new THREE.PlaneGeometry(1.12,1.3,30,30);const p=g.getAttribute('position');
    for(let i=0;i<p.count;i++)p.setZ(i,.014*Math.sin(p.getX(i)*42)+.01*Math.cos(p.getY(i)*11));g.computeVertexNormals();
    const cloth=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:fabric,roughness:1,side:THREE.DoubleSide}));
    cloth.position.set(-1.28,1.8,ROOM.z1-.055);cloth.rotation.y=Math.PI;group.add(cloth);
  }
  return group;
}
