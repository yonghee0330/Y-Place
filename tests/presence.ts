import assert from 'node:assert/strict';
import { LocalPresence } from '../src/net/localPresence';
import type {PlayerState} from '../src/net/presence';
Object.assign(globalThis,{window:globalThis,addEventListener:()=>{},removeEventListener:()=>{}});
const clients:LocalPresence[]=[];
function state(id:string):PlayerState{return {id,nickname:id,color:'#78806a',hair:'short',position:[0,0,0],rotationY:0,state:'stand',seatId:null,book:null,role:null,t:Date.now()};}
try {
 for(const [room,capacity] of [['shop',8],['circle',6]] as const){
  const active:LocalPresence[]=[];
  for(let i=0;i<capacity+1;i++){
   const c=new LocalPresence(capacity);clients.push(c);active.push(c);
   assert.equal(await c.connect('test-'+room,1,state(room+'-'+i)),i<capacity?'ok':'full');
  }
  active[0].disconnect();
  await new Promise(r=>setTimeout(r,50));
  const retry=new LocalPresence(capacity);clients.push(retry);
  assert.equal(await retry.connect('test-'+room,1,state(room+'-retry')),'ok');
  console.log(room,capacity,'명 입장·초과 거절·퇴장 후 재입장 통과');
 }
}finally{clients.forEach(c=>c.disconnect());}
