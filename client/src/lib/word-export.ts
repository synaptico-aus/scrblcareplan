import JSZip from "jszip";
import { ExtractedFacts } from "@shared/schema";
import { createCarePlanDocumentHtml, sanitizeCarePlanHtml } from "@/lib/document-output";
import { escapeText, readCarePlanDocument } from "@shared/care-plan-document";
import { prepareWordLayout } from "./word-layout";

/** Kept as a compatibility export for any remaining client-side callers. */
export { escapeText as escapeHtml } from "@shared/care-plan-document";

function safeFilenamePart(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() || "care-plan";
}

export function generateWordDocumentHtml(clientName: string, carePlanHtml: string): string {
  // This remains an editable HTML-based .doc file: text and tables are not flattened.
  const safeHtml = sanitizeCarePlanHtml(carePlanHtml);
  const html = createCarePlanDocumentHtml(`Care Plan Draft - ${clientName}`, safeHtml);
  const document = readCarePlanDocument(safeHtml);
  const support = document ? [document.metadata.organisationName, document.metadata.supportPhone, document.metadata.supportEmail].filter(Boolean).join(" · ") : "";
  const output = new DOMParser().parseFromString(html, "text/html");
  prepareWordLayout(output);
  output.documentElement.setAttribute("xmlns:w", "urn:schemas-microsoft-com:office:word");
  output.documentElement.setAttribute("xmlns:o", "urn:schemas-microsoft-com:office:office");
  // Match the PDF's A4 page, 16/14/24mm margins, identity header and footer.
  // Office fields remain live when the editable file is opened in Word.
  return `<!doctype html>${output.documentElement.outerHTML}`
    .replace("</head>", `<style>
      @page WordSection1 { size:210mm 297mm; margin:16mm 14mm 24mm; mso-header:careWordHeader; mso-footer:careWordFooter; mso-header-margin:7mm; mso-footer-margin:9mm; }
      div.WordSection1 { page:WordSection1; }
      body { margin:0; padding:0; background:white; font:10.5pt Arial,sans-serif; }
      p.MsoHeader,p.MsoFooter { margin:0; font:8pt Arial,sans-serif; color:#303538; }
    </style></head>`)
    .replace(/(<body[^>]*>)/, '$1<div class="WordSection1">')
    .replace("</body>", `</div><!--[if mso]>
      <div style="mso-element:header" id="careWordHeader"><p class="MsoHeader" style="tab-stops:right 182mm">${document ? `Full Name: ${escapeText(document.clientName)}<span style="mso-tab-count:1"> </span>DRAFT` : ""}</p></div>
      <div style="mso-element:footer" id="careWordFooter"><p class="MsoFooter" style="tab-stops:right 182mm">CONFIDENTIAL<span style="mso-tab-count:1"> </span>Page <span style="mso-field-code:PAGE">1</span> of <span style="mso-field-code:NUMPAGES">1</span>${support ? `<br>${escapeText(support)}` : ""}</p></div>
    <![endif]--></body>`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export only the care-plan document. Extracted facts remain in the separate
 * application panel and are intentionally not prepended to the editable file.
 */
export const exportToWord = (
  clientName: string,
  carePlanHtml: string,
  _extractedFacts?: ExtractedFacts | string | null,
): void => {
  const wordHtml = generateWordDocumentHtml(clientName, carePlanHtml);
  const filename = `${safeFilenamePart(clientName)}-${new Date().toISOString().slice(0, 10)}.doc`;
  downloadBlob(new Blob([wordHtml], { type: "application/msword;charset=utf-8" }), filename);
};

export const exportAllToZip = async (
  plans: Array<{
    id: string;
    clientName: string;
    name: string;
    html: string;
    extractedFacts: ExtractedFacts | string | null;
    saveDate: string;
  }>,
): Promise<void> => {
  if (plans.length === 0) throw new Error("No plans to export");
  const zip = new JSZip();

  plans.forEach((plan) => {
    const wordHtml = generateWordDocumentHtml(plan.clientName, plan.html);
    const date = new Date(plan.saveDate).toISOString().slice(0, 10);
    const filename = `${safeFilenamePart(plan.clientName)}-${safeFilenamePart(plan.name)}-${date}-${safeFilenamePart(plan.id)}.doc`;
    zip.file(filename, wordHtml);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `care-plans-export-${new Date().toISOString().slice(0, 10)}.zip`);
};
