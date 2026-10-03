# 耕知·耘诊 · 农业机械智能诊断平台

当前项目版本：**2.1.0**。每次更新的版本、改动和验证结果见[版本日志](CHANGELOG.md)。网站页脚展示构建版本，`/api/health`返回运行服务版本；线上是否更新以实际部署为准。

面向农业机械装备的智能故障诊断 Agent。基于本地 Markdown 知识库 + 大语言模型，为拖拉机、联合收割机等农机提供结构化的故障原因分析、排查步骤与安全维修建议。

> 当前版本为**本地知识库 + LLM 对话**的轻量方案，未接入传感器/麦克风/视觉/CAN 总线。多模态感知、结构仿真、数字孪生等能力均为规划方向。

## 技术栈

- **前端**：React 19 + Vite + TypeScript + Tailwind CSS + React Router + React Three Fiber
- **后端**：Node.js + Express + tsx（ESM）
- **LLM**：Gemini（`gemini-3.6-flash`）/ DeepSeek（`deepseek-v4-flash`），OpenAI 兼容协议
- **知识库**：通用 Markdown + 122 条索引化拖拉机知识，按章节提取 + 关键词重叠打分，零向量库
- **3D**：Three.js / React Three Fiber，程序化 RoomEnvironment 光照，零 HDR 网络请求

## 快速开始

### 环境要求

- Node.js ≥ 20
- npm ≥ 10

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

编辑 `server/.env`（**该文件永不提交到 Git**，已在 `.gitignore` 中排除）：

```env
# Gemini（有代理环境优先使用；OAuth token 或 API key）
GEMINI_API_KEY=your_gemini_api_key

# DeepSeek（无代理环境优先使用；sk- 开头）
DEEPSEEK_API_KEY=your_deepseek_api_key

# 服务端口（默认 3000，前后端共用）
PORT=3000

# 可选：代理（写在这里也能被识别；服务启动时先加载本文件再读代理变量）
# HTTPS_PROXY=http://127.0.0.1:7890
# HTTP_PROXY=http://127.0.0.1:7890
```

> 两个 key 都配最稳：后端按网络环境自动选主选，失败自动回退。只配一个也能跑。
> 不配置 key 也可运行本地知识检索；外部模型未配置或调用失败时使用本地知识库回复。
> 服务启动顺序：先加载 `server/.env`，再读取 `HTTPS_PROXY/https_proxy/HTTP_PROXY/http_proxy` 决定走 Gemini 还是 DeepSeek。

### 3. 启动开发服务

```bash
npm run dev
```

- 网站及 API：http://localhost:3000
- 对话页：http://localhost:3000/chat
- 健康检查：http://localhost:3000/api/health

### 4. 检索测试 / 类型检查 / Lint / 构建

```bash
npm test            # 知识索引、适用范围过滤、检索与回复回归测试
npm run typecheck   # 前端 tsc
npm run lint        # eslint
npm run build       # 前端类型检查与构建
npm run build:server # 后端编译检查
```

## LLM 选择策略

后端 `server/llm/router.ts` 按当前网络环境自动选 provider：

| 环境 | 主选 | 回退 |
| --- | --- | --- |
| 检测到 `HTTPS_PROXY` / `https_proxy` / `HTTP_PROXY` / `http_proxy` | Gemini | DeepSeek |
| 无代理变量 | DeepSeek | Gemini |

- 主选未配置时自动交换。
- 主选抛网络/超时/服务端错误时自动回退次选。
- 鉴权错误（401/403）也会尝试另一个，方便排查 key 问题。
- 未配置外部模型或模型调用失败时，返回本地知识库回复，前端显示「本地知识库」；资料不足时明确说明，不编造机型参数。
- 20 秒超时。

## RAG 工作流

1. 启动时扫描 `server/knowledge/` 下的通用 `.md` 文件（跳过 `00_说明/`），按 `## ` 二级标题切块；同时读取 `知识库/整理后的知识库/农用拖拉机知识库/entries.jsonl`，按条目编号提取对应 Markdown 章节。目前为 9 个通用片段 + 122 条拖拉机条目，共 131 个片段。
2. 检索结合 `machineType`、`brand`、`model`，也识别问题中可辨认的品牌与型号，过滤不相关品牌／型号及非拖拉机的归档条目；再对问题做中文 2-gram + 英文 token 化，按关键词重叠打分，标题命中权重 ×3。品牌或型号匹配不代表市场、排放、配置及版本已经确认。
3. 取 top-6 片段（单块超 1200 字符截断），拼入后端独占的 system prompt。
4. system prompt 硬性要求：
   - 禁止编造压力/温度/电压/扭矩/故障码/零件号/油液型号等参数；
   - 资料不足时输出【当前资料不足】并主动追问机型/工况/伴随现象；
   - 结构化输出：【故障现象】【初步判断】【可能原因】【建议排查】【知识依据】【安全提醒】；
   - 用户用什么语言问，就用什么语言答。
5. 前端只发 user/assistant 历史（截最近 20 轮），不发 system message——system prompt 由后端独占。
6. 归档条目保留来源编号、原文定位、来源链接、文档适用范围及核对状态，供外部模型和本地回复引用。仅索引中的编号条目参与检索；归档 README、待补资料、原始 HTML/PDF 不作为诊断知识自动加载。

例如：填写「拖拉机／久保田／LX2620」，询问「发动机启动困难」，可检索 `KB-LX2620-003`。命中归档条目时优先使用对应资料，避免与通用示例中的参数或操作混用；已指定品牌／型号但无合适资料时返回资料不足。填写 `WORKMASTER25S` 时，不会套用仅适用于 `WORKMASTER25` 的条目。未确认市场或配置时仍需依据条目的适用限制核实。

## 知识库目录

```
server/knowledge/
├── 00_说明/              # 目录约定与维护说明（不参与检索）
├── 01_通用原理/          # 发动机/冷却/润滑/液压/电气/传动/制动/转向
├── 02_农机类型/          # 拖拉机/收割机/插秧机/植保机...
├── 03_新能源农机/        # 电动/混动农机
├── 04_智能农机/          # 无人化/自动驾驶
├── 05_故障代码/          # 各品牌故障码表
├── 06_品牌资料/          # 东方红/雷沃/中联/久保田/约翰迪尔...
├── 07_具体型号/          # 具体型号维修手册
└── 99_待整理/            # 未分类资料
```

归档知识通过 `知识库/整理后的知识库/农用拖拉机知识库/entries.jsonl` 指向对应编号章节，无需复制到上述目录。修改索引或知识文档后需重启服务重新加载；新增条目需保留原文定位、来源编号及适用限制。人读入口见[知识库总览](知识库/README.md)，后续新增遵守[整理规范](知识库/条目整理规范.md)，使用[模板](知识库/模板/新资料模板.md)并运行`python3 知识库/工具/校验索引.py`。明确排放阶段与用户问题冲突时不套用旧手册，未取得正文的候选只保留采集记录。未来自动解析 PDF/Word/Excel/TXT 时，再在 `server/knowledge/retriever.ts` 之上增加解析层。

## 项目结构

```
AgriDx-v2/
├── public/                          # 静态公共资源（构建时原样拷贝到 dist/）
│   └── models/
│       └── tractor.glb              # 拖拉机 3D 模型（前端经 /models/tractor.glb 加载；后端 /api/model/tractor 为同一文件接口）
│
├── src/                              # 前端源码（React 19 + Vite + TypeScript）
│   ├── index.tsx                     # 应用入口（挂载 React + Router）
│   ├── app.tsx                      # 路由表（/ 首页、/chat 对话、* 404）
│   ├── index.css / tailwind-theme.css / typography.css  # 样式与主题变量
│   ├── components/
│   │   ├── Layout.tsx               # 全局布局：顶栏导航 + 主题/语言切换 + Outlet
│   │   ├── TractorViewer.tsx       # 3D 查看器（R3F Canvas + OrbitControls + 自转）
│   │   ├── TractorModel.tsx         # GLB 模型加载（useGLTF + clone 克隆处理）、居中缩放贴地
│   │   ├── SectionDivider.tsx      # 绿色装饰分割线（leaf/dots/line 三种）
│   │   └── ui/                     # shadcn/ui 基础组件（button/card/dialog/textarea）
│   ├── pages/
│   │   ├── HomePage/
│   │   │   ├── HomePage.tsx         # 首页组装（按顺序拼接 8 个 section）
│   │   │   └── sections/            # 首页各区块
│   │   │       ├── HeroSection.tsx          # 首屏：标题 + CTA + 3D 模型
│   │   │       ├── PainPointsSection.tsx    # 行业痛点 + 真实能力卡片
│   │   │       ├── MultimodalSection.tsx    # 多模态信号（标注规划中）
│   │   │       ├── ArchitectureSection.tsx   # 真实四层架构
│   │   │       ├── SimulationSection.tsx     # 3D 已实现 / FEA 与数字孪生规划中
│   │   │       ├── TechRouteSection.tsx      # 六步技术流程
│   │   │       ├── ScenariosSection.tsx      # 拖拉机/收割机/更广农机
│   │   │       └── ClosingSection.tsx       # 底部 CTA
│   │   ├── ChatPage/
│   │   │   └── ChatPage.tsx         # 对话页：历史/快捷提问/农机信息选择器/Provider 显示
│   │   └── NotFoundPage/
│   │       └── NotFoundPage.tsx     # 404
│   ├── data/
│   │   └── content.ts               # 全部页面文案（中英双语）+ pick() 工具
│   ├── hooks/
│   │   ├── useLang.ts               # 中英双语切换（useSyncExternalStore）
│   │   └── use-mobile.ts            # 响应式断点 hook
│   └── lib/
│       └── utils.ts                 # cn() 类名合并
│
├── server/                           # 后端（Node.js + Express + tsx，ESM）
│   ├── dev.ts                       # 开发入口（tsx watch 启动 index.ts）
│   ├── index.ts                     # Express 路由：安全中间件/限流/health/chat/model
│   ├── .env                         # 本地环境变量（永不提交 Git）
│   │
│   ├── llm/                         # LLM Provider 层（按代理自动选模型）
│   │   ├── types.ts                 # Provider 接口 / ChatResult / ProviderError
│   │   ├── http.ts                  # fetchWithTimeout(20s) + detectProxy()
│   │   ├── openai-compatible.ts     # 通用 OpenAI 兼容 chat/completions 工厂
│   │   ├── gemini.ts                # Gemini provider（gemini-3.6-flash）
│   │   ├── deepseek.ts              # DeepSeek provider（deepseek-v4-flash）
│   │   └── router.ts                # 单例：有代理→Gemini，无代理→DeepSeek，失败 fallback
│   │
│   └── knowledge/                   # 本地知识库 + 轻量 RAG
│       ├── retriever.ts             # 通用 .md + 归档编号条目、适用范围过滤、关键词打分、top-K
│       ├── systemPrompt.ts          # buildSystemPrompt（后端独占 system prompt）
│       ├── 00_说明/                 # 目录约定（不参与检索）
│       ├── 01_通用原理/             # 发动机/冷却/润滑/液压/电气/传动...
│       ├── 02_农机类型/             # 拖拉机/收割机/插秧机...
│       ├── 03_新能源农机/           # 电动/混动农机
│       ├── 04_智能农机/             # 无人化/自动驾驶
│       ├── 05_故障代码/             # 各品牌故障码表
│       ├── 06_品牌资料/             # 东方红/雷沃/久保田/约翰迪尔...
│       ├── 07_具体型号/             # 具体型号维修手册
│       └── 99_待整理/              # 未分类资料
│
├── shared/                           # 前后端共享类型
│   ├── plugin-types.ts              # 插件/扩展类型定义
│   └── capabilities/                # 能力声明
│
├── scripts/
│   ├── dev.mjs                      # 同时启动前端 Vite + 后端 tsx
│   ├── build.sh                    # 先 build:client 再 build:server
│   └── cloud-pull.sh               # 云电脑上执行的 git pull 脚本
│
├── index.html                        # Vite HTML 入口
├── package.json                     # 依赖与 scripts（dev/typecheck/lint/build）
├── vite.config.ts                   # Vite 配置（开发服务默认 3000，由 Express 加载前端中间件）
├── tsconfig.app.json                # 前端 TS 配置
├── tsconfig.server.json             # 后端 TS 配置
├── tsconfig.node.json               # Vite/Node 侧 TS 配置
├── eslint.config.mjs                # ESLint 配置
├── components.json                  # shadcn/ui 配置
└── README.md
```

## Git 分支

- **`main`**：稳定版本，日常开发与部署都基于此分支。所有同步脚本（rsync + git push）都推到 `main`。
- 目前仓库只有 `main` 一个分支。后续如需要独立开发新功能，可从 `main` 切 `feature/<功能名>` 分支，合并后删除，不长期保留展示性分支。

## API

### `GET /api/health`

```json
{ "ok": true, "version": "2.1.0", "timestamp": "...", "knowledge": { "chunks": 131, "archivedEntries": 122 } }
```

### `POST /api/chat`

请求体（前端只发 user/assistant；system 由后端拼）：

```json
{
  "messages": [
    { "role": "user", "content": "拖拉机水温过高怎么办？" }
  ],
  "machineType": "拖拉机",
  "brand": "",
  "model": ""
}
```

响应（OpenAI 兼容 + 附加字段）：

```json
{
  "choices": [{ "message": { "role": "assistant", "content": "..." } }],
  "model": "deepseek-v4-flash",
  "provider": "deepseek",
  "fellBack": false,
  "knowledgeChunks": 2
}
```

本地知识库回复沿用相同的 `choices` 结构，`provider` 为 `knowledge-base`、`model` 为 `kb-rag-engine (本地知识引擎)`、`fellBack` 为 `true`；`knowledgeChunks` 为本次命中的片段数。

服务无法生成回复时返回 HTTP 502：

```json
{ "error": "智能诊断服务暂时无法连接，请稍后重试。", "code": "llm_unavailable" }
```

## 安全

- API Key 仅存于 `server/.env`，前端/构建产物/Git 均不出现。
- CORS 白名单仅允许本地开发源；生产可按需扩展。
- 所有外部 LLM 请求经 `undici` 的 `ProxyAgent` 走系统代理。
- `/api/chat` 每 IP 每分钟 30 次限流。
- 错误日志只打印 provider 名与错误类别，绝不打印 key。
- Markdown 渲染使用 `react-markdown`（默认不执行 HTML/JS）。

## 当前已实现 vs 规划中

**已实现**

- 本地 Markdown 知识库 + 122 条拖拉机归档条目 + 品牌／型号过滤与关键词检索 RAG
- Gemini / DeepSeek 双 Provider，按代理自动选择 + 失败回退
- 后端独占 system prompt，强制结构化输出与禁止编造参数
- 可交互 3D 拖拉机模型（拖拽/缩放/自转/恢复视角）
- 中英双语界面、跟随系统的明暗主题
- 对话历史本地持久化、Markdown 渲染、快捷提问
- 农机类型/品牌/型号可选选择器，用于增强检索
- CORS 白名单、安全头、限流、优雅退出、错误脱敏

**规划中（首页已明确标注）**

- 振动/声学/视觉/CAN 总线多模态信号接入
- 有限元模态/应力仿真验证
- 数字孪生诊断-验证闭环
- 真实 PDF/Word/Excel 维修手册解析入库
- 向量检索（当前为关键词重叠，资料量上来后再升级）

## 同步部署

- GitHub：https://github.com/Changjie29/AgriDx-v2
- 本地工作区：clone 仓库后在根目录执行 `npm install` 即可开发，无需额外配置路径
- 同步方式：代码和知识库提交到 `main`；运行环境需按实际更新/部署流程重新加载，GitHub推送本身不代表网站已经部署

---

© 2026 耕知·耘诊 · 南京农业大学

## 2026-09-26 对话体验优化

- 首页与对话页按路由加载，直接访问 `/chat` 不下载首页的 3D 代码。
- 输入超过 2000 字符时显示计数并禁止发送；中文输入法组词时回车不发送。
- 支持停止等待；清空或离开页面会取消前端请求，并隔离旧请求的完成回调。停止等待不保证服务端模型已经停止生成。
- 仅保存最近 100 条用户/助手消息，恢复时过滤损坏记录和非法展示字段。
- 农机类型使用稳定值，中英文切换保留选择，并兼容历史英文类型。
- 增加输入控件无障碍标签、对话更新播报、动态视口高度及长内容横向滚动。

验证：前后端构建、前端类型检查通过；Lint 无错误（基础按钮组件仍有原有 Fast Refresh 警告）。浏览器验证了双语机型保留、2001 字输入禁发、Shift+Enter 换行、停止等待、清空后新对话与模拟回复显示。请求交互使用临时本机模拟接口验证，未调用真实 LLM；中文输入法组合事件防护尚需在实际输入法中复核。首页 3D 构建块仍有体积告警。
