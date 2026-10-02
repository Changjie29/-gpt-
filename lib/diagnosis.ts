import {retrieve,topicTitle,type MachineInfo} from './knowledge';
import {makePrompt} from './prompt';
export {knowledgeStats} from './knowledge';
type Env=Record<string,string|undefined>;
export type Message={role:'user'|'assistant';content:string};
export function configured(env:Env) {return ['gemini','deepseek'].filter(p=>Boolean(env[p.toUpperCase()+'_API_KEY']));}
export async function diagnose(messages:Message[], info:MachineInfo,env:Env) {
 const last=messages.at(-1)!.content;
 const found=retrieve(last,6,info);
 const providers=configured(env);
 const sources=found.map(({id,source,heading})=>({id,source,heading}));
 if (!providers.length) {
  const english=info.language==='en';
  const content=english?(found.length?('**Found '+found.length+' relevant references**\n\nKnowledge retrieval mode; AI is not configured. These are references, not a confirmed diagnosis. Verify the model, market and configuration.\n\n'+found.slice(0,3).map(c=>'### '+topicTitle(c,true)+'\n\n'+c.scopeEn+'\n\nSource: '+c.sourceId+'\n\n[Read the curated source](/knowledge?topic='+encodeURIComponent(c.id)+')').join('\n\n')):'**Insufficient matching knowledge**\n\nPlease provide the exact brand, model, operating conditions and symptoms. Manuals for other models are not substituted.'):(found.length?('**已找到 '+found.length+' 条相关知识**\n\n当前为知识库检索模式，尚未连接智能模型。以下是资料原文，不代表确定诊断。请核对市场版本、序列号和配置。\n\n'+found.slice(0,3).map(c=>'### '+c.heading+'\n\n适用范围：'+c.scope+'\n\n'+c.text+'\n\n来源编号：'+c.sourceId+'；文件：'+c.source).join('\n\n---\n\n')):'**当前知识库资料不足**\n\n没有找到型号适配的相关资料。请补充准确品牌、型号、工况和故障现象；不会以其他型号手册替代。');
  return {choices:[{message:{role:'assistant',content}}],mode:'knowledge',provider:null,model:null,fellBack:false,sources,knowledgeChunks:found.length};
 }
 const ordered=env.LLM_PRIMARY==='deepseek'?[...providers].reverse():providers;
 for(let i=0;i<ordered.length;i++){
  const provider=ordered[i];
  const model=provider==='gemini'?(env.GEMINI_MODEL||'gemini-3.6-flash'):(env.DEEPSEEK_MODEL||'deepseek-v4-flash');
  const url=provider==='gemini'?'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions':'https://api.deepseek.com/v1/chat/completions';
  try {
   const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env[provider.toUpperCase()+'_API_KEY']}`},body:JSON.stringify({model,messages:[{role:'system',content:makePrompt(found,info)},...messages.slice(-20)],temperature:0.2,max_tokens:2500}),signal:AbortSignal.timeout(20000)});
   if(!res.ok)continue;
   const data=await res.json() as {choices?:{message?:{content?:string}}[]};
   const content=data.choices?.[0]?.message?.content;
   if(!content)continue;
   return {choices:[{message:{role:'assistant',content}}],mode:'ai',provider,model,fellBack:i>0,sources,knowledgeChunks:found.length};
  }catch { /* Provider errors never expose keys or upstream bodies. */ }
 }
 throw new Error('llm_unavailable');
}
