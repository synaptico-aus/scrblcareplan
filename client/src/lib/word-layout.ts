/**
 * Word's HTML importer does not reliably retain semantic HTML or modern CSS.
 * Resolve our shared, non-screen styles to inline formatting before import.
 * PDF and Word therefore start from the same template rather than separate
 * copies of its colours, borders, typography and spacing.
 */
export function prepareWordLayout(document: Document): void {
  const officeStyle = (element: HTMLElement, css: string) =>
    element.setAttribute("style", `${element.getAttribute("style") ?? ""};${css}`);
  for (const style of Array.from(document.querySelectorAll("style"))) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(style.textContent ?? "");
    for (const rule of Array.from(sheet.cssRules)) {
      // Do not import the screen-only paper preview or CSS page margin boxes.
      if (!(rule instanceof CSSStyleRule)) continue;
      for (const element of Array.from(document.querySelectorAll<HTMLElement>(rule.selectorText))) {
        for (const property of Array.from(rule.style)) {
          element.style.setProperty(property, rule.style.getPropertyValue(property));
        }
      }
    }
    style.remove();
  }
  for (const element of Array.from(document.querySelectorAll<HTMLElement>("main,article,section"))) {
    const replacement = document.createElement("div");
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name !== "data-care-document") replacement.setAttribute(attribute.name, attribute.value);
    }
    replacement.append(...Array.from(element.childNodes));
    element.replaceWith(replacement);
  }
  document.querySelectorAll(".care-footer").forEach(element => element.remove());
  document.querySelectorAll<HTMLElement>("h1,h2,h3").forEach(element => {
    element.style.setProperty("page-break-after", "avoid");
    officeStyle(element, "mso-keep-next:yes");
  });
  document.querySelectorAll<HTMLTableElement>("table").forEach(table => {
    table.setAttribute("width", "100%");
    table.setAttribute("cellspacing", "0");
    table.setAttribute("cellpadding", "0");
    officeStyle(table, "mso-table-layout-alt:fixed;mso-padding-alt:7pt 5pt 7pt 5pt");
    for (const row of Array.from(table.rows)) {
      row.style.setProperty("page-break-inside", "avoid");
      if (row.parentElement?.tagName === "THEAD") officeStyle(row, "mso-header-row:yes");
      const columns = Array.from(row.cells).reduce((count, cell) => count + cell.colSpan, 0);
      for (const cell of Array.from(row.cells)) {
        const width = `${100 * cell.colSpan / columns}%`;
        cell.setAttribute("width", width);
        cell.style.width = width;
        if (cell.tagName === "TH") cell.setAttribute("bgcolor", "#f4eee8");
      }
    }
  });
  // Word does not reliably support white-space:pre-wrap. Preserve narrative
  // line breaks as editable HTML breaks instead.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  for (const node of textNodes) {
    if (!node.parentElement?.closest(".care-template") || !node.data.includes("\n")) continue;
    const fragment = document.createDocumentFragment();
    node.data.split(/\r\n|\r|\n/).forEach((line, index) => {
      if (index) fragment.append(document.createElement("br"));
      fragment.append(document.createTextNode(line));
    });
    node.replaceWith(fragment);
  }
}
