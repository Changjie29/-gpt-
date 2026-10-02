import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('server/knowledge');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
const chunks=[];
const englishGeneral=['Overview','Engine overheating','Hard starting / no start','Low power / black smoke','Hydraulic system faults','Electrical system faults','Braking and steering','Maintenance intervals','Safe maintenance'];
const englishManual={
 'ZL-PL':['Starting, leaving and servicing safely','Daily checks and battery maintenance','Hard starting / no start','Engine power loss','Engine overheating','Low engine oil pressure','Hydraulic failure or overheating','Lift operation problems'],
 'NH-WM25':['Starting and servicing safely','Selected service intervals','Starter does not turn','Engine turns but does not start','Engine power loss','Engine overheating','Oil pressure warning while running','Three-point hitch does not lift'],
 'KB-LX2620':['Safe servicing','Selected service intervals','Hard starting / no start','Engine power loss','Engine overheating','Engine stops suddenly','Engine warning without overheating','Master warning and Err1 / Err2 / Err3']
};
function category(heading){if(/安全|保养|维护|检查|周期|离车/.test(heading))return 'maintenance';if(/液压|提升|电气|蓄电池|充电|制动|转向/.test(heading))return 'hydraulic';return 'engine';}
for(const doc of catalog){
 const content=fs.readFileSync(path.join(root,doc.path),'utf8');
 const sections=[];let heading='概述',lines=[];
 const flush=()=>{const text=lines.join('\n').trim();if(text)sections.push({heading,text});lines=[];};
 for(const line of content.split(/\r?\n/)){if(/^##\s+/.test(line)){flush();heading=line.replace(/^##\s+/,'').trim();}else lines.push(line);}flush();
 const context=sections.find(s=>s.heading==='来源与适用范围')?.text||doc.scope;
 for(const [index,section] of sections.entries()){
  const entry=section.heading.match(/^((ZL-PL|NH-WM25|KB-LX2620)-(\d{3}))｜(.+)$/);
  const visible=doc.kind==='general'?section.heading!=='概述':!!entry;
  const titleEn=entry?englishManual[entry[2]]?.[Number(entry[3])-1]:englishGeneral[index];
  // Preserve original general-topic links; manual entry codes remain stable.
  chunks.push({id:entry?.[1]||doc.kind+'-'+doc.sourceId+'-'+index,source:doc.path,heading:section.heading,text:section.text,kind:doc.kind,brand:doc.brand,brandEn:doc.brandEn,aliases:doc.aliases||[],models:doc.models,titleEn:titleEn||doc.titleEn,category:category(section.heading),visible,language:doc.language,sourceId:doc.sourceId,scope:doc.scope,scopeEn:doc.scopeEn,context});
  if(doc.kind==='general')chunks.at(-1).id=String(index);
 }
}
const ids=new Set();for(const c of chunks){if(ids.has(c.id))throw Error('Duplicate knowledge ID: '+c.id);ids.add(c.id);}
fs.writeFileSync('lib/knowledge.json',JSON.stringify(chunks,null,2)+'\n');
console.log('[knowledge] '+catalog.length+' documents, '+chunks.length+' chunks, '+chunks.filter(c=>c.visible).length+' topics');
