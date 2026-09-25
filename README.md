# 司农智机 · SRT27 重建站

根据 `https://github.com/Changjie29/SRT27` 的 main 分支提交 `ecfe85810971924bc75a9cb5b514650d5f5e6094` 独立重建，未修改原 GitHub 仓库。

## 页面

- `/` 农机工作台：真实模型、故障快捷入口、知识主题。
- `/diagnosis` 农机信息、结构化问答、可追溯资料、当前浏览器内的对话历史。
- `/roam` 原项目 `tractor.glb`：拖拽旋转、缩放、平移、视角切换、自动旋转和全屏。
- `/knowledge` 关键词搜索、主题筛选、原文侧栏及来源。
- `/architecture` 真实分层与尚未实现的研究方向。

## 架构

React + TypeScript 界面 → 服务端 `/api/chat` → Markdown 章节检索 → 后端提示词 → Gemini / DeepSeek → 回答与知识来源。

网站采用 Vinext / Cloudflare Workers，取代原项目常驻的 Express 进程。保留 Three.js 实体模型，使用 RoomEnvironment，模型不依赖第三方 HDR 或图片资源。

知识源在 `server/knowledge/`。当前保留仓库的 1 份示例资料、8 个知识主题以及包含概述的 9 个索引片段。运行 `pnpm knowledge:sync` 更新 `lib/knowledge.json`；构建时也会同步。检索按中文二元词组与英文关键词计算重叠分，标题权重 3，正文 1，最多返回 6 条。少量英文常用故障词映射到中文主题，不使用向量库。

## AI 配置

本项目不包含任何真实密钥。部署后在网站的服务端环境变量中设置以下字段，不要放在浏览器、聊天记录、源代码或公开配置中：

- `GEMINI_API_KEY` / `DEEPSEEK_API_KEY`：至少一个。
- `GEMINI_MODEL` / `DEEPSEEK_MODEL`：可选；默认沿用参考仓库声明，必须用服务商账户实际可用的模型验证。
- `LLM_PRIMARY`：`gemini`（默认）或 `deepseek`。

无密钥时 `/api/chat` 返回明确标注的**知识库检索原文**，不宣称调用了 AI。资料未命中时明确提示「当前知识库资料不足」。配置模型后请求超时为 20 秒，失败会尝试另一个已配置提供商，最终失败返回脱敏的 502。在线推理需要实际密钥验证，本次未进行真实模型调用。

提示词只由服务端生成。用户消息仅允许 user / assistant；限制请求大小、消息数和每个实例内的调用频率。密钥只用于服务端外部请求。示例资料内的数值不是任何指定机型的维修标准；原文保留并明确标注资料性质。

## 本地开发

使用 Node.js 22+ 与本项目 pnpm 锁文件。安装依赖后 `pnpm dev`，构建 `pnpm build`，类型检查 `pnpm exec tsc --noEmit`。本地 `.env` 仅保留空值，已忽略。托管值通过 Sites 服务端环境变量配置。

## 范围

未实现的项目方向包括传感器、视觉、声学、CAN、有限元仿真、数字孪生、向量数据库和文件上传解析。没有模拟在线遥测、故障概率或虚构机型数据。

界面支持中英文、明暗主题、响应式布局。原始知识资料为中文；英文界面不会自动翻译或改变原始资料。对话记录只保存在当前浏览器，最多 12 个会话、每会话最近 30 条消息。

知识库页面在支持 WebMCP 的浏览器中注册 `search_sinong_knowledge`，复用页面搜索状态，不调用 AI。

## 模型版权与验证说明

`David Brown 25D tractor` 由 Lassi Kaukonen (thesidekick) 制作，CC BY 4.0。
来源：https://sketchfab.com/3d-models/david-brown-25d-tractor-85720bad20b341ec8508ddbc84f11795

`tractor-preview.png` 由原始 GLB 离线渲染而来，用于模型加载期间及 WebGL 不可用时的静态兜底，没有用生成图片替换原模型。预览环境禁用 WebGL，模型资源、材质和几何已经通过离线渲染核验；实时旋转缩放不能在本次浏览器环境中验证。

页面查询、问答检索、来源侧栏已进行浏览器验证。预览浏览器没有开放 document.modelContext，因此 WebMCP 执行验证不可用；不影响普通界面搜索。
