import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, Printer, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExtractedFacts } from "@shared/schema";
import { exportToWord } from "@/lib/word-export";
import { carePlanCss } from "@shared/care-plan-document";
import { downloadCarePlanPdf, sanitizeCarePlanHtml } from "@/lib/document-output";

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

  const sanitizedHtml = useMemo(() => html ? sanitizeCarePlanHtml(html) : null, [html]);

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
    const opened = downloadCarePlanPdf(`Care Plan Draft - ${clientName}`, sanitizedHtml);
    toast(opened
      ? { title: "Print dialog opened", description: "Choose “Save as PDF” to download an A4 copy." }
      : { title: "Pop-up blocked", description: "Allow pop-ups for this site, then try PDF again.", variant: "destructive" });
  };

  const handleExportToWord = () => {
    if (!sanitizedHtml) return;
    
    exportToWord(clientName, sanitizedHtml, extractedFacts);
    
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
              onClick={handleExportToPDF}
              disabled={!sanitizedHtml}
              data-testid="button-export-pdf"
              size="sm"
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span>Save as PDF</span>
            </Button>
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
              className="w-full sm:w-auto"
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
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Draft for clinical review. Confirm all details against the transcript before approval. Edits made in a downloaded Word document do not sync back to this plan.
            </div>
            {/* Generation Time Header */}
            {generationTime && (
              <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Generated in {generationTime} seconds</span>
                </div>
              </div>
            )}
            
            <div className="care-plan-document bg-white shadow-lg rounded-lg p-8" data-testid="care-plan-content">
              <style>{carePlanCss}</style>
              <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full p-6 mb-4 inline-block">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Generate</h3>
              <div className="text-muted-foreground mb-4 max-w-2xl space-y-3">
                <p>
                  I'm Scrbl an AI-powered assistant that turns your assessment transcripts into structured, compliant first-draft care plans for the Support at Home Program.
                </p>
                <p>
                  I analyse the transcript, extract the client's goals, risks, abilities, needs, preferences, safety considerations, then I produce a clear, narrative, first-person draft that follows a gold standard care plan structure.
                </p>
                <p>
                  I don't replace judgement, I help make your work more efficient. You'll still review, edit, and approve the final plan, while I complete up to 90% of the initial drafting, ensuring consistency, accuracy, and significant time savings.
                </p>
                <p className="font-medium">
                  I help your team spend less time writing and more time caring.
                </p>
              </div>
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
