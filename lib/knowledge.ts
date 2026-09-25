import source from './knowledge.json';
export type Chunk = {id:string;source:string;heading:string;text:string};
export const chunks: Chunk[] = source;
export const topics = chunks.filter(c => c.heading !== '概述');
export const shortTitle = (heading:string) => heading.replace(/^[一二三四五六七八九十]+、/, '').replace(/（.*?）/g, '');
export function retrieve(query:string,k=6):Chunk[] {
  const aliases:Record<string,string>={overheat:'水温过高',coolant:'冷却液',radiator:'散热器',starting:'启动困难',start:'启动',battery:'蓄电池',power:'动力不足',smoke:'冒黑烟',hydraulic:'液压',electrical:'电气',braking:'制动',steering:'转向',maintenance:'保养周期',safety:'安全规范'};
  let lower=query.toLowerCase();
  for(const [key,value] of Object.entries(aliases))if(lower.includes(key))lower+=' '+value;
  const chinese=(lower.match(/[\u4e00-\u9fa5]/g)||[]).join('');
  const tokens=new Set([...(lower.match(/[a-z0-9]{2,}/g)||[]),...Array.from({length:Math.max(0,chinese.length-1)},(_,i)=>chinese.slice(i,i+2))]);
  return topics.map(c=>({c,score:[...tokens].reduce((n,t)=>n+(c.heading.toLowerCase().includes(t)?3:c.text.toLowerCase().includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,k).map(x=>x.c);
}
