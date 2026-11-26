import React from "react";
import { createRoot } from "react-dom/client";
import { CarePlanPreview } from "../client/src/components/CarePlanPreview";
import { createCarePlanDocumentHtml, sanitizeCarePlanHtml } from "../client/src/lib/document-output";
import { generateWordDocumentHtml, exportToWord, exportAllToZip } from "../client/src/lib/word-export";
import { readCarePlanDocument } from "../shared/care-plan-document";
import { representativeCarePlan } from "./care-plan-fixture";
import JSZip from "jszip";
import SavedPlans from "../client/src/pages/saved-plans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TokenUsageSettings } from "../client/src/components/TokenUsageSettings";

async function run() {
  const { html } = representativeCarePlan();
  const saved = JSON.parse(JSON.stringify({ html })).html;
  const safe = sanitizeCarePlanHtml(saved);
  const word = generateWordDocumentHtml("Alex Example", safe);
  const parsed = new DOMParser().parseFromString(word, "text/html");
  const canonical = new DOMParser().parseFromString(safe, "text/html");
  if (parsed.querySelector("main,article,section")) throw Error("Word importer needs compatible block elements");
  const wordTitle = parsed.querySelector<HTMLElement>(".care-template h1")!;
  if (wordTitle.style.color !== "rgb(232, 140, 66)" || wordTitle.style.fontSize !== "25pt") throw Error("Word title must match PDF typography and colour");
  if (parsed.querySelector<HTMLElement>(".field-grid td")!.style.borderTopColor !== "rgb(239, 184, 94)") throw Error("Word lost PDF field borders");
  if (parsed.querySelector<HTMLElement>(".clinical-table th")!.getAttribute("bgcolor") !== "#f4eee8") throw Error("Word lost PDF table header shading");
  if (!parsed.querySelector("thead tr")!.getAttribute("style")?.includes("mso-header-row:yes")) throw Error("Word table headings must repeat");
  if (parsed.querySelector(".care-footer")) throw Error("Word should use its repeating footer, not a duplicate body footer");
  if (!word.includes("margin:16mm 14mm 24mm") || !word.includes('mso-element:header') || !word.includes("Full Name: Alex Example") || !word.includes("mso-field-code:NUMPAGES")) throw Error("Word page setup, identity header or page fields differ from PDF");
  if (parsed.querySelectorAll("table").length !== canonical.querySelectorAll("table").length) throw Error("Word lost PDF tables");
  if (Array.from(parsed.querySelectorAll("h1,h2,h3")).map(e => e.textContent).join("|") !== Array.from(canonical.querySelectorAll("h1,h2,h3")).map(e => e.textContent).join("|")) throw Error("Word changed PDF section order");
  const headings = Array.from(parsed.querySelectorAll("h1,h2,h3")).map(e => e.textContent);
  if (!headings.includes("Transcript Summary – Alex Example") || !headings.includes("Dignity of Risk Assessment")) throw Error("Missing appendices in Word");
  if (parsed.body.querySelectorAll("table").length < 5 || parsed.body.querySelector("iframe,img")) throw Error("Word must contain editable tables and text, not images");
  const paragraph = parsed.body.querySelector("p")!;
  paragraph.textContent = "Edited paragraph";
  parsed.body.querySelector("td")!.textContent = "Edited cell";
  const added = parsed.createElement("p");
  added.textContent = "New information added after download";
  parsed.body.append(added);
  if (!parsed.body.textContent?.includes("Edited cell") || !parsed.body.textContent?.includes("New information")) throw Error("HTML not editable");
  const hostile = '<h1>Historical plan</h1><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><p>Transcript Summary – Legacy</p><p>Dignity of Risk Assessment</p>';
  for (const output of [sanitizeCarePlanHtml(hostile), createCarePlanDocumentHtml("Legacy", hostile), generateWordDocumentHtml("Legacy", hostile)]) {
    const body = new DOMParser().parseFromString(output, "text/html");
    if (body.querySelector("script,[onerror],[href^='javascript:']")) throw Error("Unsafe legacy output");
    if (!body.body.textContent?.includes("Dignity of Risk Assessment")) throw Error("Lost historical content");
  }
  const blobs: Blob[] = [];
  const originalCreate = URL.createObjectURL;
  const originalClick = HTMLAnchorElement.prototype.click;
  URL.createObjectURL = (blob: Blob | MediaSource) => { blobs.push(blob as Blob); return "blob:test"; };
  HTMLAnchorElement.prototype.click = function() {};
  exportToWord("Alex Example", html);
  await exportAllToZip([{
    id: "one", clientName: "Alex Example", name: "Draft", html, extractedFacts: null, saveDate: "2026-11-25",
  }, { id: "two", clientName: "Alex Example", name: "Draft", html: hostile, extractedFacts: null, saveDate: "2026-11-25" }]);
  const single = await blobs[0].text();
  const zip = await JSZip.loadAsync(await blobs[1].arrayBuffer());
  if (Object.keys(zip.files).length !== 2) throw Error("Duplicate bulk filenames lost a document");
  for (const file of Object.values(zip.files)) {
    const text = await file.async("text");
    if (!text.includes("Transcript Summary") || !text.includes("Dignity of Risk Assessment")) throw Error("Missing bulk appendices");
    if (text.includes("Extracted Facts Summary") || text.includes("SCRBL 2.0")) throw Error("Unwanted cover");
  }
  URL.createObjectURL = originalCreate;
  HTMLAnchorElement.prototype.click = originalClick;
  const root = createRoot(document.getElementById("root")!);
  root.render(<CarePlanPreview html={saved} clientName="Alex Example" extractedFacts={null} isLoading={false} generationStartTime={null} generationTime={null} onPrint={() => {}} />);
  (window as any).carePlanTest = {
    success: true, canonical: safe, printHtml: createCarePlanDocumentHtml("Alex Example", safe), word: single,
    goalCount: readCarePlanDocument(safe)?.content.goals.length, zipFiles: Object.keys(zip.files),
  };
  (window as any).showSavedPlanTest = () => {
    // Standalone component test, not an application authentication bypass.
    window.fetch = async (url) => new Response(JSON.stringify(String(url) === "/api/saved-care-plans" ? [{
      id: "synthetic", clientName: "Alex Example", name: "Saved synthetic draft", html: saved, extractedFacts: null,
      saveDate: "2026-11-25", createdAt: "2026-11-25", organisationId: "synthetic",
    }] : []), { headers: { "Content-Type": "application/json" } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root.render(<QueryClientProvider client={queryClient}><SavedPlans /></QueryClientProvider>);
  };
  (window as any).showTokenUsageTest = (mode: string) => {
    const row = {
      generationId: "synthetic-generation", startedAt: "2026-11-26T08:00:00Z", model: "gpt-6.2-sol",
      calls: 3, failedCalls: 0, unreportedCalls: mode === "incomplete" ? 1 : 0,
      inputTokens: 10000, cachedTokens: 2000, outputTokens: 5000, reasoningTokens: 3000,
      estimatedUsd: mode === "incomplete" ? null : .0662,
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: {
      retry: false, queryFn: async () => {
        if (mode === "error") throw Error("Synthetic usage service unavailable");
        if (mode === "loading") return new Promise(() => {});
        return {days:30,totals: mode === "empty" ? {...row,calls:0,inputTokens:0,cachedTokens:0,outputTokens:0,reasoningTokens:0,estimatedUsd:0} : row,
          recent:mode === "empty" ? [] : [row]};
      },
    } } });
    root.render(<QueryClientProvider key={mode} client={queryClient}><TokenUsageSettings /></QueryClientProvider>);
  };
}
run().catch(error => { (window as any).carePlanTest = { success: false, error: String(error), stack: error.stack }; });
