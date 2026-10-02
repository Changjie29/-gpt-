# AgriDx 新版架构

## 请求链路

浏览器界面 → 同站点 /api/chat → 请求校验 → 按机型限制检索 → 完整证据提示词 → 已配置模型或知识检索回答。

| 职责 | 文件 | 边界 |
| --- | --- | --- |
| 界面和语言切换 | components/sinong/product.tsx、shell.tsx | 中文品牌耕知·耘诊，英文品牌 AgriDx；原始资料明确标注语言 |
| HTTP 接口 | app/api/chat/route.ts | 同源、实例内限频、状态码、错误语言 |
| 请求校验 | lib/chat-request.ts | 消息角色/数量/长度，机型及语言字段；拒绝用户系统消息 |
| 检索及统计 | lib/knowledge.ts | 精确型号与品牌过滤、关键词排序，统计来自索引 |
| 证据提示词 | lib/prompt.ts | 来源范围与完整正文，不截掉尾部页码 |
| 诊断服务 | lib/diagnosis.ts | 服务端密钥、提供商顺序、超时、中英检索反馈 |
| 健康检查 | app/api/health/route.ts | 实际资料数量、已配置提供商和运行模式 |

## 知识目录

server/knowledge/catalog.json 是收录清单，登记文件、品牌、精确型号、来源编号、语言及适用限制。

- 01_通用原理：1 份通用示例，8 个主题。
- 02_机型手册：中联 PL 系列、纽荷兰 WORKMASTER 25、久保田 LX2620 / LX2620SU，3 份资料，每份 8 条选摘。
- 00_说明：维护记录，不参与诊断检索。
- scripts/sync-knowledge.mjs：依据清单生成 lib/knowledge.json。

当前为 4 份资料、42 个片段、32 个可浏览主题。来源说明和未整理事项保留，但不作为故障主题返回。通用条目保留原数字链接，手册条目使用 ZL-PL / NH-WM25 / KB-LX2620 编号，重排文件不会改变链接。

## 适用规则

知识库页面可搜索全部资料，并按来源与部件分类浏览。诊断中未提供型号只返回通用示例；提供型号只检索精确匹配的手册。品牌冲突或未知型号返回资料不足。WORKMASTER 25S 不匹配 WORKMASTER 25；PL2304(G4) 不直接匹配 PL 系列汇编。序列号、市场和选装配置仍需逐车核对。

不同机型的过热流程不能合并为通用流程。每个片段携带所属文档的来源、版本、适用限制和完整证据。英文界面翻译导航与条目标题，中文整理原文标明语言，不作为授权英文译本。

## 更新和检查

保留原始 PDF → 对照页码整理 Markdown → 登记 catalog.json → pnpm knowledge:sync → node scripts/check-knowledge.mjs → pnpm typecheck → 构建、发布。

检查覆盖条目编号、动态统计、机型隔离、证据页码、非法请求和英文反馈。真实模型调用需要服务端密钥；离线检查不代表已验证远程模型。

## 数据与部署

| 数据 | 位置 |
| --- | --- |
| 新版源码、整理原文、收录清单 | GitHub Changjie29/AgriDx-v2 的 sites/model-performance-20260929 分支 |
| 原始 PDF | GitHub main 的知识库目录，保持原件 |
| 知识索引 | lib/knowledge.json，随网站构建打包 |
| 对话历史 | 当前浏览器，不跨设备同步 |
| 密钥 | 托管服务端环境变量，不进入 Git |

线上采用 Vinext / Cloudflare Workers，不需要旧版 Express 服务。GitHub 源码同步和 Sites 发布分别验证；推送源码不会自动发布网站。

## 当前边界

D1、R2 未启用；db/、drizzle/、examples/d1/ 是保留示例。现有检索是关键词检索，不是向量数据库。限频仅在 Worker 实例内有效。传感器、声学、视觉、CAN、仿真、跨设备对话与自动 PDF 解析尚未实现。
