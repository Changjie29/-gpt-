#!/bin/bash
# 一键同步到 GitHub：提交本地改动 → 拉取远端 → 推送
# 用法：在 SRT27 根目录执行  bash scripts/sync.sh
set -e

cd "$(dirname "$0")/.."

# 1) 暂存全部改动（含删除）
git add -A

# 2) 有改动才提交；无改动则跳过
if git diff --cached --quiet; then
  echo "[sync] 无改动，跳过提交"
else
  git commit -m "自动同步 $(date '+%Y-%m-%d %H:%M:%S')"
  echo "[sync] 已提交"
fi

# 3) 先拉取远端（rebase 保持线性历史），再推送
git pull --rebase origin main
git push origin main
echo "[sync] 已同步到 GitHub (main)"
