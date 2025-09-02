import { ExtractedFacts } from "@shared/schema";
import { ChevronLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FactsPanelProps {
  facts: ExtractedFacts | null;
  isProcessing: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function FactsPanel({ facts, isProcessing, isCollapsed, onToggleCollapse }: FactsPanelProps) {
  if (isCollapsed) {
    return (
      <div className="w-full lg:w-12 bg-secondary lg:border-r border-border flex lg:flex-col items-center py-2 lg:py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          data-testid="button-expand-facts"
          className="lg:size-icon"
        >
          <ChevronLeft className="h-4 w-4 lg:rotate-180" />
          <span className="ml-2 lg:hidden">Show Facts</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-80 bg-secondary lg:border-r border-border flex flex-col lg:min-h-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <Search className="text-primary mr-2 h-5 w-5" />
            Extracted Facts
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            data-testid="button-collapse-facts"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">AI-identified key details</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Processing Status */}
        {isProcessing && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3" data-testid="processing-status">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-accent rounded-full processing-animation"></div>
              <span className="text-sm font-medium text-accent">Processing transcript...</span>
            </div>
          </div>
        )}

        {facts && (
          <>
            {/* Client Details */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Client Details</h3>
              <div className="fact-item p-2 rounded border border-border bg-card" data-testid="fact-client-name">
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="font-medium">{facts.clientDetails.name}</div>
              </div>
              {facts.clientDetails.language && (
                <div className="fact-item p-2 rounded border border-border bg-card" data-testid="fact-language">
                  <div className="text-xs text-muted-foreground">Language</div>
                  <div className="font-medium">{facts.clientDetails.language}</div>
                </div>
              )}
              {facts.clientDetails.interpreterRequired !== undefined && (
                <div className="fact-item p-2 rounded border border-border bg-card" data-testid="fact-interpreter">
                  <div className="text-xs text-muted-foreground">Interpreter Required</div>
                  <div className="font-medium">{facts.clientDetails.interpreterRequired ? "Yes" : "No"}</div>
                </div>
              )}
            </div>

            {/* Medical Information */}
            {(facts.medical.gp || facts.medical.equipment?.length || facts.medical.pharmacy) && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Medical</h3>
                {facts.medical.gp && (
                  <div className="fact-item p-2 rounded border border-border bg-card" data-testid="fact-gp">
                    <div className="text-xs text-muted-foreground">GP</div>
                    <div className="font-medium">{facts.medical.gp}</div>
                  </div>
                )}
                {facts.medical.equipment && facts.medical.equipment.length > 0 && (
                  <div className="fact-item p-2 rounded border border-border bg-card" data-testid="fact-equipment">
                    <div className="text-xs text-muted-foreground">Equipment</div>
                    <div className="font-medium">{facts.medical.equipment.join(", ")}</div>
                  </div>
                )}
                {facts.medical.pharmacy && (
                  <div className="fact-item p-2 rounded border border-border bg-card" data-testid="fact-pharmacy">
                    <div className="text-xs text-muted-foreground">Pharmacy</div>
                    <div className="font-medium">{facts.medical.pharmacy}</div>
                  </div>
                )}
              </div>
            )}

            {/* Support Network */}
            {(facts.support.primaryContact || facts.support.secondaryContact) && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Support</h3>
                {facts.support.primaryContact && (
                  <div className="fact-item p-2 rounded border border-border bg-card" data-testid="fact-primary-contact">
                    <div className="text-xs text-muted-foreground">Primary Contact</div>
                    <div className="font-medium">{facts.support.primaryContact}</div>
                  </div>
                )}
                {facts.support.secondaryContact && (
                  <div className="fact-item p-2 rounded border border-border bg-card" data-testid="fact-secondary-contact">
                    <div className="text-xs text-muted-foreground">Secondary Contact</div>
                    <div className="font-medium">{facts.support.secondaryContact}</div>
                  </div>
                )}
              </div>
            )}

            {/* Risk Factors */}
            {facts.risks && facts.risks.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Risk Factors</h3>
                {facts.risks.map((risk, index) => (
                  <div key={index} className="fact-item p-2 rounded border border-destructive/20 bg-destructive/5" data-testid={`fact-risk-${index}`}>
                    <div className="text-xs text-destructive">{risk.type}</div>
                    <div className="font-medium text-destructive">{risk.description}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!facts && !isProcessing && (
          <div className="text-center text-muted-foreground py-8">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No facts extracted yet.</p>
            <p className="text-xs mt-1">Generate a care plan to see extracted facts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
