import {env} from 'cloudflare:workers';
import {diagnose} from '@/lib/diagnosis';
import {ChatRequestError,chatError,parseChatRequest} from '@/lib/chat-request';
const buckets=new Map<string,{n:number;end:number}>();
export async function POST(req:Request){
 let english=req.headers.get('accept-language')?.startsWith('en')||false;
 const error=(code:string,status:number)=>Response.json({error:chatError(code,english),code},{status,headers:{'Cache-Control':'no-store'}});
 const origin=req.headers.get('origin');const requestUrl=new URL(req.url);
 // Next may use localhost internally; the trusted proxy overwrites Host and X-Forwarded-Proto.
 const protocol=req.headers.get('x-forwarded-proto')?.split(',')[0].trim()||requestUrl.protocol.slice(0,-1);
 if(origin&&origin!==protocol+'://'+(req.headers.get('host')||requestUrl.host))return error('unsupported_origin',403);
 const ip=req.headers.get('cf-connecting-ip')||'local';const now=Date.now();
 for(const [key,value] of buckets)if(value.end<now)buckets.delete(key);
 const b=buckets.get(ip)||{n:0,end:now+60000};b.n++;buckets.set(ip,b);
 if(b.n>30)return error('rate_limit',429);
 try{
  const {messages,info}=parseChatRequest(await req.text());english=info.language==='en';
  return Response.json(await diagnose(messages,info,env as unknown as Record<string,string>),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return e instanceof ChatRequestError?error(e.code,e.status):error('llm_unavailable',502);}
}
