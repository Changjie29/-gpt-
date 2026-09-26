# 司农智机 · SRT27

农机故障排查工作台，包含三维农机漫游、知识库检索和诊断对话。

- 源码维护仓库：[Changjie29/-gpt-](https://github.com/Changjie29/-gpt-)，维护分支 `main`。
- 网站：[司农智机 · SRT27](https://srt27-sinong.z3464715478.chatgpt.site)，访问范围由网站的分享设置决定。
- 架构说明：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。
- 更新与同步：[docs/MAINTAINING.md](docs/MAINTAINING.md)。

本网站参考原项目 [Changjie29/SRT27](https://github.com/Changjie29/SRT27) 的提交 `ecfe85810971924bc75a9cb5b514650d5f5e6094` 重建。新版网站源码以本仓库为维护入口；原仓库保留为参考项目。

## 功能与状态

| 页面 | 路径 | 当前功能 |
| --- | --- | --- |
| 农机工作台 | `/` | 拖拉机预览、故障快捷入口、知识主题 |
| 智能诊断 | `/diagnosis` | 农机信息、对话、知识来源、当前浏览器内的历史记录 |
| 农机漫游 | `/roam` | 原始 GLB 模型、旋转、缩放、平移、预设视角、全屏 |
| 知识库 | `/knowledge` | 关键词搜索、主题筛选、原文和来源 |
| 项目架构 | `/architecture` | 当前系统分层与待实现的研究方向 |

无服务端 API 密钥时，诊断页提供明确标注的知识库检索原文。接入有效密钥后才调用 Gemini 或 DeepSeek。检索未命中时提示「当前知识库资料不足」。

## 目录

| 位置 | 用途 |
| --- | --- |
| `app/` | 页面、布局和服务端 API 路由 |
| `app/api/chat/route.ts` | 对话请求校验、频率限制和诊断入口 |
| `components/sinong/` | 工作台界面、侧栏和 Three.js 模型组件 |
| `components/ui/` | 共用界面组件 |
| `server/knowledge/` | 可维护的 Markdown 知识原文 |
| `lib/knowledge.ts` | 关键词检索逻辑 |
| `lib/diagnosis.ts` | 诊断提示词和模型调用 |
| `lib/knowledge.json` | 由知识原文生成的检索索引，不手工修改 |
| `public/models/` | 拖拉机模型和静态兜底预览 |
| `scripts/` | 知识索引同步、开发和构建脚本 |
| `docs/` | 架构与维护说明 |
| `.openai/hosting.json` | 当前网站的托管项目标识和资源声明 |
| `build/`、`vendor/` | 托管适配代码及依赖样式，需要随源码保留 |
| `db/`、`drizzle/`、`examples/d1/` | 预留数据库适配和示例，当前业务未启用数据库 |

## 本地启动

需要 Node.js `>=22.13.0`、Git 和项目指定的 pnpm `11.25.0`。安装依赖使用现有 `pnpm-lock.yaml`。

```bash
git clone https://github.com/Changjie29/-gpt-.git sinong-srt27
cd sinong-srt27
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

开发服务默认地址为 `http://localhost:5173`。如果 Node.js 安装中没有 Corepack，先安装匹配版本的 pnpm，再使用 `pnpm` 执行上述命令。

```bash
pnpm knowledge:sync   # 更新知识索引
pnpm typecheck        # TypeScript 检查
pnpm build            # 同步知识索引并构建网站
```

新克隆使用项目内置的 portable 配置。`install:ci` 和 Linux 专用安装脚本用于托管构建环境；Mac 或 Windows 本地开发直接使用 pnpm 安装。

## AI 配置

环境变量名称见 [`.env.example`](.env.example)。真实值只放在本地忽略的环境文件或托管网站的服务端环境变量中。

| 变量 | 用途 |
| --- | --- |
| `GEMINI_API_KEY` | Gemini 服务端密钥 |
| `DEEPSEEK_API_KEY` | DeepSeek 服务端密钥 |
| `GEMINI_MODEL`、`DEEPSEEK_MODEL` | 使用服务商账户实际可用的模型名 |
| `LLM_PRIMARY` | 首选服务商，`gemini` 或 `deepseek` |

`.env.example` 中的模型名沿用参考仓库声明，尚未通过真实密钥验证。每次模型请求超时为 20 秒，失败后尝试另一个已配置的服务商，全部失败返回脱敏的 502。

提示词由服务端生成，不得编造知识库没有提供的维修参数、型号适配或故障概率。现有知识是通用示例，不能代替对应机型维修手册。

## 更新知识库

1. 把整理好的 Markdown 资料放入 `server/knowledge/` 的相应分类目录。
2. 用 `## 标题` 划分故障或主题，并写明可核对的资料来源和适用范围。
3. 执行 `pnpm knowledge:sync`，检查知识页和故障检索结果。
4. 将原文与更新后的 `lib/knowledge.json` 一起提交。

详细规范见 [知识库维护说明](server/knowledge/00_说明/README.md)。当前版本没有 PDF、Word 或扫描件自动解析能力。

## 后续同步约定

每次更新本站后，提交源码并同步到 `Changjie29/-gpt-` 的 `main` 分支，核对 GitHub 上的提交，再报告完成。同步步骤与冲突处理见 [维护说明](docs/MAINTAINING.md)，开发协作约定保存在 [AGENTS.md](AGENTS.md)。

此约定是每次维护时执行的工作流程。GitHub 推送和网站发布是两个操作；单独向 GitHub 提交代码不会自动发布网站。

## 范围与验证

已实现中英文界面、明暗主题和响应式布局。知识原文为中文；切换界面语言不会翻译资料。对话只保存在当前浏览器，最多 12 个会话、每会话最近 30 条消息。

尚未实现传感器接入、视觉或声学识别、CAN、有限元仿真、数字孪生、向量数据库、跨设备会话和文件上传解析。没有模拟在线遥测或故障概率。

页面查询、知识检索、问答检索和来源侧栏已做浏览器验证。预览环境未提供 WebGL，模型资源、材质和几何通过离线渲染检查；实时旋转缩放尚未在该环境验证。知识页包含可选 WebMCP 搜索注册，预览浏览器未提供对应接口，未验证其执行。

## 模型来源

`David Brown 25D tractor` 由 Lassi Kaukonen（thesidekick）制作，许可为 CC BY 4.0。

- [原模型页面](https://sketchfab.com/3d-models/david-brown-25d-tractor-85720bad20b341ec8508ddbc84f11795)
- `public/models/tractor-preview.png` 由原 GLB 离线渲染，用于加载期间或 WebGL 不可用时的静态预览。

转发或发布模型时保留作者、来源与许可说明。
