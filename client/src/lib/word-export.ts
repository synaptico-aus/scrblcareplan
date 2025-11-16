import { ExtractedFacts } from "@shared/schema";
import JSZip from "jszip";

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Formats extracted facts into HTML for Word document export
 */
export const formatExtractedFactsForWord = (facts: ExtractedFacts | null): string => {
  if (!facts) return '';
  
  let html = '<div style="page-break-after: always;"><h1 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10pt; margin-bottom: 20pt;">Extracted Facts Summary</h1>';
  
  // Client Details
  if (facts.clientDetails.name || facts.clientDetails.language || facts.clientDetails.interpreterRequired !== undefined) {
    html += '<h2>Client Details</h2><table>';
    if (facts.clientDetails.name) html += `<tr><th style="width: 30%;">Name</th><td>${escapeHtml(facts.clientDetails.name)}</td></tr>`;
    if (facts.clientDetails.language) html += `<tr><th>Language</th><td>${escapeHtml(facts.clientDetails.language)}</td></tr>`;
    if (facts.clientDetails.interpreterRequired !== undefined) html += `<tr><th>Interpreter Required</th><td>${facts.clientDetails.interpreterRequired ? 'Yes' : 'No'}</td></tr>`;
    html += '</table>';
  }
  
  // Medical Information
  if (facts.medical.gp || facts.medical.pharmacy || facts.medical.medications || facts.medical.allergies || facts.medical.equipment) {
    html += '<h2>Medical Information</h2><table>';
    if (facts.medical.gp) html += `<tr><th style="width: 30%;">GP</th><td>${escapeHtml(facts.medical.gp)}</td></tr>`;
    if (facts.medical.pharmacy) html += `<tr><th>Pharmacy</th><td>${escapeHtml(facts.medical.pharmacy)}</td></tr>`;
    if (facts.medical.medications) html += `<tr><th>Medications</th><td>${escapeHtml(facts.medical.medications)}</td></tr>`;
    if (facts.medical.allergies) html += `<tr><th>Allergies</th><td>${escapeHtml(facts.medical.allergies)}</td></tr>`;
    if (facts.medical.equipment && facts.medical.equipment.length > 0) html += `<tr><th>Equipment</th><td>${escapeHtml(facts.medical.equipment.join(', '))}</td></tr>`;
    html += '</table>';
  }
  
  // Support Network
  if (facts.support.primaryContact || facts.support.secondaryContact || facts.support.livingArrangement) {
    html += '<h2>Support Network</h2><table>';
    if (facts.support.primaryContact) html += `<tr><th style="width: 30%;">Primary Contact</th><td>${escapeHtml(facts.support.primaryContact)}</td></tr>`;
    if (facts.support.secondaryContact) html += `<tr><th>Secondary Contact</th><td>${escapeHtml(facts.support.secondaryContact)}</td></tr>`;
    if (facts.support.livingArrangement) html += `<tr><th>Living Arrangement</th><td>${escapeHtml(facts.support.livingArrangement)}</td></tr>`;
    html += '</table>';
  }
  
  // Risk Assessment
  if (facts.risks && facts.risks.length > 0) {
    html += '<h2>Risk Assessment</h2>';
    html += '<table><thead><tr><th style="width: 25%;">Risk Category</th><th style="width: 15%;">Severity</th><th>Details</th></tr></thead><tbody>';
    facts.risks.forEach(risk => {
      const severity = risk.severity || 'medium';
      const severityColor = severity === 'high' ? '#dc2626' : severity === 'medium' ? '#ea580c' : '#16a34a';
      const severityBg = severity === 'high' ? '#fee2e2' : severity === 'medium' ? '#ffedd5' : '#dcfce7';
      html += `<tr>
        <td><strong>${escapeHtml(risk.type)}</strong></td>
        <td style="background-color: ${severityBg}; color: ${severityColor}; font-weight: bold; text-align: center;">${severity.toUpperCase()}</td>
        <td>${escapeHtml(risk.description)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
  }
  
  // Preferences
  if (facts.preferences && (facts.preferences.workerPreferences || facts.preferences.serviceDeliveryPreferences || facts.preferences.culturalConsiderations)) {
    html += '<h2>Preferences</h2><table>';
    if (facts.preferences.workerPreferences) html += `<tr><th style="width: 30%;">Worker Preferences</th><td>${escapeHtml(facts.preferences.workerPreferences)}</td></tr>`;
    if (facts.preferences.serviceDeliveryPreferences) html += `<tr><th>Service Delivery Preferences</th><td>${escapeHtml(facts.preferences.serviceDeliveryPreferences)}</td></tr>`;
    if (facts.preferences.culturalConsiderations) html += `<tr><th>Cultural Considerations</th><td>${escapeHtml(facts.preferences.culturalConsiderations)}</td></tr>`;
    html += '</table>';
  }
  
  html += '</div>';
  return html;
};

/**
 * Exports a care plan to a Word document with extracted facts summary
 * @param clientName - Name of the client for the filename
 * @param carePlanHtml - The main care plan HTML content (should already be sanitized)
 * @param extractedFacts - The extracted facts to include (can be object, JSON string, or null)
 */
export const exportToWord = (
  clientName: string,
  carePlanHtml: string,
  extractedFacts: ExtractedFacts | string | null
): void => {
  // Escape client name for filename safety
  const escapedClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  // Normalize extractedFacts - handle both JSON strings and objects
  let factsObject: ExtractedFacts | null = null;
  if (extractedFacts) {
    if (typeof extractedFacts === 'string') {
      try {
        factsObject = JSON.parse(extractedFacts) as ExtractedFacts;
      } catch (e) {
        console.error('Failed to parse extracted facts:', e);
        factsObject = null;
      }
    } else {
      factsObject = extractedFacts;
    }
  }
  
  // Generate extracted facts HTML
  const extractedFactsHtml = formatExtractedFactsForWord(factsObject);
  
  // Create a complete HTML document with Scrbl logo for Word
  const htmlWithLogo = `
    <html>
      <head>
        <title>Care Plan Draft - ${escapedClientName}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
          .logo-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ddd; }
          h1 { font-size: 18pt; font-weight: bold; margin-bottom: 12pt; text-align: center; }
          h2 { font-size: 14pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
          h3 { font-size: 12pt; font-weight: bold; margin-top: 6pt; margin-bottom: 3pt; }
          p { margin-bottom: 6pt; }
          table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
          th, td { border: 1px solid #000; padding: 6pt; text-align: left; vertical-align: top; }
          th { background-color: #f0f0f0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="logo-header">
          <h2>SCRBL 2.0 - AI Assisted Care Plan Drafts in Minutes</h2>
        </div>
        ${extractedFactsHtml}
        ${carePlanHtml}
      </body>
    </html>
  `;
  
  const blob = new Blob([htmlWithLogo], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${escapedClientName || 'care-plan'}-${new Date().toISOString().split('T')[0]}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates Word document HTML (internal helper)
 */
const generateWordDocumentHtml = (
  clientName: string,
  carePlanHtml: string,
  extractedFacts: ExtractedFacts | string | null
): string => {
  const escapedClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  // Normalize extractedFacts - handle both JSON strings and objects
  let factsObject: ExtractedFacts | null = null;
  if (extractedFacts) {
    if (typeof extractedFacts === 'string') {
      try {
        factsObject = JSON.parse(extractedFacts) as ExtractedFacts;
      } catch (e) {
        console.error('Failed to parse extracted facts:', e);
        factsObject = null;
      }
    } else {
      factsObject = extractedFacts;
    }
  }
  
  const extractedFactsHtml = formatExtractedFactsForWord(factsObject);
  
  return `
    <html>
      <head>
        <title>Care Plan Draft - ${escapedClientName}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
          .logo-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ddd; }
          h1 { font-size: 18pt; font-weight: bold; margin-bottom: 12pt; text-align: center; }
          h2 { font-size: 14pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
          h3 { font-size: 12pt; font-weight: bold; margin-top: 6pt; margin-bottom: 3pt; }
          p { margin-bottom: 6pt; }
          table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
          th, td { border: 1px solid #000; padding: 6pt; text-align: left; vertical-align: top; }
          th { background-color: #f0f0f0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="logo-header">
          <h2>SCRBL 2.0 - AI Assisted Care Plan Drafts in Minutes</h2>
        </div>
        ${extractedFactsHtml}
        ${carePlanHtml}
      </body>
    </html>
  `;
};

/**
 * Exports all care plans to a zip file containing individual Word documents
 */
export const exportAllToZip = async (
  plans: Array<{
    id: string;
    clientName: string;
    name: string;
    html: string;
    extractedFacts: ExtractedFacts | string | null;
    saveDate: string;
  }>
): Promise<void> => {
  if (plans.length === 0) {
    throw new Error('No plans to export');
  }

  const zip = new JSZip();
  
  // Add each plan as a Word document to the zip
  plans.forEach((plan) => {
    const wordHtml = generateWordDocumentHtml(
      plan.clientName,
      plan.html,
      plan.extractedFacts
    );
    
    // Create a safe filename
    const safeClientName = plan.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safePlanName = plan.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date(plan.saveDate).toISOString().split('T')[0];
    const filename = `${safeClientName}-${safePlanName}-${date}.doc`;
    
    // Add file to zip
    zip.file(filename, wordHtml);
  });
  
  // Generate the zip file
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Download the zip
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `care-plans-export-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
