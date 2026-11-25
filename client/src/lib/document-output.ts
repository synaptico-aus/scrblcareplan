import DOMPurify from "dompurify";
import {
  carePlanCss,
  carePlanFooterCss,
  escapeText,
  readCarePlanDocument,
  renderCarePlanDocument,
} from "@shared/care-plan-document";

/**
 * Marked care-plan payloads are validated and rendered from the canonical
 * document model. Unmarked legacy HTML remains supported, but is always
 * sanitized before it reaches the browser or an exported file.
 */
export function sanitizeCarePlanHtml(html: string): string {
  const sanitized = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  const document = readCarePlanDocument(sanitized);
  return DOMPurify.sanitize(
    document ? renderCarePlanDocument(document) : sanitized,
    { USE_PROFILES: { html: true } },
  );
}

const pageOutputCss = `
  html { background: #fff; }
  body {
    margin: 0;
    color: #272725;
    background: #fff;
    font-family: Calibri, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.48;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .care-plan-document, .care-template { max-width: none; margin: 0 auto; }
  .care-plan-document table, .care-template table { width: 100%; border-collapse: collapse; }
  .care-plan-document tr, .care-template tr { break-inside: avoid; page-break-inside: avoid; }
  .care-plan-document thead, .care-template thead { display: table-header-group; }
  .care-plan-document h1, .care-plan-document h2, .care-plan-document h3,
  .care-template h1, .care-template h2, .care-template h3 {
    break-after: avoid-page;
    page-break-after: avoid;
  }
  .care-plan-document img, .care-template img { max-width: 100%; height: auto; }
  @media screen {
    body { padding: 24px; background: #f4f0e9; }
    .care-plan-document, .care-template {
      max-width: 210mm;
      min-height: 250mm;
      padding: 18mm 16mm;
      box-sizing: border-box;
      background: #fff;
      box-shadow: 0 12px 36px rgba(53, 43, 32, .12);
    }
  }
  @media print {
    html, body { margin: 0; padding: 0; background: #fff; }
    .care-plan-document, .care-template { max-width: none; min-height: 0; padding: 0; box-shadow: none; }
  }
`;

export function createCarePlanDocumentHtml(title: string, html: string): string {
  const safeHtml = sanitizeCarePlanHtml(html);
  return `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeText(title)}</title>
    <style>${carePlanCss}\n${carePlanFooterCss(readCarePlanDocument(safeHtml))}\n${pageOutputCss}</style>
  </head>
  <body><main class="care-plan-document">${safeHtml}</main></body>
</html>`;
}

export function printCarePlanDocument(title: string, html: string): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  let didPrint = false;
  const print = () => {
    if (didPrint || printWindow.closed) return;
    didPrint = true;
    printWindow.focus();
    printWindow.print();
  };
  printWindow.document.open();
  printWindow.document.write(createCarePlanDocumentHtml(title, html));
  printWindow.document.close();
  printWindow.addEventListener("load", print, { once: true });
  // document.write windows may already be complete when the load listener is attached.
  window.setTimeout(print, 500);
  return true;
}

export function downloadCarePlanPdf(title: string, html: string): boolean {
  // Native print-to-PDF avoids rasterizing tall documents and keeps text selectable.
  return printCarePlanDocument(title, html);
}
