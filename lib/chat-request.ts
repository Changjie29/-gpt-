import type {Message} from './diagnosis';
import type {MachineInfo} from './knowledge';
export class ChatRequestError extends Error{constructor(public status:number,public code:string){super(code);}}
export function parseChatRequest(raw:string):{messages:Message[];info:MachineInfo}{
 if(raw.length>65000)throw new ChatRequestError(413,'too_large');
 let body:unknown;try{body=JSON.parse(raw);}catch{throw new ChatRequestError(400,'invalid_json');}
 if(!body||typeof body!=='object')throw new ChatRequestError(400,'invalid_messages');
 const b=body as Record<string,unknown>;
 if(!Array.isArray(b.messages)||!b.messages.length||b.messages.length>40||b.messages.some(m=>!m||typeof m!=='object'||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>12000)||b.messages.at(-1).role!=='user')throw new ChatRequestError(400,'invalid_messages');
 const field=(key:string)=>typeof b[key]==='string'?(b[key] as string).slice(0,80):'';
 return {messages:b.messages as Message[],info:{machineType:field('machineType'),brand:field('brand'),model:field('model'),language:b.language==='en'?'en':'zh-CN'}};
}
export function chatError(code:string,en=false){
 const errors:Record<string,[string,string]>={
  unsupported_origin:['请求来源不受支持。','This request origin is not supported.'],
  rate_limit:['提问太频繁，请稍后再试。','Too many questions. Please try again shortly.'],
  too_large:['对话内容过长，请开启新对话。','This conversation is too long. Please start a new session.'],
  invalid_json:['请求格式不正确。','Invalid request format.'],
  invalid_messages:['请填写有效的故障描述。','Please enter a valid symptom description.'],
  llm_unavailable:['智能诊断服务暂时无法连接，可先查阅知识库。','The diagnosis service is unavailable. You can still browse the knowledge library.']
 };
 return (errors[code]||errors.llm_unavailable)[en?1:0];
}
