import { createClient } from 'npm:@supabase/supabase-js@2';

const ADMIN_ID='888c101b-d99b-4e8c-8c68-ff0a7e61badd';
const ADMIN_EMAIL='scribbl.40t@gmail.com';
const TTL=300, COOLDOWN=60, MAX_ATTEMPTS=5;
const cors={ 'Access-Control-Allow-Origin':Deno.env.get('APP_ORIGIN')??'null',
 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS' };
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const hex=(b:Uint8Array)=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
async function digest(code:string,pepper:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(code))));
}
function equal(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
function newCode(){const b=new Uint32Array(1);crypto.getRandomValues(b);return String(b[0]%1000000).padStart(6,'0');}
function getSessionId(jwt:string){try{const part=jwt.split('.')[1];if(!part)return null;const payload=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));return typeof payload.session_id==='string'?payload.session_id:null;}catch{return null;}}

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json(405,{error:'Method not allowed'});
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const resend=Deno.env.get('RESEND_API_KEY'),pepper=Deno.env.get('ADMIN_CODE_PEPPER');
 if(!url||!anon||!service||!resend||!pepper)return json(500,{error:'Server verification is not configured.'});
 const auth=req.headers.get('Authorization')??'';
 if(!auth.startsWith('Bearer '))return json(401,{error:'Authentication required.'});
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
 const {data,error}=await userClient.auth.getUser(),u=data?.user;
 if(error||!u||u.id!==ADMIN_ID||u.email?.toLowerCase()!==ADMIN_EMAIL)return json(403,{error:'Not authorized.'});
 const sessionId=getSessionId(auth.slice(7));if(!sessionId)return json(401,{error:'A valid authenticated session is required.'});
 let body:{action?:string;code?:string};try{body=await req.json();}catch{return json(400,{error:'Invalid JSON.'});}
 const db=createClient(url,service,{auth:{persistSession:false}});
 if(body.action==='send'){
  const {data:last,error:e}=await db.from('admin_email_challenges').select('created_at').eq('user_id',ADMIN_ID).eq('session_id',sessionId).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(e)return json(500,{error:'Rate limit check failed.'});
  if(last?.created_at&&(Date.now()-new Date(last.created_at).getTime())/1000<COOLDOWN)return json(429,{error:'Подожди минуту перед повторным запросом.'});
  const code=newCode(),expires_at=new Date(Date.now()+TTL*1000).toISOString(),code_hash=await digest(code,pepper);
  const cleared=await db.from('admin_email_challenges').delete().eq('user_id',ADMIN_ID);if(cleared.error)return json(500,{error:'Could not reset challenge.'});
  const inserted=await db.from('admin_email_challenges').insert({user_id:ADMIN_ID,session_id:sessionId,code_hash,expires_at,attempts:0});if(inserted.error)return json(500,{error:'Could not create challenge.'});
  const mail=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resend,'Content-Type':'application/json'},body:JSON.stringify({from:Deno.env.get('RESEND_FROM_EMAIL')??'Budnichny Football <onboarding@resend.dev>',to:[ADMIN_EMAIL],subject:'Код входа в админку — Будничный футбол',text:'Код: '+code+'. Действует 5 минут.'})});
  if(!mail.ok){await db.from('admin_email_challenges').delete().eq('user_id',ADMIN_ID);return json(502,{error:'Не удалось доставить письмо.'});}
  return json(200,{ok:true,expires_in:TTL});
 }
 if(body.action==='verify'){
  const code=String(body.code??'').trim();if(!/^\d{6}$/.test(code))return json(400,{error:'Введите шестизначный код.'});
  const codeHash=await digest(code,pepper);
  const consumed=await db.rpc('consume_admin_email_challenge',{p_user_id:ADMIN_ID,p_code_hash:codeHash,p_session_id:sessionId});
  if(consumed.error)return json(500,{error:'Challenge verification failed.'});
  if(consumed.data==='invalid')return json(400,{error:'Неверный код.'});
  if(consumed.data==='locked')return json(429,{error:'Слишком много попыток. Запроси новый код.'});
  if(consumed.data!=='verified')return json(400,{error:'Код недействителен или истёк.'});
  return json(200,{ok:true,admin_session_seconds:900});
 }
 return json(400,{error:'Unknown action.'});
});
