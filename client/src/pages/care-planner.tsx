import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { CarePlanForm } from "@/components/CarePlanForm";
import { FactsPanel } from "@/components/FactsPanel";
import { CarePlanPreview } from "@/components/CarePlanPreview";
import { AgentUpdates } from "@/components/AgentUpdates";
import { ExtractedFacts } from "@shared/schema";
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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();


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
      
      // Set the HTML without budget (budget will be generated separately)
      setHtml(data.html);
      
      // Auto-save the generated care plan with budget estimate
      const autoSaveName = `${clientName} - ${new Date().toLocaleDateString('en-AU')}`;
      autoSaveMutation.mutate({
        name: autoSaveName,
        clientName,
        html: data.html,
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
      
      // Set HTML without budget (budget will be generated separately)
      setHtml(result.html);
      
      // Auto-save the generated care plan
      const autoSaveName = `${clientName} - ${new Date().toLocaleDateString('en-AU')}`;
      autoSaveMutation.mutate({
        name: autoSaveName,
        clientName,
        html: result.html,
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
              sessionId={sessionId || ""}
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
    </div>
  );
}
