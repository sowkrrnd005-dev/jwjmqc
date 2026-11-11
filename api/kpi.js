import {db,role,error} from './_common.js';
const KEYS=['manufacturing_kpi_customer_defects_v1','jwjmqc_shipments_v1','jwjmqc_process_prices_v1','jwjmqc_process_mes_v1','jwjmqc_vendor_summary_v1'];
// UTF-8 chunk boundaries: base64 encoding prevents invalid Unicode splits.
const CHUNK=450000;
export default async function handler(req,res){
 const r=role(req);if(!r)return error(res,401,'로그인이 필요합니다.');
 try{
  const collection=db().collection('kpi');
  if(req.method==='GET'){
   const meta=await collection.doc('shared_index').get();
   if(!meta.exists){return res.json({role:r,data:{}})}
   const data={};
   for(const [key,count] of Object.entries(meta.data().counts||{})){
    if(!KEYS.includes(key)||!Number.isSafeInteger(count)||count<1||count>100)return error(res,500,'저장된 자료 정보가 올바르지 않습니다.');
    const refs=Array.from({length:count},(_,i)=>collection.doc('part_'+KEYS.indexOf(key)+'_'+i));
    const snaps=await db().getAll(...refs);
    if(snaps.some(s=>!s.exists))return error(res,500,'저장된 데이터 일부가 없습니다.');
    data[key]=JSON.parse(Buffer.from(snaps.map(s=>s.data().value).join(''),'base64').toString('utf8'));
   }
   return res.json({role:r,data});
  }
  if(req.method==='PUT'){
   if(r!=='admin')return error(res,403,'관리자만 수정할 수 있습니다.');
   const data=req.body?.data;
   if(!data||typeof data!=='object'||Array.isArray(data))return error(res,400,'잘못된 데이터');
   const counts={};const batch=db().batch();
   for(const [key,val] of Object.entries(data)){
    if(!KEYS.includes(key))return error(res,400,'허용되지 않은 데이터');
    const encoded=Buffer.from(JSON.stringify(val),'utf8').toString('base64');
    const parts=encoded.match(new RegExp('.{1,'+CHUNK+'}','g'))||[''];
    if(parts.length>100)return error(res,413,'데이터가 너무 큽니다.');
    counts[key]=parts.length;
    parts.forEach((part,i)=>batch.set(collection.doc('part_'+KEYS.indexOf(key)+'_'+i),{value:part}));
   }
   batch.set(collection.doc('shared_index'),{counts,updatedAt:new Date().toISOString()});
   await batch.commit();
   return res.json({ok:true});
  }
  return error(res,405,'허용되지 않는 요청');
 }catch(e){return error(res,500,e.message)}
}
