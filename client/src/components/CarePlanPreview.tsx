import { Button } from "@/components/ui/button";
import { Download, FileText, Printer } from "lucide-react";

interface CarePlanPreviewProps {
  html: string | null;
  isLoading: boolean;
  onExport: () => void;
  onPrint: () => void;
}

export function CarePlanPreview({ html, isLoading, onExport, onPrint }: CarePlanPreviewProps) {
  return (
    <div className="flex-1 bg-card flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <FileText className="text-primary mr-2 h-5 w-5" />
            Care Plan Preview
          </h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onPrint}
              disabled={!html}
              data-testid="button-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={onExport}
              disabled={!html}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to Word
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-medium text-foreground">Generating Care Plan...</p>
              <p className="text-sm text-muted-foreground mt-2">Processing transcript with AI</p>
            </div>
          </div>
        ) : html ? (
          <div className="max-w-4xl mx-auto care-plan-document bg-white shadow-lg rounded-lg p-8" data-testid="care-plan-content">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
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
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-sm font-medium text-accent">HIPAA Compliant</span>
                </div>
                <p className="text-xs text-accent/80">
                  All data is processed securely and in compliance with healthcare privacy standards.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
