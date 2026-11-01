#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
// 2026-10-31 起 aihot 迁移：aihot.virxact.com -> aihot.news，接口 /api/public/daily -> /api/v1/dailies
const BASE = "https://aihot.news";
const OUT = path.resolve(__dirname, "..", "ai-daily-dashboard.html");
const TPL = path.resolve(__dirname, "template.html");

function todayStr() {
  // local date in Asia/Shanghai (user is in Zhuzhou, UTC+8)
  const f = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(new Date()); // YYYY-MM-DD
}

async function getJSON(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
  return r.json();
}

// 新接口把数据包进 report 对象，且 item 字段名与旧版不同。
// 这里统一解包并把新字段映射回 template 期望的形状（sourceName / sourceUrl / permalink）。
function normalize(raw) {
  const report = (raw && raw.report) ? raw.report : raw;
  if (report && Array.isArray(report.sections)) {
    report.sections.forEach(s => {
      if (Array.isArray(s.items)) s.items.forEach(it => {
        if (!it) return;
        if (it.source && it.source.name && !it.sourceName) it.sourceName = it.source.name;
        if (it.links && it.links.original && !it.sourceUrl) it.sourceUrl = it.links.original;
        if (it.links && it.links.aihot && !it.permalink) it.permalink = it.links.aihot;
      });
    });
  }
  return report;
}

function totalOf(report) {
  const secs = (report && Array.isArray(report.sections)) ? report.sections : [];
  return secs.reduce((a, s) => a + (Array.isArray(s.items) ? s.items.length : 0), 0);
}

async function main() {
  const today = todayStr();
  let usedDate = today, fallback = false, report = null;

  try {
    const data = await getJSON(`${BASE}/api/v1/dailies/${today}`);
    report = normalize(data);
    const total = totalOf(report);
    if (!report || total === 0) throw new Error("today empty");
    console.log(`[ok] today ${today} -> ${total} items`);
  } catch (e) {
    console.log(`[warn] today ${today} unavailable (${e.message}); falling back to latest`);
    const data = await getJSON(`${BASE}/api/v1/dailies/latest`);
    report = normalize(data);
    usedDate = report.date || today;
    fallback = true;
    const total = totalOf(report);
    console.log(`[ok] latest ${usedDate} -> ${total} items`);
  }

  const env = {
    source: report,
    isToday: usedDate === today,
    usedDate: usedDate,
    fallback: fallback,
    fetchedAt: new Date().toISOString()
  };

  let tpl = fs.readFileSync(TPL, "utf8");
  const json = JSON.stringify(env).replace(/</g, "\\u003c");
  if (!tpl.includes("__DATA__")) throw new Error("template missing __DATA__ placeholder");
  const out = tpl.replace("__DATA__", json);
  if (out.includes("__DATA__")) throw new Error("placeholder not replaced");
  fs.writeFileSync(OUT, out, "utf8");

  // validate
  const check = JSON.parse(json);
  const secs = (check.source.sections || []).map(s => `${s.label}:${(s.items || []).length}`).join(", ");
  console.log(`[done] wrote ${OUT}`);
  console.log(`[stats] date=${usedDate} fallback=${fallback} total=${env.isToday ? "" : "(latest) "}${totalOf(check.source)}`);
  console.log(`[stats] sections: ${secs}`);
}

main().catch(e => { console.error("[fatal]", e); process.exit(1); });
