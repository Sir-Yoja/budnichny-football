import { createClient } from 'npm:@supabase/supabase-js@2';

const ADMIN_ID='888c101b-d99b-4e8c-8c68-ff0a7e61badd';
const ADMIN_EMAIL='scribbl.40t@gmail.com';
const TTL=300;
const allowedOrigins=(Deno.env.get('APP_ORIGINS')??Deno.env.get('APP_ORIGIN')??'').split(',').map(x=>x.trim()).filter(Boolean);
const corsFor=(req:Request)=>({ 'Access-Control-Allow-Origin':allowedOrigins.includes(req.headers.get('Origin')??'')?(req.headers.get('Origin')??''):'null',
 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Vary':'Origin' });
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const hex=(b:Uint8Array)=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
async function digest(code:string,pepper:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(code))));
}
function newCode(){const b=new Uint32Array(1);crypto.getRandomValues(b);return String(b[0]%1000000).padStart(6,'0');}
function getSessionId(jwt:string){try{const part=jwt.split('.')[1];if(!part)return null;const encoded=part.replace(/-/g,'+').replace(/_/g,'/');const payload=JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,'=')));return typeof payload.session_id==='string'?payload.session_id:null;}catch{return null;}}

Deno.serve(async(req)=>{
 if(!allowedOrigins.length)return json(500,{error:'APP_ORIGIN or APP_ORIGINS must be configured.'});
 const origin=req.headers.get('Origin');
 if(origin&&!allowedOrigins.includes(origin))return json(403,{error:'Origin not allowed.'});
 const cors=corsFor(req);
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
  const code=newCode(),expires_at=new Date(Date.now()+TTL*1000).toISOString(),code_hash=await digest(code,pepper);
  const issued=await db.rpc('issue_admin_email_challenge',{p_user_id:ADMIN_ID,p_session_id:sessionId,p_code_hash:code_hash,p_expires_at:expires_at});
  if(issued.error)return json(500,{error:'Could not create challenge.'});
  if(issued.data?.status==='cooldown')return json(429,{error:'Подожди минуту перед повторным запросом.'});
  const challengeId=Number(issued.data?.challenge_id);if(!Number.isSafeInteger(challengeId)||challengeId<=0)return json(500,{error:'Invalid challenge response.'});
  const mail=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resend,'Content-Type':'application/json'},body:JSON.stringify({from:Deno.env.get('RESEND_FROM_EMAIL')??'Budnichny Football <onboarding@resend.dev>',to:[ADMIN_EMAIL],subject:'Код входа в админку — Будничный футбол',text:'Код: '+code+'. Действует 5 минут.'})});
  if(!mail.ok){await db.from('admin_email_challenges').delete().eq('id',challengeId).eq('user_id',ADMIN_ID).eq('session_id',sessionId);return json(502,{error:'Не удалось доставить письмо.'});}
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
