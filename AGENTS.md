# 本项目的维护约定

## 用户已指定的仓库

- 本项目为「司农智机 · SRT27」新版网站。
- 新版源码同步到 `https://github.com/Changjie29/AgriDx-v2` 的 `sites/model-performance-20260929` 分支。`main` 保留旧版 Vite/Express 与原始说明书，不能整体覆盖。
- `Changjie29/SRT27` 是参考项目，不是本站默认写入目标。
- 保留当前 Sites 项目身份与访问范围；`.openai/hosting.json` 不应因为 GitHub 同步而重新生成。

## 修改与交付

1. 在编辑前打开现有 Sites 源码，并获取 GitHub 新版分支的最新状态。检查已有修改；如有分叉，保留双方提交并合并，不强推。
2. GitHub 克隆通常使用 `origin`；Sites 工作区可使用 `github`。先核对远端地址，不能因名称相同就假定目标正确。
3. 每次完成用户要求的本站更新后，提交并推送到指定 GitHub 仓库，再核对远端提交。仅把 URL 写入文档或添加 remote 不算同步成功。
4. 按 Sites 工作流发布需要上线的改动。源码同步与部署分别核验，不将其中一个的成功当作另一个的成功。
5. 缺少 GitHub 连接、推送失败或远端有新改动时，保留已准备的源码和提交，明确告知尚未同步，不宣称完成。
6. 后续按本约定执行维护；不得把约定描述成已安装的自动同步任务。

## 目录与验证

- 知识原文位于 `server/knowledge/`；编辑原文后运行 `pnpm knowledge:sync`，将 `lib/knowledge.json` 一起提交。
- 新资料须登记 `server/knowledge/catalog.json`；运行 `node scripts/check-knowledge.mjs` 验证型号隔离与证据传递。英文品牌固定为 AgriDx。
- `server/knowledge/00_说明/` 只用于维护说明，不参与索引。
- 业务代码修改后运行 `pnpm typecheck`、`pnpm build`，并验证受影响功能。单纯文档整理无需重复业务测试。
- 保留现有锁文件、托管适配脚本和模型版权说明。
- 不提交 `.env`、`.dev.vars`、真实密钥、`node_modules`、`dist` 或 `*.tsbuildinfo`。
- 不编造知识库未提供的维修参数、概率或型号适配；资料不足须明确说明。
- 具体启动、目录和同步命令见 `README.md` 与 `docs/MAINTAINING.md`。
