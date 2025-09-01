import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, Printer, Save, Clock, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ExtractedFacts, fundingLevels } from "@shared/schema";

interface CarePlanPreviewProps {
  html: string | null;
  isLoading: boolean;
  clientName: string;
  extractedFacts: ExtractedFacts | null;
  generationStartTime: number | null;
  generationTime: number | null;
  fundingType: string;
  fundingLevel: string;
  onExport: () => void;
  onPrint: () => void;
}

export function CarePlanPreview({ html, isLoading, clientName, extractedFacts, generationStartTime, generationTime, fundingType, fundingLevel, onExport, onPrint }: CarePlanPreviewProps) {
  const [saveName, setSaveName] = useState("");
  const [saveDate, setSaveDate] = useState(new Date().toISOString().split('T')[0]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Budget calculation function
  const calculateBudgetEstimate = () => {
    if (!html || !fundingType || !fundingLevel) return null;

    let budgetData: { name: string; quarterlyAmount: number } | undefined;
    
    if (fundingType === "hcp" && fundingLevel in fundingLevels.hcp) {
      budgetData = fundingLevels.hcp[fundingLevel as keyof typeof fundingLevels.hcp];
    } else if (fundingType === "sah" && fundingLevel in fundingLevels.sah) {
      budgetData = fundingLevels.sah[fundingLevel as keyof typeof fundingLevels.sah];
    }
    
    if (!budgetData) return null;

    const quarterlyBudget = budgetData.quarterlyAmount;
    const availableBudget = quarterlyBudget * 0.9; // 90% available for care

    // Extract service costs from HTML goals section
    const serviceMatches = html.match(/\$\d+\/hour.*?\$\d+\/month/g) || [];
    const services: Array<{name: string; hourlyRate: number; monthlyRate: number}> = [];
    
    serviceMatches.forEach(match => {
      const hourlyMatch = match.match(/\$(\d+)\/hour/);
      const monthlyMatch = match.match(/\$(\d+)\/month/);
      if (hourlyMatch && monthlyMatch) {
        const context = html.substring(html.indexOf(match) - 100, html.indexOf(match) + 100);
        let serviceName = "Care Service";
        
        if (context.includes("Personal Care")) serviceName = "Personal Care";
        else if (context.includes("Domestic Assistance")) serviceName = "Domestic Assistance";
        else if (context.includes("Allied Health")) serviceName = "Allied Health Therapy";
        else if (context.includes("Social Support")) serviceName = "Social Support";
        else if (context.includes("Nursing")) serviceName = "Nursing Care";
        
        services.push({
          name: serviceName,
          hourlyRate: parseInt(hourlyMatch[1]),
          monthlyRate: parseInt(monthlyMatch[1])
        });
      }
    });

    const totalMonthlyCost = services.reduce((sum, service) => sum + service.monthlyRate, 0);
    const quarterlyEstimate = totalMonthlyCost * 3;

    return {
      quarterlyBudget,
      availableBudget,
      services,
      totalMonthlyCost,
      quarterlyEstimate,
      remainingBudget: availableBudget - quarterlyEstimate,
      utilizationPercentage: (quarterlyEstimate / availableBudget) * 100
    };
  };

  const budgetEstimate = calculateBudgetEstimate();

  // Set default save name to client name when care plan is generated
  useEffect(() => {
    if (html && clientName && !saveName) {
      setSaveName(clientName);
    }
  }, [html, clientName, saveName]);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!html) throw new Error("No care plan to save");
      
      const response = await apiRequest("POST", "/api/saved-care-plans", {
        name: saveName.trim(),
        clientName,
        html,
        extractedFacts,
        saveDate: new Date(saveDate),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-care-plans"] });
      toast({
        title: "Care Plan Saved",
        description: `"${saveName}" has been saved successfully.`,
      });
      setSaveName("");
      setSaveDate(new Date().toISOString().split('T')[0]);
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save care plan",
        variant: "destructive",
      });
    },
  });

  const handleSaveCarePlan = () => {
    if (!saveName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the care plan",
        variant: "destructive",
      });
      return;
    }
    
    if (!html) {
      toast({
        title: "No Care Plan",
        description: "Generate a care plan first before saving",
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate();
  };

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

      {/* Save Care Plan Section */}
      {html && (
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <Save className="text-primary mr-2 h-4 w-4" />
            Save Care Plan
          </h3>
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <Label htmlFor="save-name" className="block text-sm font-medium mb-1">
                Name
              </Label>
              <Input
                id="save-name"
                data-testid="input-save-name"
                type="text"
                placeholder="Enter care plan name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-40">
              <Label htmlFor="save-date" className="block text-sm font-medium mb-1">
                Date
              </Label>
              <Input
                id="save-date"
                data-testid="input-save-date"
                type="date"
                value={saveDate}
                onChange={(e) => setSaveDate(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleSaveCarePlan}
              disabled={!saveName.trim() || !html || saveMutation.isPending}
              data-testid="button-save-care-plan"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saveMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Budget Estimation Section */}
      {html && budgetEstimate && (
        <Collapsible open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
          <div className="p-4 border-b border-border bg-accent/5">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto hover:bg-transparent"
                data-testid="button-toggle-budget"
              >
                <h3 className="text-md font-semibold flex items-center">
                  <DollarSign className="text-primary mr-2 h-4 w-4" />
                  Budget Estimation (90% of Quarterly Allocation)
                </h3>
                {isBudgetOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-3">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Budget Summary */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Budget Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Quarterly Budget:</span>
                  <span className="font-medium">${budgetEstimate.quarterlyBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available for Care (90%):</span>
                  <span className="font-medium">${budgetEstimate.availableBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Quarterly Cost:</span>
                  <span className="font-medium">${budgetEstimate.quarterlyEstimate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Remaining Budget:</span>
                  <span className={`font-medium ${budgetEstimate.remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${budgetEstimate.remainingBudget.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Budget Utilization:</span>
                  <span className={`font-medium ${budgetEstimate.utilizationPercentage > 100 ? 'text-red-600' : 'text-green-600'}`}>
                    {budgetEstimate.utilizationPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Service Breakdown */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Service Breakdown</h4>
              <div className="space-y-2">
                {budgetEstimate.services.map((service, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-xs text-muted-foreground">${service.hourlyRate}/hour</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${service.monthlyRate}/month</div>
                      <div className="text-xs text-muted-foreground">${(service.monthlyRate * 3).toLocaleString()}/quarter</div>
                    </div>
                  </div>
                ))}
                {budgetEstimate.services.length === 0 && (
                  <p className="text-sm text-muted-foreground">No services with pricing found in goals</p>
                )}
              </div>
            </div>
          </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}
      
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
        ) : html ? (
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
                  <span className="text-sm font-medium text-accent">Privacy Act Compliant</span>
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
