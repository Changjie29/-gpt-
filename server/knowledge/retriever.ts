/**
 * 本地轻量 RAG
 *
 * 设计原则：
 * - 不引入向量库 / ES / Redis / LangChain。
 * - 启动时扫描 server/knowledge/ 下的 .md，并加载拖拉机归档索引中的独立条目。
 * - 查询时用关键词重叠打分（中文 bigram + 英文 token），取 top-K 片段。
 * - 知识库很小，全量塞 prompt 也可；这里做"按需选片"，为未来扩充留接口。
 * - 未来接入 PDF/Word 时，只需在 loadAll() 里加新解析器，返回 {path, heading, text}。
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadArchive } from './archive';
import { archiveApplicability, queryWithoutIdentity, resolveScope, type RetrievalContext } from './scope';

export interface KnowledgeChunk {
  /** 通用文档相对 server/knowledge；归档文档相对仓库根目录 */
  source: string;
  /** 该块所属章节标题（## 级） */
  heading: string;
  /** 块正文 */
  text: string;
  entryId?: string;
  sourceId?: string;
  brand?: string;
  model?: string;
  models?: string[];
  emissionStage?: '国三' | '国四';
  sourceUrl?: string;
  originalPath?: string;
  locator?: string;
  version?: string;
  scopeBoundary?: string;
  status?: string;
  entryType?: string;
  applicability?: 'matched' | 'pending';
}

interface ScoredChunk extends KnowledgeChunk {
  score: number;
}

const KB_ROOT = path.resolve(process.cwd(), 'server/knowledge');
const MAX_CHUNKS_IN_PROMPT = 6;
const MAX_CHARS_PER_CHUNK = 1200;

// ---- 启动时索引 ----
let chunks: KnowledgeChunk[] = [];

function walkMdFiles(dir: string, base: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.join(base, e.name);
    if (e.isDirectory()) {
      out.push(...walkMdFiles(full, rel));
    } else if (e.isFile() && e.name.endsWith('.md')) {
      out.push(rel);
    }
  }
  return out;
}

function splitByHeading(relPath: string, content: string): KnowledgeChunk[] {
  const out: KnowledgeChunk[] = [];
  // 按 ## 切；文件首个 # 标题作为文件头，保留为 meta
  const lines = content.split(/\r?\n/);
  let currentHeading = '(概述)';
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join('\n').trim();
    if (text.length > 0) {
      out.push({ source: relPath, heading: currentHeading, text });
    }
    buf = [];
  };
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      flush();
      currentHeading = line.replace(/^##\s+/, '').trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

export function loadKnowledgeBase(): { fileCount: number; chunkCount: number } {
  chunks = [];
  let fileCount = 0;
  try {
    const files = walkMdFiles(KB_ROOT, '');
    for (const rel of files) {
      // 跳过说明性 README（00_说明 下的 README 不参与检索）
      if (rel.replace(/\\/g, '/').startsWith('00_说明/')) continue;
      const abs = path.join(KB_ROOT, rel);
      const content = fs.readFileSync(abs, 'utf-8');
      chunks.push(...splitByHeading(rel, content));
      fileCount++;
    }
  } catch (e) {
    console.warn('[kb] load failed:', (e as Error).message);
  }
  // Invalid archive references must fail startup rather than silently hide missing entries.
  const archive = loadArchive();
  chunks.push(...archive.chunks);
  fileCount += archive.fileCount;
  console.log(`[kb] loaded ${fileCount} files, ${chunks.length} chunks (${archive.chunks.length} archived entries)`);
  return { fileCount, chunkCount: chunks.length };
}

// ---- 关键词打分 ----

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  // 英文/数字 token
  const enTokens = lower.match(/[a-z0-9]{2,}/g) || [];
  // 中文按 2-gram
  const zhChars = (lower.match(/[\u4e00-\u9fa5]/g) || []).join('');
  const zhBigrams: string[] = [];
  for (let i = 0; i < zhChars.length - 1; i++) {
    zhBigrams.push(zhChars.slice(i, i + 2));
  }
  return [...enTokens, ...zhBigrams];
}

function scoreChunk(chunk: KnowledgeChunk, queryTokens: Set<string>): number {
  const heading = (chunk.entryId ? chunk.heading.split('｜').slice(1).join('｜') : chunk.heading).toLowerCase();
  // Brand/model names repeated in citations are not evidence that a symptom is relevant.
  const body = chunk.entryId ? chunk.text.split('\n')
    .filter((line) => !/^- (证据|故障证据|来源|原始|定位|适用|状态)[：:]/.test(line))
    .join('\n').replace(/\b(?:SRC|KB|NH|ZL|LV|DF|HH)-[A-Z0-9-]+\b/g, '') : chunk.text;
  const haystack = (heading + '\n' + body).toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (haystack.includes(t)) {
      // 标题命中权重更高
      score += heading.includes(t) ? 3 : 1;
    }
  }
  return score;
}

/**
 * 根据用户问题检索最相关的知识片段。
 * 无命中时返回空数组，调用方决定 fallback。
 */
export function retrieve(query: string, k = MAX_CHUNKS_IN_PROMPT, context: RetrievalContext = {}): KnowledgeChunk[] {
  if (chunks.length === 0) return [];
  const qTokens = new Set(tokenize(queryWithoutIdentity(query)));
  if (qTokens.size === 0) return [];
  const scope = resolveScope(query, context);

  const scored: ScoredChunk[] = [];
  for (const c of chunks) {
    const applicability = c.entryId ? archiveApplicability(c, scope) : undefined;
    if (c.entryId ? !applicability : !scope.genericKnowledge) continue;
    const s = scoreChunk(c, qTokens);
    if (s > 0) scored.push({ ...c, applicability, score: s });
  }
  // Manual-specific hits take precedence; sample parameters must not contradict their instructions.
  const archived = scored.filter((chunk) => chunk.entryId);
  const selected = archived.length ? archived : scored;
  selected.sort((a, b) => b.score - a.score);
  return selected.slice(0, k).map(({ score: _score, ...chunk }) => chunk);
}

/** 当前知识条目数（供 /api/health 或前端展示） */
export function stats() {
  return { chunks: chunks.length, archivedEntries: chunks.filter((chunk) => chunk.entryId).length };
}

/** Source facts remain outside body truncation so applicability limits cannot be lost. */
export function describeSource(chunk: KnowledgeChunk): string {
  if (!chunk.entryId) return `来源：${chunk.source}｜章节：${chunk.heading}`;
  return [
    `条目：${chunk.entryId}｜来源编号：${chunk.sourceId}｜章节：${chunk.heading}`,
    `知识文档：${chunk.source}`,
    `品牌／型号：${chunk.brand}／${chunk.model}｜资料版本：${chunk.version}`,
    `原始资料：${chunk.originalPath}｜来源网址：${chunk.sourceUrl}`,
    `原文定位：${chunk.locator}`,
    `核验状态：${chunk.status}｜资料类别：${chunk.entryType}`,
    `适用性：${chunk.applicability === 'matched' ? '品牌／型号匹配，市场、配置及手册版本仍需核对' : '具体机型适用性待核实，不直接套用操作或参数'}`,
    `适用限制：${chunk.scopeBoundary}`,
  ].join('\n');
}

/** 把命中的片段格式化为注入 system prompt 的文本块 */
export function formatForPrompt(found: KnowledgeChunk[]): string {
  if (found.length === 0) return '';
  return found
    .map((c, i) => {
      const body = c.text.length > MAX_CHARS_PER_CHUNK ? c.text.slice(0, MAX_CHARS_PER_CHUNK) + '…' : c.text;
      return `【片段 ${i + 1}】\n${describeSource(c)}\n\n${body}`;
    })
    .join('\n\n---\n\n');
}
