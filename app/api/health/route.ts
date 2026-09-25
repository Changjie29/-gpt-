import { env } from 'cloudflare:workers';
import { configured,knowledgeStats } from '@/lib/diagnosis';
export function GET(){const providers=configured(env as unknown as Record<string,string>);return Response.json({ok:true,knowledge:knowledgeStats,providers,mode:providers.length?'ai':'knowledge'},{headers:{'Cache-Control':'no-store'}});}
