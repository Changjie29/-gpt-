/**
 * SRT27 HTTP 服务入口
 *
 * 职责：
 * - Express 中间件（CORS、安全头、JSON 解析、限流）
 * - /api/health
 * - /api/chat：输入校验 → RAG → LLM Router → 统一错误响应
 * - /api/model/tractor：本地 GLB 文件
 *
 * 注意：
 * - API Key 仅从环境变量读取，绝不打印、绝不返回前端。
 * - 用户侧错误信息永远是友好的中文/英文提示，不暴露 ECONNRESET/502 等技术细节。
 */
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';

// 1) 必须先加载 server/.env，再读取任何代理/Key 环境变量。
//    这样即使 HTTPS_PROXY 等代理配置写在 .env 里，也能被后续 detectProxy() 正确识别。
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

// 2) Node fetch 默认不走系统代理；若配置了代理，全局启用（undici）。
//    此时 process.env.HTTPS_PROXY 等已包含 .env 中的值。
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { pathToFileURL } from 'node:url';
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  console.log('[server] proxy enabled (redacted)');
}

// ---- 知识库 & LLM ----
import { loadKnowledgeBase, stats as kbStats } from './knowledge/retriever';
import { buildSystemPrompt } from './knowledge/systemPrompt';
import { generateLocalKnowledgeReply } from './knowledge/fallbackDiagnosis';
import { getLlmRouter } from './llm/router';
import { ProviderError, type ChatMessage } from './llm/types';

loadKnowledgeBase();
const llm = getLlmRouter();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ---- 基础安全 ----
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.use(cors());

app.use(express.json({ limit: '256kb' }));

// ---- 限流：每 IP 每分钟 30 次 /api/chat ----
const rateBucket = new Map<string, { count: number; reset: number }>();
app.use('/api/chat', (req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const bucket = rateBucket.get(ip);
  if (!bucket || bucket.reset < now) {
    rateBucket.set(ip, { count: 1, reset: now + 60_000 });
  } else {
    bucket.count++;
    if (bucket.count > 30) {
      res.status(429).json({ error: '请求过于频繁，请稍后再试', code: 'rate_limited' });
      return;
    }
  }
  next();
});

// ---- 健康检查 ----
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    knowledge: kbStats(),
  });
});

// ---- /api/chat ----
interface ChatRequestBody {
  messages?: ChatMessage[];
  machineType?: string;
  brand?: string;
  model?: string;
}

const USER_FRIENDLY_ERROR =
  process.env.NODE_ENV === 'production'
    ? '智能诊断服务暂时无法连接，请稍后重试。'
    : '智能诊断服务暂时无法连接，请稍后重试。';

app.post('/api/chat', async (req: Request, res: Response) => {
  const body = req.body as ChatRequestBody;
  const { messages, machineType, brand, model } = body;

  // 输入校验
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages 参数缺失或格式错误', code: 'bad_request' });
    return;
  }
  if (messages.length > 40) {
    res.status(400).json({ error: '对话轮次过多，请新开对话', code: 'too_long' });
    return;
  }
  const ROLES = new Set(['system', 'user', 'assistant']);
  for (const m of messages) {
    if (!m || typeof m !== 'object' || !ROLES.has(m.role) || typeof m.content !== 'string') {
      res.status(400).json({ error: '消息格式错误', code: 'bad_request' });
      return;
    }
    if (m.content.length > 2000) {
      res.status(400).json({ error: '单条消息过长（上限 2000 字符）', code: 'too_long' });
      return;
    }
  }

  // 前端不应发送 system；如发送，丢弃（后端拥有最终 system prompt）
  const history = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-20) // 最多保留 20 轮，避免无限增长
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // 取最近一条 user 问题用于 RAG 检索
  const lastUserMsg = [...history].reverse().find((m) => m.role === 'user');
  const query = lastUserMsg?.content || '';

  // 构造 system prompt（含 RAG）
  const { message: systemMsg, retrieved } = buildSystemPrompt({
    query,
    machineType,
    brand,
    model,
  });

  const fullMessages: ChatMessage[] = [systemMsg, ...history];

  try {
    if (!llm.hasAnyConfigured()) {
      // 未配置外部 API key 时，基于本地农机知识库检索结果直接给出结构化排查建议
      const localReply = generateLocalKnowledgeReply(query, retrieved, { machineType, brand, model });
      res.json({
        choices: [{ message: { role: 'assistant', content: localReply } }],
        model: 'kb-rag-engine (本地知识引擎)',
        provider: 'knowledge-base',
        fellBack: true,
        knowledgeChunks: retrieved.length,
      });
      return;
    }

    const outcome = await llm.chat(fullMessages);
    // 返回 OpenAI 兼容结构 + 附加 provider/model/knowledge 元信息
    res.json({
      choices: [{ message: { role: 'assistant', content: outcome.result.content } }],
      model: outcome.result.model,
      provider: outcome.result.provider,
      fellBack: outcome.fellBack,
      knowledgeChunks: retrieved.length,
    });
  } catch (err) {
    if (err instanceof ProviderError) {
      console.warn(`[chat] provider error: ${err.provider}/${err.kind}`, err.detail);
      // 服务提供商错误时，自动兜底为本地知识库排查
      const localReply = generateLocalKnowledgeReply(query, retrieved, { machineType, brand, model });
      res.json({
        choices: [{ message: { role: 'assistant', content: localReply } }],
        model: 'kb-rag-fallback (本地备用引擎)',
        provider: 'knowledge-base',
        fellBack: true,
        knowledgeChunks: retrieved.length,
      });
      return;
    }
    console.error('[chat] unexpected error:', err);
    res.status(502).json({ error: USER_FRIENDLY_ERROR, code: 'llm_unavailable' });
  }
});

// ---- 3D 模型 ----
app.get('/api/model/tractor', (_req: Request, res: Response) => {
  const modelPath = path.resolve(process.cwd(), 'public/models/tractor.glb');
  res.sendFile(modelPath, (err) => {
    if (err) res.status(404).json({ error: '模型文件不存在' });
  });
});

// ---- 全局错误兜底 ----
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('[server] unhandled:', err.message);
  res.status(500).json({ error: '服务器内部错误' });
});

const isDirectRun =
  process.argv[1] &&
  (pathToFileURL(process.argv[1]).href === import.meta.url ||
    process.argv[1].endsWith('server/index.ts') ||
    process.argv[1].endsWith('server/dev.ts'));

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] running on http://0.0.0.0:${PORT}`);
  });
  const shutdown = (signal: string) => {
    console.log(`[server] received ${signal}, shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

export default app;
