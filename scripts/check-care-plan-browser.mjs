import { build } from "esbuild";
import { spawn } from "node:child_process";
import { writeFile, mkdir, readdir, access, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import WebSocket from "ws";
import assert from "node:assert/strict";

const out = resolve("generated-artifacts");
await mkdir(out, { recursive: true });
await build({ entryPoints: ["tests/care-plan-browser-entry.tsx"], outfile: `${out}/care-plan-browser.js`, bundle: true, platform: "browser", format: "iife", jsx: "automatic" });
// Reuse compiled application styles when available without requiring a build
// for the functional export checks (the fixture also runs on fresh checkouts).
let appCss = "";
try {
  const cssFile = (await readdir(resolve("dist/public/assets"))).find(name=>name.endsWith(".css"));
  if (cssFile) appCss = await readFile(resolve("dist/public/assets", cssFile), "utf8");
} catch { console.warn("Built app styles unavailable; browser fixture will run without visual styling."); }
await writeFile(`${out}/care-plan-browser.html`, `<!doctype html><html><head><meta charset="utf-8"><style>${appCss}</style></head><body style="margin:24px;background:#eee"><div id="root"></div><script src="care-plan-browser.js"></script></body></html>`);
let executable = process.argv[2];
if (!executable) {
  // Use a modern installed browser: CSS print margin boxes require Chromium 131+.
  try {
    const candidates = (await readdir("/nix/store")).filter(name => name.includes("playwright-chromium"));
    for (const name of candidates) {
      const path = `/nix/store/${name}/chrome-linux/chrome`;
      try { await access(path); executable = path; break; } catch {}
    }
  } catch {}
}
const browser = spawn(executable || "chromium", ["--headless", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=9223", `--user-data-dir=${out}/chromium-profile`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
let browserErrors = "";
browser.stderr.on("data", chunk => { browserErrors = (browserErrors + chunk).slice(-4000); });
let ws;
try {
  let pages;
  for (let i = 0; i < 200; i++) {
    try { pages = await (await fetch("http://127.0.0.1:9223/json")).json(); if (pages.length) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  if (!pages?.length) throw Error(`Chromium did not start: ${browserErrors}`);
  ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise(r => ws.once("open", r));
  let seq = 0;
  const pending = new Map();
  ws.on("message", raw => {
    const data = JSON.parse(raw);
    if (data.id) {
      const { resolve, reject } = pending.get(data.id) || {};
      pending.delete(data.id);
      data.error ? reject?.(Error(JSON.stringify(data.error))) : resolve?.(data.result);
    }
  });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1100, height: 1500, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: `file://${out}/care-plan-browser.html` });
  let result;
  for (let i = 0; i < 100; i++) {
    result = await evaluate("window.carePlanTest");
    if (result) break;
    await new Promise(r => setTimeout(r, 100));
  }
  assert.equal(result?.success, true, JSON.stringify(result));
  assert.equal(result.goalCount, 21);
  await new Promise(r => setTimeout(r, 100));
  const ui = await evaluate(`document.querySelector('[data-testid="care-plan-content"]')?.innerText`);
  assert.ok(ui?.includes("Dignity of Risk Assessment"), "Actual new-plan preview lost appendices");
  await evaluate("window.showSavedPlanTest()");
  const waitFor = async selector => {
    for (let i = 0; i < 80; i++) {
      if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return;
      await new Promise(r => setTimeout(r, 50));
    }
    throw Error(`Missing ${selector}`);
  };
  await waitFor('[data-testid="folder-alex-example"]');
  await evaluate(`document.querySelector('[data-testid="folder-alex-example"]').click()`);
  await waitFor('[data-testid="button-view-plan-synthetic"]');
  await evaluate(`document.querySelector('[data-testid="button-view-plan-synthetic"]').click()`);
  await waitFor('.care-template');
  assert.ok(await evaluate(`document.querySelector('.care-template').innerText.includes("Transcript Summary – Alex Example") && document.querySelector('.care-template').innerText.includes("Dignity of Risk Assessment")`), "Actual saved-plan preview lost appendices");
  for (const [mode, expected] of [
    ["populated", "5,000"], ["empty", "No token usage recorded yet"],
    ["error", "Synthetic usage service unavailable"], ["incomplete", "Unavailable"],
  ]) {
    await evaluate(`window.showTokenUsageTest(${JSON.stringify(mode)})`);
    for (let attempt = 0; attempt < 60; attempt++) {
      if (await evaluate(`document.body.innerText.includes(${JSON.stringify(expected)})`)) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(expected)})`), `Usage ${mode} state failed`);
  }
  await evaluate(`window.showTokenUsageTest("populated")`);
  await new Promise(resolve=>setTimeout(resolve,150));
  assert.ok(await evaluate(`document.body.innerText.includes("$0.0662")`), "Usage cost formatting failed");
  await writeFile(`${out}/token-usage-preview.png`, Buffer.from((await cdp("Page.captureScreenshot", { format:"png" })).data, "base64"));
  await evaluate(`window.showTokenUsageTest("loading")`);
  await waitFor('[aria-label="Loading token usage"]');
  await writeFile(`${out}/representative.doc`, result.word);
  await writeFile(`${out}/representative-word.html`, result.word);
  await cdp("Emulation.setEmulatedMedia", { media: "print" });
  await cdp("Page.navigate", { url: `file://${out}/representative-word.html` });
  await new Promise(r => setTimeout(r, 300));
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.care-template table')).filter(t => t.scrollWidth > t.clientWidth + 2).length`), 0, "Word export has clipped tables");
  const wordScreenshot = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(`${out}/representative-word-preview.png`, Buffer.from(wordScreenshot.data, "base64"));
  const layoutMetrics = `Array.from(document.querySelectorAll('.care-template h1,.care-template h2,.care-template h3,.care-template table')).map(element => {
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    return { tag:element.tagName, width:Math.round(rect.width), height:Math.round(rect.height), font:style.fontSize, color:style.color };
  })`;
  const wordMetrics = await evaluate(layoutMetrics);
  await writeFile(`${out}/representative.html`, result.printHtml);
  await cdp("Page.navigate", { url: `file://${out}/representative.html` });
  await new Promise(r => setTimeout(r, 300));
  assert.deepEqual(await evaluate(layoutMetrics), wordMetrics, "Word and PDF print layouts must share heading/table dimensions, fonts and colours");
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.care-template table')).filter(t => t.scrollWidth > t.clientWidth + 2).length`), 0, "Clipped tables");
  const screenshot = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(`${out}/representative-preview.png`, Buffer.from(screenshot.data, "base64"));
  const pdf = await cdp("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
  await writeFile(`${out}/representative.pdf`, Buffer.from(pdf.data, "base64"));
  const pdfText = execFileSync("pdftotext", ["-layout", `${out}/representative.pdf`, "-"], { encoding: "utf8" });
  const pdfPages = pdfText.split("\f").filter(page => page.trim());
  assert.ok(pdfPages.length > 3, "Fixture should exercise many pages");
  pdfPages.forEach((page, i) => {
    assert.ok(page.includes("CONFIDENTIAL"), `Missing confidentiality footer on page ${i + 1}`);
    assert.ok(page.includes("support@example.invalid"), `Missing support footer on page ${i + 1}`);
    assert.ok(page.includes(`Page ${i + 1} of ${pdfPages.length}`), `Missing page number on page ${i + 1}; use Chromium 131+`);
    assert.ok(page.includes("Full Name: Alex Example"), `Missing repeated client header on page ${i + 1}`);
  });
  const normalized = pdfText.replace(/\s+/g, " ");
  // PDF extraction interleaves neighbouring table cells at wrapped lines.
  assert.ok(normalized.includes("Evidence Sources") && normalized.includes("secondary source") &&
    normalized.includes("Original transcript") && /\brecorded\b/.test(normalized) && /\bspeech\b/.test(normalized),
    "PDF lost source provenance");
  assert.ok(result.word.includes("secondary source") && result.word.includes("recorded speech"), "Word lost source provenance");
  // Columns and repeated headers/footers can interrupt phrase order in PDF text
  // extraction. Count constituent words to detect lost text without that artefact.
  for (const word of ["familiar", "people", "instructions\\."]) {
    assert.equal((normalized.match(new RegExp(`\\b${word}`, "g")) || []).length, 180, `Long goal text lost ${word} across page breaks`);
  }
  for (let i = 1; i <= 21; i++) assert.ok(normalized.includes(`GOAL ${i}`), `Missing goal ${i}`);
  assert.ok(normalized.includes("Dignity of Risk Assessment") && normalized.includes("Transcript Summary"), "PDF lost appendices");
  console.log(JSON.stringify({ success: true, goals: result.goalCount, bulkFiles: result.zipFiles.length, outputs: "generated-artifacts/representative.{html,doc,pdf}", note: "Chromium HTML importer edit checks passed; Microsoft Word itself is not installed." }, null, 2));
} finally {
  ws?.close();
  browser.kill("SIGTERM");
}
