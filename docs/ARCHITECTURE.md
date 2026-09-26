# 当前架构

## 请求链路

浏览器中的 React 界面把问题发送到同站点 `/api/chat`。服务端校验请求，根据知识索引检索相关片段，生成包含资料约束的提示词，再调用已配置的模型。回答携带引用文件和章节；没有密钥时返回标注清楚的知识原文。

| 层 | 实现 | 主要文件 |
| --- | --- | --- |
| 界面 | React、TypeScript、Tailwind | `app/`、`components/sinong/` |
| 三维展示 | Three.js、GLTFLoader、RoomEnvironment | `components/sinong/tractor.tsx` |
| 服务端 | Vinext、Cloudflare Workers | `app/api/`、`vite.config.ts` |
| 知识源 | Git 中的 Markdown | `server/knowledge/` |
| 索引生成 | Node.js 读取 Markdown 章节 | `scripts/sync-knowledge.mjs` |
| 检索 | 中文二元词组和英文关键词重叠计分 | `lib/knowledge.ts`、`lib/knowledge.json` |
| 诊断 | 严格资料提示词、提供商切换 | `lib/diagnosis.ts` |

新版沿用原项目的知识资料和拖拉机模型，服务端采用 Workers，不需要单独启动原项目的 Express `8787` 服务。

## 知识与模型

- 索引生成脚本递归读取 `.md`，按 `##` 标题分段；跳过 `00_说明` 目录。
- 检索的标题权重为 3、正文权重为 1，最多返回 6 条，并包含少量英文故障词到中文的映射。
- 当前索引包含 1 份示例资料、8 个主题和包含概述的 9 个片段；这不是向量数据库。
- API 密钥仅用于服务端请求。输入只接受 `user` 和 `assistant` 消息，服务端自行生成系统提示词。
- 通用示例不绑定用户的具体机型。资料不足必须明确说明，不生成虚构维修参数或概率。
- 频率限制位于当前 Worker 实例内，不是跨实例共享的全局配额。

## 数据保存位置

| 数据 | 保存位置 | 更新方式 |
| --- | --- | --- |
| 业务源码、知识原文、模型 | Git 仓库 | 提交并推送到指定 GitHub 仓库 |
| 知识索引 | `lib/knowledge.json`，随网站构建打包 | 执行 `pnpm knowledge:sync` 或 `pnpm build` |
| 对话历史 | 当前浏览器 | 页面操作，不跨设备同步 |
| API 密钥 | 服务端环境变量 | 通过托管配置更新，不写入 Git |
| 运行构建产物与缓存 | 本地或托管运行环境 | 自动生成，不作为源码提交 |

修改 GitHub 中的知识文件后，需要重新构建并发布网站，新资料才会在线生效。网站不会在每次提问时直接从 GitHub 拉取文件。

## 当前未启用的能力

`.openai/hosting.json` 中 D1 与 R2 均未启用。`db/`、`drizzle/` 和 `examples/d1/` 是保留的框架适配与示例，不代表已经有在线数据库。

传感器、声学、视觉、CAN、仿真、数字孪生、向量检索和文件自动解析属于后续方向。
