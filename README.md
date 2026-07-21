# AI 日报 · 每日晨报仪表盘

由 AI HOT（[aihot.virxact.com](https://aihot.virxact.com)）公开日报接口自动生成的**单文件 HTML 晨报仪表盘**。

- 🌐 在线访问：**https://sqqpolice.github.io/ai-daily-dashboard/**
- 📅 每期内容：模型发布/更新 · 产品发布/更新 · 行业动态 · 论文研究 · 技巧与观点（五版块、全局连续编号、Hero + 锚点导航 + 响应式卡片网格）
- 🗂 近 10 天归档：`archive/ai-daily-YYYY-MM-DD.html`
- 📊 10 天记录汇总：[`records/records.md`](records/records.md) / [`records/records.json`](records/records.json)

## 目录结构

```
index.html                 今日最新仪表盘（= ai-daily-dashboard.html）
ai-daily-dashboard.html   今日最新仪表盘（同 index.html）
archive/                  近 10 天每日 HTML 归档
records/records.md        10 天记录表（人话）
records/records.json      10 天记录（机器可读）
.build/                  构建脚本（build.js / build-archive.js / template.html）
```

## 本地预览

直接双击 `index.html` 即可在浏览器打开，数据已内嵌，**无需联网 / 无 CORS 依赖**。

## 数据来源

所有新闻条目来自 AI HOT 公开日报接口，按当日（`/api/public/daily/{date}`）拉取；若当日尚未生成则回退至最近一期。本仓库不做任何内容编造。
