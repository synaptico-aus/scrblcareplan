import JSZip from "jszip";
import { ExtractedFacts } from "@shared/schema";
import { createCarePlanDocumentHtml, sanitizeCarePlanHtml } from "@/lib/document-output";
import { escapeText, readCarePlanDocument } from "@shared/care-plan-document";

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
  // Word's HTML importer uses named page sections and Office footer fields.
  return html.replace("<html lang=", '<html xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:o="urn:schemas-microsoft-com:office:office" lang=')
    .replace("</head>", `<style>
      @page WordSection1 { size:595.3pt 841.9pt; margin:45pt 40pt 60pt; mso-footer:careWordFooter; }
      div.WordSection1 { page:WordSection1; }
      @media screen { body { padding:0; background:white; } .care-template,.care-plan-document { padding:0; min-height:0; box-shadow:none; } }
    </style></head>`)
    .replace("<body>", '<body><div class="WordSection1">')
    .replace("</body>", `</div><!--[if mso]><div style="mso-element:footer" id="careWordFooter"><p style="font-size:8pt;border-top:1pt solid #ed914d">CONFIDENTIAL ${escapeText(support)} · Page <span style="mso-field-code:PAGE">1</span> of <span style="mso-field-code:NUMPAGES">1</span></p></div><![endif]--></body>`);
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
