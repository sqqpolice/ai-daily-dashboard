#!/usr/bin/env bash
# AI 日报晨报 · 每日自动化部署
# 1) 重新生成今日单文件仪表盘（aihot 日报接口，回退最近一期）
# 2) 重建近 10 天归档 + records + history.json（站内历史切换用）
# 3) git commit + push 到 origin/main（GitHub Pages 自动发布）
set -u
cd "$(dirname "$0")/.." || exit 1
NODE="/c/Users/25589/.workbuddy/binaries/node/versions/22.22.2/node.exe"

echo "[1/3] build today's dashboard"
"$NODE" .build/build.js || { echo "[deploy] build.js failed"; exit 1; }

echo "[2/3] rebuild 10-day archive + records + history"
"$NODE" .build/build-archive.js || { echo "[deploy] build-archive.js failed"; exit 1; }
# keep the GitHub Pages entry (index.html) in sync with today's dashboard
cp ai-daily-dashboard.html index.html

echo "[3/3] git commit + push (GitHub Pages)"
if git diff --quiet && git diff --cached --quiet; then
  echo "[deploy] no changes, skip push"
  exit 0
fi
git add -A
git commit -q -m "AI 日报晨报: $(date +%Y-%m-%d) + 近10天归档/历史"
if git push origin main; then
  echo "[deploy] pushed -> https://sqqpolice.github.io/ai-daily-dashboard/"
else
  echo "[deploy] git push FAILED"
  exit 2
fi
