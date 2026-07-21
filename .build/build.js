#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const BASE = "https://aihot.virxact.com";
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

async function main() {
  const today = todayStr();
  let usedDate = today, fallback = false, data = null;

  try {
    data = await getJSON(`${BASE}/api/public/daily/${today}`);
    const sections = data && Array.isArray(data.sections) ? data.sections : [];
    const total = sections.reduce((a, s) => a + (Array.isArray(s.items) ? s.items.length : 0), 0);
    if (!data || total === 0) throw new Error("today empty");
    console.log(`[ok] today ${today} -> ${total} items`);
  } catch (e) {
    console.log(`[warn] today ${today} unavailable (${e.message}); falling back to latest`);
    data = await getJSON(`${BASE}/api/public/daily`);
    usedDate = data.date || today;
    fallback = true;
    const sections = data && Array.isArray(data.sections) ? data.sections : [];
    const total = sections.reduce((a, s) => a + (Array.isArray(s.items) ? s.items.length : 0), 0);
    console.log(`[ok] latest ${usedDate} -> ${total} items`);
  }

  const env = {
    source: data,
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
  console.log(`[stats] date=${usedDate} fallback=${fallback} total=${env.isToday ? "" : "(latest) "}${(check.source.sections||[]).reduce((a,s)=>a+(s.items||[]).length,0)}`);
  console.log(`[stats] sections: ${secs}`);
}

main().catch(e => { console.error("[fatal]", e); process.exit(1); });
