import ReactMarkdown from 'react-markdown';
// Render source tables without rewriting their wording or measurements.
export function ReferenceBody({text}:{text:string}){
 const lines=text.split('\n');const blocks:React.ReactNode[]=[];let prose:string[]=[];
 const flush=()=>{if(prose.length){blocks.push(<ReactMarkdown key={'p'+blocks.length}>{prose.join('\n')}</ReactMarkdown>);prose=[];}};
 const cells=(line:string)=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(s=>s.trim());
 for(let i=0;i<lines.length;i++){
  if(lines[i].trim().startsWith('|')&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1]||'')){
   flush();const header=cells(lines[i]);const rows:string[][]=[];i++;
   while(i+1<lines.length&&lines[i+1].trim().startsWith('|'))rows.push(cells(lines[++i]));
   blocks.push(<div className="reference-table" key={'t'+blocks.length}><table><thead><tr>{header.map((cell,j)=><th key={j}><ReactMarkdown>{cell}</ReactMarkdown></th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{row.map((cell,k)=><td key={k}><ReactMarkdown>{cell}</ReactMarkdown></td>)}</tr>)}</tbody></table></div>);
  }else prose.push(lines[i]);
 }
 flush();return <>{blocks}</>;
}
