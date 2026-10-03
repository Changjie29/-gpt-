import fs from 'node:fs';
import path from 'node:path';
import type { KnowledgeChunk } from './retriever';
import { configureIndexedModels } from './scope';

const ARCHIVE_ROOT = path.resolve(process.cwd(), '知识库/整理后的知识库');
const INDEX_ROOT = path.join(ARCHIVE_ROOT, '农用拖拉机知识库');
const ENTRY_TYPES = ['维护/故障知识', '操作/维护知识', '安全操作', '系统安装/调试',
  '系统适用边界', '资料索引', '资料核验', '机型资料', '资料缺口'];

interface ArchiveEntry {
  entry_id: string;
  source_id: string;
  brand: string;
  model: string;
  title: string;
  knowledge_path: string;
  locator: string;
  status: string;
  scope_boundary?: string;
  use?: string;
  entry_type?: string;
  emission_stage?: '国三' | '国四';
}

interface ArchiveSource {
  source_id: string;
  path: string;
  url: string;
  version: string;
  scope_boundary: string;
  models?: string[];
  emission_stage?: '国三' | '国四';
}

function requireStrings(value: unknown, fields: string[], label: string): void {
  if (!value || typeof value !== 'object' || fields.some((field) =>
    typeof (value as Record<string, unknown>)[field] !== 'string' ||
    !(value as Record<string, string>)[field].trim(),
  )) throw new Error(`知识索引字段缺失：${label}`);
}

/** Only indexed entry sections are loaded; raw manuals, READMEs and pending lists are excluded. */
export function loadArchive(): { chunks: KnowledgeChunk[]; fileCount: number } {
  const sources: unknown = JSON.parse(fs.readFileSync(path.join(INDEX_ROOT, 'sources.json'), 'utf8'));
  if (!Array.isArray(sources)) throw new Error('sources.json 必须是数组');
  const sourceMap = new Map<string, ArchiveSource>();
  for (const value of sources) {
    requireStrings(value, ['source_id', 'path', 'url', 'version', 'scope_boundary'], 'sources.json');
    const source = value as ArchiveSource;
    if (source.models !== undefined && (!Array.isArray(source.models) || !source.models.length ||
      source.models.some((model) => typeof model !== 'string' || !model.trim()))) {
      throw new Error(`知识来源机型列表无效：${source.source_id}`);
    }
    if (source.emission_stage !== undefined && !['国三', '国四'].includes(source.emission_stage)) {
      throw new Error(`知识来源排放阶段无效：${source.source_id}`);
    }
    if (sourceMap.has(source.source_id)) throw new Error(`来源编号重复：${source.source_id}`);
    sourceMap.set(source.source_id, source);
  }

  const documents = new Map<string, Map<string, { heading: string; text: string }>>();
  const chunks: KnowledgeChunk[] = [];
  const ids = new Set<string>();
  const lines = fs.readFileSync(path.join(INDEX_ROOT, 'entries.jsonl'), 'utf8').split(/\r?\n/).filter((line) => line.trim());
  for (const line of lines) {
    const value: unknown = JSON.parse(line);
    requireStrings(value, ['entry_id', 'source_id', 'brand', 'model', 'title', 'knowledge_path', 'locator', 'status', 'entry_type'], 'entries.jsonl');
    const entry = value as ArchiveEntry;
    if (!ENTRY_TYPES.includes(entry.entry_type!)) throw new Error(`知识条目类别无效：${entry.entry_id}`);
    if (entry.emission_stage !== undefined && !['国三', '国四'].includes(entry.emission_stage)) {
      throw new Error(`知识条目排放阶段无效：${entry.entry_id}`);
    }
    if (ids.has(entry.entry_id)) throw new Error(`知识条目编号重复：${entry.entry_id}`);
    ids.add(entry.entry_id);
    const source = sourceMap.get(entry.source_id);
    if (!source) throw new Error(`知识条目来源不存在：${entry.entry_id}`);

    const file = path.resolve(process.cwd(), entry.knowledge_path);
    const relative = path.relative(ARCHIVE_ROOT, file);
    const realRelative = path.relative(fs.realpathSync(ARCHIVE_ROOT), fs.realpathSync(file));
    if ([relative, realRelative].some((rel) => rel.startsWith(`..${path.sep}`) || rel === '..' || path.isAbsolute(rel)) || !file.endsWith('.md')) {
      throw new Error(`知识文档必须位于整理后的知识库内：${entry.entry_id}`);
    }
    let sections = documents.get(file);
    if (!sections) {
      sections = new Map();
      const text = fs.readFileSync(file, 'utf8');
      for (const match of text.matchAll(/^##\s+([^\r\n]+)\r?\n([\s\S]*?)(?=^##\s+|(?![\s\S]))/gm)) {
        const heading = match[1].trim();
        const key = heading.split('｜')[0].trim();
        if (sections.has(key)) throw new Error(`知识章节重复：${key}`);
        sections.set(key, { heading, text: match[2].trim() });
      }
      documents.set(file, sections);
    }
    const section = sections.get(entry.entry_id);
    if (!section?.text) throw new Error(`索引对应的知识章节缺失：${entry.entry_id}`);
    // Inherited market/configuration limits in the manual's introduction apply to every entry.
    const inheritedScope = sections.get('来源与适用范围')?.text.split('\n')
      .filter((line) => /^- (仅适用|型号：|适用：|资料性质：|整理日期：)/.test(line)).join('\n');
    chunks.push({
      source: entry.knowledge_path.replace(/\\/g, '/'),
      heading: section.heading,
      text: section.text,
      entryId: entry.entry_id,
      sourceId: entry.source_id,
      brand: entry.brand,
      model: entry.model,
      models: source.models ? [...source.models] : undefined,
      emissionStage: entry.emission_stage ?? source.emission_stage,
      sourceUrl: source.url,
      originalPath: source.path,
      locator: entry.locator,
      version: source.version,
      scopeBoundary: [source.scope_boundary, inheritedScope, entry.scope_boundary, entry.use].filter(Boolean).join('\n'),
      status: entry.status,
      entryType: entry.entry_type,
    });
  }
  configureIndexedModels(chunks);
  return { chunks, fileCount: documents.size };
}
