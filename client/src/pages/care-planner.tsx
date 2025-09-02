import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { CarePlanForm } from "@/components/CarePlanForm";
import { FactsPanel } from "@/components/FactsPanel";
import { CarePlanPreview } from "@/components/CarePlanPreview";
import { AgentUpdates } from "@/components/AgentUpdates";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ExtractedFacts, fundingLevels } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import scrblLogo from "@/assets/scrbl-logo.png";

export default function CarePlanner() {
  const [clientName, setClientName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [nottaUrl, setNottaUrl] = useState("");
  const [processingMode, setProcessingMode] = useState<"ai" | "offline">("ai");
  const [fundingType, setFundingType] = useState<"hcp" | "sah" | "">("");
  const [fundingLevel, setFundingLevel] = useState<"level1" | "level2" | "level3" | "level4" | "level5" | "level6" | "level7" | "level8" | "restorative" | "endoflife" | "">("");
  const [facts, setFacts] = useState<ExtractedFacts | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [isFactsPanelCollapsed, setIsFactsPanelCollapsed] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [isFetchingNotta, setIsFetchingNotta] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate budget estimate HTML to append to care plan
  const generateBudgetEstimateHTML = (html: string, fundingType: string, fundingLevel: string) => {
    if (!fundingType || !fundingLevel) return html;

    let budgetData: { name: string; quarterlyAmount: number } | undefined;
    
    if (fundingType === "hcp" && fundingLevel in fundingLevels.hcp) {
      budgetData = fundingLevels.hcp[fundingLevel as keyof typeof fundingLevels.hcp];
    } else if (fundingType === "sah" && fundingLevel in fundingLevels.sah) {
      budgetData = fundingLevels.sah[fundingLevel as keyof typeof fundingLevels.sah];
    }
    
    if (!budgetData) return html;

    const quarterlyBudget = budgetData.quarterlyAmount;
    const availableBudget = quarterlyBudget * 0.9;

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
    const remainingBudget = availableBudget - quarterlyEstimate;
    const utilizationPercentage = (quarterlyEstimate / availableBudget) * 100;

    const budgetHTML = `
      <hr style="margin: 30px 0; border: 1px solid #ccc;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">Budget Estimation (90% of Quarterly Allocation)</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background-color: #f8fafc;">
          <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-weight: bold;">Budget Summary</th>
          <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: right; font-weight: bold;">Amount</th>
        </tr>
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">Funding Level</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">${budgetData.name}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">Quarterly Budget</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">$${quarterlyBudget.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">Available for Care (90%)</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">$${availableBudget.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">Estimated Quarterly Cost</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">$${quarterlyEstimate.toLocaleString()}</td>
        </tr>
        <tr style="background-color: #f8fafc; font-weight: bold;">
          <td style="border: 1px solid #e2e8f0; padding: 8px;">Remaining Budget</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right; color: ${remainingBudget >= 0 ? '#059669' : '#dc2626'};">$${remainingBudget.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">Budget Utilization</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right; color: ${utilizationPercentage > 100 ? '#dc2626' : '#059669'};">${utilizationPercentage.toFixed(1)}%</td>
        </tr>
      </table>

      ${services.length > 0 ? `
      <h3 style="color: #374151; margin-bottom: 15px;">Service Breakdown</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background-color: #f8fafc;">
          <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-weight: bold;">Service</th>
          <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: right; font-weight: bold;">Hourly Rate</th>
          <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: right; font-weight: bold;">Monthly Cost</th>
          <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: right; font-weight: bold;">Quarterly Cost</th>
        </tr>
        ${services.map(service => `
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">${service.name}</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">$${service.hourlyRate}/hour</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">$${service.monthlyRate}/month</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">$${(service.monthlyRate * 3).toLocaleString()}</td>
        </tr>
        `).join('')}
        <tr style="background-color: #f8fafc; font-weight: bold;">
          <td style="border: 1px solid #e2e8f0; padding: 8px;">Total</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px;"></td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">$${totalMonthlyCost}/month</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">$${quarterlyEstimate.toLocaleString()}</td>
        </tr>
      </table>
      ` : '<p><em>No services with pricing found in care plan goals.</em></p>'}
      
      <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
        <strong>Note:</strong> This budget estimation is based on the services and frequencies specified in the care plan goals. 
        Actual costs may vary based on service delivery times (day/night/weekend rates) and any additional services required.
        Please consult with your Care Partner for final budget confirmation.
      </p>
    `;

    return html + budgetHTML;
  };

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async ({ name, clientName, html, extractedFacts }: {
      name: string;
      clientName: string;
      html: string;
      extractedFacts: ExtractedFacts | null;
    }) => {
      const response = await apiRequest("POST", "/api/saved-care-plans", {
        name,
        clientName,
        html,
        extractedFacts,
        saveDate: new Date(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-care-plans"] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async ({ clientName, transcript, mode, fundingType, fundingLevel }: { 
      clientName: string; 
      transcript: string; 
      mode: "ai" | "offline";
      fundingType?: string;
      fundingLevel?: string;
    }) => {
      const startTime = Date.now();
      setGenerationStartTime(startTime);
      
      // Generate a unique session ID for streaming updates
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      
      // Use streaming endpoint for AI mode, regular endpoint for offline
      const endpoint = mode === "ai" ? "/api/chat-parity-stream" : "/api/offline-analysis";
      const response = await apiRequest("POST", endpoint, {
        clientName,
        transcript,
        template: "gold-standard",
        fundingType: fundingType || undefined,
        fundingLevel: fundingLevel || undefined,
        sessionId: mode === "ai" ? newSessionId : undefined
      });
      
      const endTime = Date.now();
      const totalTime = Math.round((endTime - startTime) / 1000);
      setGenerationTime(totalTime);
      
      return response.json();
    },
    onSuccess: (data) => {
      setFacts(data.facts);
      
      // Add budget estimate to the HTML before saving and displaying
      const htmlWithBudget = generateBudgetEstimateHTML(data.html, fundingType, fundingLevel);
      setHtml(htmlWithBudget);
      
      // Auto-save the generated care plan with budget estimate
      const autoSaveName = `${clientName} - ${new Date().toLocaleDateString('en-AU')}`;
      autoSaveMutation.mutate({
        name: autoSaveName,
        clientName,
        html: htmlWithBudget,
        extractedFacts: data.facts,
      });
      
      toast({
        title: "Care Plan Generated & Saved",
        description: `Generated in ${generationTime} seconds and automatically saved as "${autoSaveName}"`,
      });
    },
    onError: (error) => {
      setGenerationStartTime(null);
      setGenerationTime(null);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate care plan",
        variant: "destructive",
      });
    },
  });

  // Handle completion from streaming agent updates
  const handleAgentCompletion = (result: any) => {
    if (result.html && result.facts) {
      setFacts(result.facts);
      
      // Add budget estimate to the HTML before saving and displaying
      const htmlWithBudget = generateBudgetEstimateHTML(result.html, fundingType, fundingLevel);
      setHtml(htmlWithBudget);
      
      // Auto-save the generated care plan with budget estimate
      const autoSaveName = `${clientName} - ${new Date().toLocaleDateString('en-AU')}`;
      autoSaveMutation.mutate({
        name: autoSaveName,
        clientName,
        html: htmlWithBudget,
        extractedFacts: result.facts,
      });
    }
  };

  const handleFetchFromNotta = async () => {
    if (!nottaUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a Notta.AI share URL",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingNotta(true);
    try {
      const response = await apiRequest("POST", "/api/fetch-notta", {
        url: nottaUrl.trim()
      });
      const data = await response.json();
      
      if (data.transcript) {
        setTranscript(data.transcript);
        toast({
          title: "Import Successful",
          description: "Transcript imported from Notta.AI",
        });
      }
    } catch (error) {
      const errorMessage = (error as any)?.response?.data?.message || (error as Error).message || "Failed to fetch transcript from Notta.AI";
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsFetchingNotta(false);
    }
  };

  const handleGenerate = () => {
    if (!clientName.trim() || !transcript.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both client name and transcript",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      clientName: clientName.trim(),
      transcript: transcript.trim(),
      mode: processingMode,
      fundingType: fundingType || undefined,
      fundingLevel: fundingLevel || undefined
    });
  };


  const handlePrint = () => {
    if (html) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Care Plan - ${clientName}</title>
              <style>
                body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
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
              ${html}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img 
              src={scrblLogo} 
              alt="Scrbl Logo" 
              className="h-8 sm:h-10 w-auto"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">scrbl_v2</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Digital Care Plan Agent</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden lg:flex items-center justify-center space-x-2 bg-accent/10 px-3 py-1 rounded-full">
              <Shield className="text-accent h-4 w-4" />
              <span className="text-sm font-medium text-foreground">Privacy Act Compliant</span>
            </div>
            <Link href="/saved-plans">
              <Button variant="outline" size="sm" data-testid="button-saved-plans" className="text-xs sm:text-sm">
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Saved Plans</span>
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              data-testid="button-settings" 
              className="text-xs sm:text-sm"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile/Tablet: Stack vertically, Desktop: Side by side */}
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-80px)]">
        <CarePlanForm
          clientName={clientName}
          setClientName={setClientName}
          transcript={transcript}
          setTranscript={setTranscript}
          nottaUrl={nottaUrl}
          setNottaUrl={setNottaUrl}
          processingMode={processingMode}
          setProcessingMode={setProcessingMode}
          fundingType={fundingType}
          setFundingType={setFundingType}
          fundingLevel={fundingLevel}
          setFundingLevel={setFundingLevel}
          onGenerate={handleGenerate}
          onFetchFromNotta={handleFetchFromNotta}
          isLoading={generateMutation.isPending}
          isFetchingNotta={isFetchingNotta}
        />

        {/* Agent Updates - Show only when generating with AI */}
        {generateMutation.isPending && processingMode === "ai" && (
          <div className="w-full lg:w-80 p-4 border-r border-border bg-card/50 lg:min-h-0 lg:max-h-full lg:overflow-y-auto">
            <AgentUpdates
              sessionId={sessionId}
              isGenerating={generateMutation.isPending}
              onComplete={handleAgentCompletion}
            />
          </div>
        )}

        <FactsPanel
          facts={facts}
          isProcessing={generateMutation.isPending}
          isCollapsed={isFactsPanelCollapsed}
          onToggleCollapse={() => setIsFactsPanelCollapsed(!isFactsPanelCollapsed)}
        />

        <CarePlanPreview
          html={html}
          isLoading={generateMutation.isPending}
          clientName={clientName}
          extractedFacts={facts}
          generationStartTime={generationStartTime}
          generationTime={generationTime}
          fundingType={fundingType}
          fundingLevel={fundingLevel}
          onPrint={handlePrint}
        />
      </div>

      {/* Settings Dialog */}
      <SettingsDialog 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
      />
    </div>
  );
}
