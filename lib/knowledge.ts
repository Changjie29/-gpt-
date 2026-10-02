import source from './knowledge.json';
export type Chunk={id:string;source:string;heading:string;text:string;kind:string;brand:string;brandEn:string;aliases:string[];models:string[];titleEn:string;category:string;visible:boolean;language:string;sourceId:string;scope:string;scopeEn:string;context:string};
export type MachineInfo={machineType?:string;brand?:string;model?:string;language?:string};
export const chunks:Chunk[]=source;
export const topics=chunks.filter(c=>c.visible);
export const knowledgeStats={files:new Set(chunks.map(c=>c.source)).size,chunks:chunks.length,topics:topics.length,manuals:new Set(chunks.filter(c=>c.kind==='manual').map(c=>c.source)).size};
export const shortTitle=(heading:string)=>heading.replace(/^[一二三四五六七八九十]+、/,'').replace(/^[A-Z0-9-]+｜/,'').replace(/（.*?）/g,'');
export const topicTitle=(c:Chunk,en=false)=>en?c.titleEn:shortTitle(c.heading);
const normalize=(value:string)=>value.toLowerCase().replace(/[\s_-]/g,'');
function applicable(c:Chunk,query:string,info:MachineInfo){
 if(info.machineType&&!['拖拉机','Tractor'].includes(info.machineType))return c.kind==='general';
 const inferred=query.match(/workmaster\s*(?:25s|25|35|40)\b|lx\d+(?:su)?\b|pl\d+(?:\([^)]*\))?|pl\s*(?:系列|series)/i)?.[0];
 const model=normalize(info.model?.trim()||inferred||'');
 if(info.model?.trim()&&inferred&&normalize(inferred)!==model)return false;
 if(c.kind==='general')return !model;
 if(!model||!c.models.some(m=>normalize(m)===model))return false;
 const brand=normalize(info.brand||'');
 return !brand||c.aliases.some(a=>normalize(a)===brand);
}
export function retrieve(query:string,k=6,info?:MachineInfo):Chunk[]{
 const aliases:Record<string,string>={overheat:'过热 水温',coolant:'冷却液',radiator:'散热器',starting:'启动困难',start:'启动',battery:'蓄电池 电池',power:'动力 功率',smoke:'冒黑烟',hydraulic:'液压',electrical:'电气',braking:'制动',steering:'转向',maintenance:'保养 周期',safety:'安全'};
 let lower=query.toLowerCase();for(const [key,value] of Object.entries(aliases))if(lower.includes(key))lower+=' '+value;
 const chinese=(lower.match(/[\u4e00-\u9fa5]/g)||[]).join('');
 const tokens=new Set([...(lower.match(/[a-z0-9]{2,}/g)||[]),...Array.from({length:Math.max(0,chinese.length-1)},(_,i)=>chinese.slice(i,i+2))]);
 const ranked=topics.filter(c=>!info||applicable(c,query,info)).map(c=>({c,score:[...tokens].reduce((n,t)=>n+(c.heading.toLowerCase().includes(t)||c.titleEn.toLowerCase().includes(t)?3:c.text.toLowerCase().includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,k).map(x=>x.c);
 if(info&&ranked.length&&k>1){
  const first=ranked[0];const safety=topics.find(c=>c.source===first.source&&(c.kind==='manual'?c.id.endsWith('-001'):c.id==='8'));
  if(safety&&!ranked.some(c=>c.id===safety.id))return [...ranked.slice(0,k-1),safety];
 }
 return ranked;
}
