/**
 * LLM Router
 *
 * 选择策略（按当前网络环境）：
 *   - 检测到代理（HTTPS_PROXY / https_proxy / HTTP_PROXY / http_proxy）→ Gemini 优先
 *   - 否则                                          → DeepSeek 优先
 *   - 主选失败（网络/超时/服务端错误/鉴权 401/403）  → 自动回退另一个
 *   - 两个都失败                                    → 抛 ProviderError 给上层
 *
 * 鉴权失败也会尝试另一个 provider，方便排查 key 配置问题。
 * 日志只打印 provider 名与错误类别，绝不打印 API Key。
 */
import { detectProxy } from './http';
import { createGeminiProvider } from './gemini';
import { createDeepSeekProvider } from './deepseek';
import {
  ProviderError,
  type ChatMessage,
  type ChatResult,
  type Provider,
} from './types';

export interface RouteOutcome {
  result: ChatResult;
  /** 实际主选是谁 */
  primary: 'gemini' | 'deepseek';
  /** 是否发生了 fallback */
  fellBack: boolean;
}

function log(msg: string, extra?: unknown) {
  // 开发日志：不打印任何 key
  if (extra !== undefined) {
    console.warn(`[llm] ${msg}`, extra);
  } else {
    console.log(`[llm] ${msg}`);
  }
}

export class LlmRouter {
  private readonly gemini: Provider;
  private readonly deepseek: Provider;

  constructor() {
    this.gemini = createGeminiProvider();
    this.deepseek = createDeepSeekProvider();
  }

  /** 启动时打印一次配置状态（不泄露 key） */
  printConfig() {
    const proxy = detectProxy();
    log(
      `provider config: gemini=${this.gemini.isConfigured() ? 'configured' : 'missing'} ` +
        `deepseek=${this.deepseek.isConfigured() ? 'configured' : 'missing'} ` +
        `proxy=${proxy.present ? 'detected' : 'none'}`,
    );
  }

  hasAnyConfigured(): boolean {
    return this.gemini.isConfigured() || this.deepseek.isConfigured();
  }

  /**
   * 决定本次请求的主选 provider。
   * 规则：配置 Gemini 则优先使用 Gemini（AI Studio 云环境直连 Google）；未配置时自动降级。
   */
  private pickPrimary(): { primary: Provider; secondary: Provider } {
    const proxy = detectProxy();
    let first: Provider;
    let second: Provider;

    if (this.gemini.isConfigured() && !this.deepseek.isConfigured()) {
      first = this.gemini;
      second = this.deepseek;
    } else if (this.deepseek.isConfigured() && !this.gemini.isConfigured()) {
      first = this.deepseek;
      second = this.gemini;
    } else if (proxy.present || process.env.GEMINI_API_KEY) {
      first = this.gemini;
      second = this.deepseek;
    } else {
      first = this.deepseek;
      second = this.gemini;
    }

    // 主选未配置则交换
    if (!first.isConfigured() && second.isConfigured()) {
      log(`primary ${first.name} not configured, using ${second.name}`);
      [first, second] = [second, first];
    }
    return { primary: first, secondary: second };
  }

  async chat(messages: ChatMessage[]): Promise<RouteOutcome> {
    const { primary, secondary } = this.pickPrimary();

    if (!primary.isConfigured() && !secondary.isConfigured()) {
      throw new ProviderError(primary.name, 'unknown', 'no LLM API key configured');
    }

    // 1) 主选
    try {
      const result = await primary.chat(messages);
      return { result, primary: primary.name, fellBack: false };
    } catch (err) {
      if (err instanceof ProviderError) {
        // 任何错误（含鉴权失败）都尝试另一个 provider，方便排查 key 问题
        log(`primary ${primary.name} failed (${err.kind}), trying ${secondary.name}`, err.detail);
      } else {
        log(`primary ${primary.name} unexpected error`, err);
      }
    }

    // 2) 回退
    if (secondary.isConfigured()) {
      try {
        const result = await secondary.chat(messages);
        return { result, primary: primary.name, fellBack: true };
      } catch (err) {
        if (err instanceof ProviderError) {
          log(`secondary ${secondary.name} also failed (${err.kind})`, err.detail);
        } else {
          log(`secondary ${secondary.name} unexpected error`, err);
        }
        throw err;
      }
    }

    throw new ProviderError(primary.name, 'unknown', 'both providers failed');
  }
}

/** 单例：进程内复用 */
let singleton: LlmRouter | null = null;
export function getLlmRouter(): LlmRouter {
  if (!singleton) {
    singleton = new LlmRouter();
    singleton.printConfig();
  }
  return singleton;
}
