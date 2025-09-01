import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { CarePlanForm } from "@/components/CarePlanForm";
import { FactsPanel } from "@/components/FactsPanel";
import { CarePlanPreview } from "@/components/CarePlanPreview";
import { ExtractedFacts } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CarePlanner() {
  const [clientName, setClientName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [nottaUrl, setNottaUrl] = useState("");
  const [processingMode, setProcessingMode] = useState<"ai" | "offline">("ai");
  const [facts, setFacts] = useState<ExtractedFacts | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [isFactsPanelCollapsed, setIsFactsPanelCollapsed] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [isFetchingNotta, setIsFetchingNotta] = useState(false);
  
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async ({ clientName, transcript, mode }: { 
      clientName: string; 
      transcript: string; 
      mode: "ai" | "offline" 
    }) => {
      const startTime = Date.now();
      setGenerationStartTime(startTime);
      
      const endpoint = mode === "ai" ? "/api/chat-parity" : "/api/offline-analysis";
      const response = await apiRequest("POST", endpoint, {
        clientName,
        transcript,
        template: "gold-standard"
      });
      
      const endTime = Date.now();
      const totalTime = Math.round((endTime - startTime) / 1000);
      setGenerationTime(totalTime);
      
      return response.json();
    },
    onSuccess: (data) => {
      setFacts(data.facts);
      setHtml(data.html);
      toast({
        title: "Care Plan Generated",
        description: `Successfully generated in ${generationTime} seconds`,
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
      mode: processingMode
    });
  };

  const handleExport = () => {
    // TODO: Implement Word document export
    toast({
      title: "Export Feature",
      description: "Word export functionality coming soon",
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
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6zm2 2h8v2H6V8zm0 3h8v1H6v-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Scrbl Gold Standard Care Planner</h1>
              <p className="text-sm text-muted-foreground">Australian Aged Care Assessment Tool</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-accent/10 px-3 py-1 rounded-full">
              <Shield className="text-accent h-4 w-4" />
              <span className="text-sm font-medium text-accent-foreground">HIPAA Compliant</span>
            </div>
            <Link href="/saved-plans">
              <Button variant="outline" data-testid="button-saved-plans">
                <FileText className="h-4 w-4 mr-2" />
                Saved Plans
              </Button>
            </Link>
            <Button variant="outline" data-testid="button-settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <CarePlanForm
          clientName={clientName}
          setClientName={setClientName}
          transcript={transcript}
          setTranscript={setTranscript}
          nottaUrl={nottaUrl}
          setNottaUrl={setNottaUrl}
          processingMode={processingMode}
          setProcessingMode={setProcessingMode}
          onGenerate={handleGenerate}
          onFetchFromNotta={handleFetchFromNotta}
          isLoading={generateMutation.isPending}
          isFetchingNotta={isFetchingNotta}
        />

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
          onExport={handleExport}
          onPrint={handlePrint}
        />
      </div>
    </div>
  );
}
