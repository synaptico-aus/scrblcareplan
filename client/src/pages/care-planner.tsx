import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CarePlanForm } from "@/components/CarePlanForm";
import { FactsPanel } from "@/components/FactsPanel";
import { CarePlanPreview } from "@/components/CarePlanPreview";
import { ExtractedFacts } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CarePlanner() {
  const [clientName, setClientName] = useState("Lucia Barrientos");
  const [transcript, setTranscript] = useState(`Unknown speaker 00:00
and no cultural factors and do you have mum's pension and Medicare card to hand at all please yep okay thank you I don't know where I just put my Medicare and pension if you've got it please oh yeah lovely thank you that's all I need those just type those in so Medicare we've got three two one one four five three oh five one and then pension is see on three one five nine four seven six yeah...

Unknown speaker 03:08
I can't find out. I think the words are in the end. I'll pause. Are they... Hello. Would you like to put a secondary contact at all, Jose? Yeah, my brother. Westa W-E-S-T-R. Same surname? Let me just copy that quick...`);
  const [processingMode, setProcessingMode] = useState<"ai" | "offline">("ai");
  const [facts, setFacts] = useState<ExtractedFacts | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [isFactsPanelCollapsed, setIsFactsPanelCollapsed] = useState(false);
  
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async ({ clientName, transcript, mode }: { 
      clientName: string; 
      transcript: string; 
      mode: "ai" | "offline" 
    }) => {
      const endpoint = mode === "ai" ? "/api/chat-parity" : "/api/offline-analysis";
      const response = await apiRequest("POST", endpoint, {
        clientName,
        transcript,
        template: "gold-standard"
      });
      return response.json();
    },
    onSuccess: (data) => {
      setFacts(data.facts);
      setHtml(data.html);
      toast({
        title: "Care Plan Generated",
        description: "Successfully generated Gold Standard Care Plan",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate care plan",
        variant: "destructive",
      });
    },
  });

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
          processingMode={processingMode}
          setProcessingMode={setProcessingMode}
          onGenerate={handleGenerate}
          isLoading={generateMutation.isPending}
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
          onExport={handleExport}
          onPrint={handlePrint}
        />
      </div>
    </div>
  );
}
