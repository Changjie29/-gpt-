# 更新与 GitHub 同步

## 维护目标

用户于 2026-09-26 指定：新版网站源码保存在 `https://github.com/Changjie29/-gpt-`，以后每次更新同步到这里。

- 分支：`main`。
- 网站：`https://srt27-sinong.z3464715478.chatgpt.site`。
- 参考项目：`Changjie29/SRT27`。本站更新不默认推送到参考项目。
- 不把密钥、依赖目录、构建结果或开发缓存加入提交。

## 每次更新

1. 打开当前网站源码，读取 `AGENTS.md`，检查本地修改，并获取 GitHub 最新提交。
2. 如果 GitHub 和网站源码各自存在新提交，先查看差异并合并；保留双方历史，不强制覆盖。
3. 修改所需文件。知识资料修改后生成索引；业务代码修改后完成类型检查、构建和必要的功能验证。
4. 检查提交内容并创建有明确说明的提交。
5. 推送到 GitHub 的 `main`，核对远端提交和本地提交一致。
6. 网站行为或资料发生变化时，继续完成 Sites 发布并确认成功。仅整理说明文档时按实际需要发布。
7. 分别说明 GitHub 同步和网站发布结果。任一步骤失败时，保留本地提交并明确说明未完成部分。

## 常用命令

在正常克隆的 GitHub 仓库中，默认远端名为 `origin`。更新前先查看差异和远端状态：

```bash
git status
git fetch origin
git log --oneline --left-right HEAD...origin/main
```

如果本地只落后于远端且工作区干净，可使用 `git merge --ff-only origin/main`。若双方都有提交，应检查后正常合并，不直接覆盖文件。

完成修改后：

```bash
pnpm knowledge:sync
pnpm typecheck
pnpm build
git diff --check
git diff --stat
git add -A
git diff --cached --stat
git commit -m "说明本次更新内容"
git push origin HEAD:main
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

最后两条命令显示的提交编号应一致。若只有文档调整，不需要重复运行业务构建。

在 Sites 的维护工作区中，本次新增的 GitHub 远端名为 `github`，上述 Git 命令将 `origin` 替换为 `github`。新的 Sites 工作区若没有此远端，可添加：

```bash
git remote add github https://github.com/Changjie29/-gpt-.git
```

不要覆盖指向其他服务的既有远端。`git push --force`、`git push --mirror` 不属于本项目的日常同步流程。

## GitHub 连接与发布

网页上能读取公开仓库不代表当前会话拥有写入权限。需要已经连接的 GitHub 账户或开发者自己配置好的 Git 凭证，才能推送。不要把令牌放进远端 URL、聊天、源码或提交。

当前没有配置 GitHub Actions 自动部署，也没有后台定时镜像任务。每次维护时执行以上同步流程；GitHub 源码推送成功不等于网站发布成功。

Sites 会保存网站自身的源码与部署版本。GitHub 是用户指定的源码维护仓库；两处更新应保持可追溯，不能用重新初始化仓库或清空历史来同步。
