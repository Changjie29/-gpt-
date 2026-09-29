# agridx.xyz 国内托管交接

## 使用正确源码

仓库实际名称为 `Changjie29/AgriDx-v2`，原 `Changjie29/-gpt-` 地址会跳转到它。

请使用 `sites/model-performance-20260929` 分支。这是 agridx.xyz 当前 Sites 工作台版本及独立 Node 部署适配；`main` 是另一套 Vite/Express 项目，不能混用其构建命令。同步使用独立分支以保留双方完整历史。

当前模型为 `tractor-fast-v1.glb`（1,678,472 字节），预览为 `tractor-preview-v1.webp`。原模型与许可信息保留。详见 MODEL-PERFORMANCE.md。

## 已提供的独立服务器方式

保留现有 Sites/Vinext 构建命令，同时新增：

- `pnpm build:node`：Next.js 独立生产构建，不使用 Cloudflare 的远程托管。
- `pnpm start:node`：在 `127.0.0.1:3000` 运行生产服务，交给同机 Nginx/Caddy 转发。
- `next.config.ts` 仅在独立 Next.js 构建中将 `cloudflare:workers` 环境变量模块映射到 `lib/node-runtime-env.ts`；原 Sites 构建不变。

有 Node.js >=22.13.0、Git 的 Linux 服务器可执行：

```bash
npm install -g pnpm@11.25.0 --registry=https://registry.npmmirror.com
git clone --branch sites/model-performance-20260929 --single-branch https://github.com/Changjie29/AgriDx-v2.git agridx-site
cd agridx-site
pnpm install --frozen-lockfile --registry=https://registry.npmmirror.com
pnpm typecheck
pnpm build:node
pnpm start:node
```

最后一条是前台进程，调试时保持终端打开。正式运行应由国内 AI 根据服务器系统配置 systemd/PM2 或容器自动重启，并配置反向代理。国内服务器无法访问 GitHub 时，可下载该分支 ZIP 后上传服务器；不要让浏览器运行时依赖 GitHub。

模型、解码器和界面资源全部随站点部署。无需让访客访问 Sketchfab/GitHub 才能加载模型。不要把资产地址改为 chatgpt.site 或外部解码器 CDN。

## 诊断 API 与密钥

没有密钥时，API 返回明确标注的本地知识检索结果，网站仍可打开与使用。密钥只在服务端的 `.env.local` 或部署平台的密钥配置中保存，参考 `.env.example`，禁止提交或在前端注入。

国内部署优先使用部署服务器实际能访问的模型供应商。若选 DeepSeek，请设置 `LLM_PRIMARY=deepseek` 和真实可用的 `DEEPSEEK_MODEL`。样例默认模型名尚未经真实账户验证，不要当作已可用型号。只有已有有效 Key 时才能验证真实 AI 问答。

当前频率限制读取 `cf-connecting-ip`，普通 Node 服务器缺少此头时会共用 `local` 桶。国内 AI 需按可信反向代理接入真实客户端地址并防伪，不能直接相信公网传入的 IP 头。Nginx 应覆盖 `Host`、`X-Forwarded-Proto`、客户端地址，确保 API 的同源校验正常；不要用删除同源校验的方式修复 403。

## 托管与域名

用户目前仅购买阿里云域名，尚无已确认的服务器。购买域名不包含此 Node 服务的运行环境。

若主要服务国内用户，应选择合适的内地托管并完成所需备案；香港托管无需 ICP 备案，但跨境连接仍需实测。参考：

- https://help.aliyun.com/zh/icp-filing/basic-icp-service/user-guide/icp-filing-application-overview
- https://help.aliyun.com/zh/simple-application-server/product-overview/regions-and-network-connectivity
- https://nextjs.org/docs/app/guides/self-hosting

在新的托管目标上先完成网站、HTTPS 证书和 API 验证，再改 DNS。当前根域名 A 记录是 `162.159.143.30` 与 `172.66.3.26`，它们是旧 Sites 入口，迁移时应整体替换，不能与新服务器 IP 混放。若托管平台要求 CNAME，按其根域名支持方式设置。检查并移除不匹配的 AAAA 记录，避免 IPv6 用户继续到旧平台。

同时配置 `agridx.xyz` 和 `www.agridx.xyz` 的解析与证书，选定一个主域名并做 301 跳转。旧服务保持可用直到新服务验收通过。不得通过反向代理旧 chatgpt.site 来宣称完成迁移。

## 给国内 AI 的验收要求

1. 保留当前界面、功能、知识来源、压缩模型与作者许可；不重写产品。
2. 所有页面、模型、贴图、解码器、API 都从新的托管目标访问；页面不依赖 ChatGPT Sites 登录或分发。
3. HTTPS 证书正确，HTTP 跳转 HTTPS，域名直接访问与 `/roam` 刷新正常，API 同源请求无 403。
4. 检查移动与桌面、模型旋转/缩放、知识检索和诊断。没有密钥时验收知识模式，有密钥时另测真实模型调用。
5. 分别在关闭代理的国内宽带、国内手机流量，以及开启代理的网络下访问；每次确认首页、3D 模型和 API 的结果，而非仅 ping 或服务器内 curl。
6. 记录测试网络、时间、URL、状态码和失败原因，确认解析缓存更新。未完成双网络验收，不宣称“开不开代理都能打开”。

没有任何一次测试能够保证所有网络永远可达；目标是完成指定网络下可重复的访问验收与稳定运行配置。
