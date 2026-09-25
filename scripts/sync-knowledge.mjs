import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('server/knowledge');
const chunks=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,e.name);if(e.isDirectory()){if(e.name!=='00_说明')walk(file);continue;}if(!e.name.endsWith('.md'))continue;let heading='概述',buf=[];const flush=()=>{const text=buf.join('\n').trim();if(text)chunks.push({id:String(chunks.length),source:path.relative(root,file).split(path.sep).join('/'),heading,text});buf=[];};for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){if(/^##\s+/.test(line)){flush();heading=line.replace(/^##\s+/,'').trim();}else buf.push(line);}flush();}}
walk(root);
fs.writeFileSync('lib/knowledge.json',JSON.stringify(chunks,null,2)+'\n');
console.log(`[knowledge] Indexed ${chunks.length} sections`);
