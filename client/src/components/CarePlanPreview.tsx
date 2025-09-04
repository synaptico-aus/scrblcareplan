import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, Printer, Clock, DollarSign, ChevronDown, ChevronUp, FileType } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ExtractedFacts } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
// @ts-ignore
import html2pdf from "html2pdf.js";
import scrblLogo from "@/assets/scrbl-logo.png";

interface CarePlanPreviewProps {
  html: string | null;
  isLoading: boolean;
  clientName: string;
  extractedFacts: ExtractedFacts | null;
  generationStartTime: number | null;
  generationTime: number | null;
  fundingType: string;
  fundingLevel: string;
  onPrint: () => void;
}

export function CarePlanPreview({ html, isLoading, clientName, extractedFacts, generationStartTime, generationTime, fundingType, fundingLevel, onPrint }: CarePlanPreviewProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isGeneratingBudget, setIsGeneratingBudget] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Budget generation mutation
  const generateBudgetMutation = useMutation({
    mutationFn: async () => {
      if (!html || !clientName || !fundingType || !fundingLevel) {
        throw new Error("Missing required data for budget generation");
      }

      const response = await apiRequest("POST", "/api/generate-budget", {
        carePlanHtml: html,
        fundingType,
        fundingLevel,
        clientName
      });

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Budget Generated Successfully",
        description: `Budget estimate has been saved to ${clientName}'s folder`,
      });

      // Invalidate client documents query to refresh the saved plans list
      queryClient.invalidateQueries({ queryKey: ["/api/client-documents", clientName] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-documents"] });
    },
    onError: (error) => {
      toast({
        title: "Budget Generation Failed",
        description: error.message || "Failed to generate budget estimate",
        variant: "destructive",
      });
    },
  });

  const handleGenerateBudget = () => {
    generateBudgetMutation.mutate();
  };

  const isGeneratingBudgetState = generateBudgetMutation.isPending;

  // Old budget calculation function (kept for reference but not used)
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
        // Get broader context to find service category and description
        const matchIndex = html.indexOf(match);
        const context = html.substring(matchIndex - 500, matchIndex + 500);
        let serviceName = "Care Service";
        
        // Look for Service Category patterns first
        if (context.includes("Service Category: Clinical Care")) {
          if (context.includes("physiotherap") || context.includes("Physiotherap")) {
            serviceName = "Physiotherapy";
          } else if (context.includes("podiatr") || context.includes("Podiatr")) {
            serviceName = "Podiatry";
          } else if (context.includes("Allied Health") || context.includes("allied health")) {
            serviceName = "Allied Health Therapy";
          } else {
            serviceName = "Clinical Care";
          }
        } else if (context.includes("Service Category: Everyday Living")) {
          if (context.includes("Domestic Assistance") || context.includes("domestic assistance")) {
            serviceName = "Domestic Assistance";
          } else if (context.includes("Personal Care") || context.includes("personal care")) {
            serviceName = "Personal Care";
          } else {
            serviceName = "Everyday Living";
          }
        } else if (context.includes("Service Category: Social Support") || context.includes("Service Category: Independence Support")) {
          if (context.includes("Social Support/Shopping") || context.includes("shopping")) {
            serviceName = "Social Support - Shopping";
          } else if (context.includes("Community Access") || context.includes("community access")) {
            serviceName = "Social Support - Community Access";
          } else if (context.includes("transport") || context.includes("Transport")) {
            serviceName = "Social Support - Transport";
          } else {
            serviceName = "Social Support";
          }
        }
        // Fallback to basic keyword matching if Service Category not found
        else if (context.includes("Personal Care")) serviceName = "Personal Care";
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
    if (!html) return;
    
    // Create a complete HTML document with Scrbl logo
    const htmlWithLogo = `
      <html>
        <head>
          <title>Care Plan - ${clientName}</title>
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
          ${html}
        </body>
      </html>
    `;
    
    const element = document.createElement('div');
    element.innerHTML = htmlWithLogo;
    
    const opt = {
      margin: 1,
      filename: `${clientName || 'care-plan'}-${new Date().toISOString().split('T')[0]}.pdf`,
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

  const handleExportToWord = () => {
    if (!html) return;
    
    // Create a complete HTML document with Scrbl logo for Word
    const htmlWithLogo = `
      <html>
        <head>
          <title>Care Plan - ${clientName}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
            .logo-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ddd; }
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
            <h2>Scrbl - Digital Care Plan Agent</h2>
          </div>
          ${html}
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlWithLogo], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${clientName || 'care-plan'}-${new Date().toISOString().split('T')[0]}.doc`;
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
              disabled={!html}
              data-testid="button-print"
              size="sm"
              className="w-full sm:w-auto"
            >
              <Printer className="h-4 w-4 sm:mr-2" />
              <span className="sm:inline">Print</span>
            </Button>
            <Button
              onClick={handleExportToPDF}
              disabled={!html}
              className="bg-red-500 text-white hover:bg-red-600 w-full sm:w-auto"
              data-testid="button-export-pdf"
              size="sm"
            >
              <FileType className="h-4 w-4 sm:mr-2" />
              <span className="sm:inline">Export to PDF</span>
            </Button>
            <Button
              onClick={handleExportToWord}
              disabled={!html}
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


      {/* Budget Estimation Section */}
      {html && fundingType && fundingLevel && (
        <div className="p-4 border-b border-border bg-accent/5">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold flex items-center">
              <DollarSign className="text-primary mr-2 h-4 w-4" />
              Budget Estimation
            </h3>
            <Button
              variant="default"
              size="sm"
              className="text-xs sm:text-sm"
              data-testid="button-generate-budget"
              onClick={handleGenerateBudget}
              disabled={isGeneratingBudgetState}
            >
              {isGeneratingBudgetState ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                'Generate Budget'
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Generate detailed budget estimation based on services in this care plan
          </p>
        </div>
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
