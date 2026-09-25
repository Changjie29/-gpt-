import { env } from 'cloudflare:workers';
import { diagnose, type Message } from '@/lib/diagnosis';
const buckets=new Map<string,{n:number;end:number}>();
export async function POST(req:Request){
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'请求来源不受支持。'},{status:403});
 const ip=req.headers.get('cf-connecting-ip')||'local';const now=Date.now();
 for(const [key,value] of buckets)if(value.end<now)buckets.delete(key);
 const b=buckets.get(ip)||{n:0,end:now+60000};b.n++;buckets.set(ip,b);
 if(b.n>30)return Response.json({error:'提问太频繁，请稍后再试。'},{status:429});
 let body:any;
 try{const raw=await req.text();if(raw.length>65000)return Response.json({error:'对话内容过长，请开启新对话。'},{status:413});body=JSON.parse(raw);}catch{return Response.json({error:'请求格式不正确。'},{status:400});}
 if(!body||!Array.isArray(body.messages)||!body.messages.length||body.messages.length>40||body.messages.some((m:any)=>!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>12000)||body.messages.at(-1).role!=='user')return Response.json({error:'请填写有效的故障描述。'},{status:400});
 const info={machineType:typeof body.machineType==='string'?body.machineType.slice(0,80):'',brand:typeof body.brand==='string'?body.brand.slice(0,80):'',model:typeof body.model==='string'?body.model.slice(0,80):''};
 try{return Response.json(await diagnose(body.messages as Message[],info,env as unknown as Record<string,string>),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'智能诊断服务暂时无法连接，请稍后重试。你仍可在知识库中查阅相关资料。',code:'llm_unavailable'},{status:502});}
}
