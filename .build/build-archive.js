#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const BASE = "https://aihot.virxact.com";
const ROOT = path.resolve(__dirname, "..");
const TPL = path.resolve(__dirname, "template.html");
const ARCHIVE = path.join(ROOT, "archive");
const RECORDS = path.join(ROOT, "records");
fs.mkdirSync(ARCHIVE, { recursive: true });
fs.mkdirSync(RECORDS, { recursive: true });

// local date (Asia/Shanghai)
function dateStr(d) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function shift(d, days) { const x = new Date(d); x.setDate(x.getDate() - days); return x; }

async function getJSON(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

function buildHTML(env) {
  let tpl = fs.readFileSync(TPL, "utf8");
  if (!tpl.includes("__DATA__")) throw new Error("template missing __DATA__");
  const json = JSON.stringify(env).replace(/</g, "\\u003c");
  const out = tpl.replace("__DATA__", json);
  if (out.includes("__DATA__")) throw new Error("placeholder not replaced");
  return out;
}

function sectionStats(data) {
  const secs = (data.sections || []).map(s => ({ label: s.label || "(未命名)", count: Array.isArray(s.items) ? s.items.length : 0 }));
  const total = secs.reduce((a, s) => a + s.count, 0);
  return { secs, total };
}

const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
function weekday(str) { const p = String(str).split("-").map(Number); return WEEK[new Date(p[0], p[1] - 1, p[2]).getDay()]; }

async function main() {
  const today = new Date();
  const todayStr = dateStr(today);
  const N = 10;
  const dates = [];
  for (let i = N - 1; i >= 0; i--) dates.push(dateStr(shift(today, i)));

  const records = [];
  for (const date of dates) {
    let data = null;
    try {
      data = await getJSON(`${BASE}/api/public/daily/${date}`);
      const { total } = sectionStats(data);
      if (!data || total === 0) throw new Error("empty");
    } catch (e) {
      console.log(`[skip] ${date}: ${e.message}`);
      records.push({ date, weekday: weekday(date), available: false });
      continue;
    }
    const env = { source: data, isToday: date === todayStr, usedDate: data.date || date, fallback: false, fetchedAt: new Date().toISOString() };
    const html = buildHTML(env);
    const file = path.join(ARCHIVE, `ai-daily-${date}.html`);
    fs.writeFileSync(file, html, "utf8");
    const { secs, total } = sectionStats(data);
    console.log(`[ok] ${date}: ${total} 条 -> archive/ai-daily-${date}.html`);
    records.push({ date, weekday: weekday(date), available: true, total, sections: secs, file: `archive/ai-daily-${date}.html` });
  }

  // today's dashboard is the main page (copy to root index)
  const todays = records.find(r => r.date === todayStr && r.available);
  if (todays) {
    const src = path.join(ARCHIVE, `ai-daily-${todayStr}.html`);
    fs.copyFileSync(src, path.join(ROOT, "ai-daily-dashboard.html"));
    console.log(`[ok] refreshed root ai-daily-dashboard.html (${todayStr})`);
  }

  // records.json
  fs.writeFileSync(path.join(RECORDS, "records.json"), JSON.stringify({ generatedAt: new Date().toISOString(), days: records }, null, 2), "utf8");

  // records.md
  const avail = records.filter(r => r.available);
  const totalAll = avail.reduce((a, r) => a + r.total, 0);
  let md = `# AI 日报 · 近 10 天记录\n\n`;
  md += `> 自动生成于 ${new Date().toISOString().replace("T", " ").slice(0, 16)} · 数据源：AI HOT（aihot.virxact.com）\n\n`;
  md += `**统计**：近 10 天共 ${records.length} 天，其中 ${avail.length} 天有收录，累计 ${totalAll} 条。\n\n`;
  md += `| 日期 | 星期 | 总条数 | 模型 | 产品 | 行业 | 论文 | 观点 | 页面 |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of records) {
    if (!r.available) { md += `| ${r.date} | ${r.weekday} | — | — | — | — | — | — | 未收录 |\n`; continue; }
    const m = {}; r.sections.forEach(s => { m[s.label] = s.count; });
    const f = (k) => (m[k] != null ? m[k] : "—");
    md += `| ${r.date} | ${r.weekday} | ${r.total} | ${f("模型发布/更新")} | ${f("产品发布/更新")} | ${f("行业动态")} | ${f("论文研究")} | ${f("技巧与观点")} | [查看](archive/ai-daily-${r.date}.html) |\n`;
  }
  fs.writeFileSync(path.join(RECORDS, "records.md"), md, "utf8");
  console.log(`[done] records: ${avail.length}/${records.length} days available, ${totalAll} items total`);
}

main().catch(e => { console.error("[fatal]", e); process.exit(1); });
