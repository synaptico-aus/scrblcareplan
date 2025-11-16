import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, Printer, Clock, FileType } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExtractedFacts } from "@shared/schema";
// @ts-ignore
import html2pdf from "html2pdf.js";
import DOMPurify from "dompurify";
import scrblLogo from "@/assets/scrbl-logo.png";

interface CarePlanPreviewProps {
  html: string | null;
  isLoading: boolean;
  clientName: string;
  extractedFacts: ExtractedFacts | null;
  generationStartTime: number | null;
  generationTime: number | null;
  onPrint: () => void;
}

export function CarePlanPreview({ html, isLoading, clientName, extractedFacts, generationStartTime, generationTime, onPrint }: CarePlanPreviewProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Sanitize HTML content and escape clientName to prevent XSS
  const sanitizedHtml = useMemo(() => html ? DOMPurify.sanitize(html) : null, [html]);
  const escapedClientName = useMemo(() => {
    const div = document.createElement('div');
    div.textContent = clientName;
    return div.innerHTML;
  }, [clientName]);

  // Timer for elapsed time during generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoading && generationStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - generationStartTime) / 1000);
        setElapsedTime(elapsed);
        
        // Simulate progress based on elapsed time (reaches ~90% at 60 seconds)
        const progressValue = Math.min(90, (elapsed / 60) * 90);
        setProgress(progressValue);
      }, 1000);
    } else {
      setElapsedTime(0);
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, generationStartTime]);


  const handleExportToPDF = () => {
    if (!sanitizedHtml) return;
    
    // Create a complete HTML document with Scrbl logo (using sanitized content)
    const htmlWithLogo = `
      <html>
        <head>
          <title>Care Plan Draft - ${escapedClientName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
            .logo-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ddd; }
            .logo-header img { height: 60px; }
            h1 { font-size: 18pt; font-weight: bold; margin-bottom: 12pt; text-align: center; }
            h2 { font-size: 14pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
            h3 { font-size: 12pt; font-weight: bold; margin-top: 6pt; margin-bottom: 3pt; }
            p { margin-bottom: 6pt; }
            table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
            th, td { border: 1px solid #000; padding: 6pt; text-align: left; }
            th { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="logo-header">
            <img src="${scrblLogo}" alt="Scrbl Logo" />
          </div>
          ${sanitizedHtml}
        </body>
      </html>
    `;
    
    const element = document.createElement('div');
    element.innerHTML = htmlWithLogo;
    
    const opt = {
      margin: 1,
      filename: `${escapedClientName || 'care-plan'}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
    
    toast({
      title: "PDF Export Started",
      description: "Your care plan is being exported to PDF...",
    });
  };

  // Helper function to escape HTML to prevent XSS
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const formatExtractedFactsForWord = (facts: ExtractedFacts | null): string => {
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

  const handleExportToWord = () => {
    if (!sanitizedHtml) return;
    
    // Generate extracted facts HTML
    const extractedFactsHtml = formatExtractedFactsForWord(extractedFacts);
    
    // Create a complete HTML document with Scrbl logo for Word (using sanitized content)
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
          ${sanitizedHtml}
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
    
    toast({
      title: "Word Export Complete",
      description: "Your care plan has been exported as a Word document.",
    });
  };

  return (
    <div className="w-full lg:flex-1 bg-card flex flex-col lg:min-h-0">
      <div className="p-4 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-2 lg:space-y-0">
          <h2 className="text-lg font-semibold flex items-center">
            <FileText className="text-primary mr-2 h-5 w-5" />
            Care Plan Preview
          </h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              variant="outline"
              onClick={onPrint}
              disabled={!sanitizedHtml}
              data-testid="button-print"
              size="sm"
              className="w-full sm:w-auto"
            >
              <Printer className="h-4 w-4 sm:mr-2" />
              <span className="sm:inline">Print</span>
            </Button>
            <Button
              onClick={handleExportToWord}
              disabled={!sanitizedHtml}
              className="bg-blue-500 text-white hover:bg-blue-600 w-full sm:w-auto"
              data-testid="button-export-word"
              size="sm"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="sm:inline">Export to Word</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md w-full">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-medium text-foreground">Generating Care Plan...</p>
              <p className="text-sm text-muted-foreground mt-2">Processing transcript with AI</p>
              
              {/* Progress Bar */}
              <div className="mt-6 space-y-3">
                <Progress value={progress} className="w-full" />
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Elapsed time: {elapsedTime}s</span>
                </div>
              </div>
            </div>
          </div>
        ) : sanitizedHtml ? (
          <div className="max-w-4xl mx-auto care-plan-document bg-white shadow-lg rounded-lg p-8" data-testid="care-plan-content">
            {/* Generation Time Header */}
            {generationTime && (
              <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Generated in {generationTime} seconds</span>
                </div>
              </div>
            )}
            
            <div 
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full p-6 mb-4 inline-block">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Generate</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Enter client information and transcript to generate a Gold Standard Care Plan
                compliant with Australian Aged Care Standards.
              </p>
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-sm font-medium text-foreground">Privacy Act Compliant</span>
                </div>
                <p className="text-xs text-accent/80">
                  All data is processed securely and in compliance with Australian Privacy Act 1988.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
