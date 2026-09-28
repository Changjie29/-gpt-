#!/bin/bash
# 云电脑端：自动拉取 GitHub 最新代码并重启服务
# 用法：crontab -e 加入  */2 * * * * /path/to/cloud-pull.sh
set -e

cd "$(dirname "$0")/.."

BEFORE=$(git rev-parse HEAD)
git pull --quiet origin main
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" != "$AFTER" ]; then
  echo "[$(date '+%F %T')] 代码更新: $BEFORE -> $AFTER"
  [ -f package-lock.json ] && npm install --silent 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  pkill -f "tsx watch" 2>/dev/null || true
  nohup npx vite > /tmp/srt-web.log 2>&1 &
  nohup npx tsx watch server/dev.ts > /tmp/srt-server.log 2>&1 &
  echo "服务已重启"
else
  echo "[$(date '+%F %T')] 已是最新"
fi
