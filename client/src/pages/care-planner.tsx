import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { CarePlanForm } from "@/components/CarePlanForm";
import { FactsPanel } from "@/components/FactsPanel";
import { CarePlanPreview } from "@/components/CarePlanPreview";
import { AgentUpdates } from "@/components/AgentUpdates";
import { ExtractedFacts, fundingLevels } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Settings, Shield, FileText, Bot, Loader2, LogOut, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [asyncJobId, setAsyncJobId] = useState<string | null>(null);
  const [isAsyncProcessing, setIsAsyncProcessing] = useState(false);
  const [asyncProgress, setAsyncProgress] = useState(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred while logging out",
        variant: "destructive",
      });
    }
  };

  // Polling function for async jobs
  const pollAsyncJob = async (jobId: string, startTime: number) => {
    const maxAttempts = 120; // 10 minutes with 5-second intervals
    let attempts = 0;
    
    const poll = async () => {
      try {
        attempts++;
        const response = await apiRequest("GET", `/api/job-status/${jobId}`);
        const jobData = await response.json();
        
        console.log(`Poll attempt ${attempts}: Job status`, jobData);
        
        setAsyncProgress(jobData.progress || 0);
        
        if (jobData.status === 'completed') {
          // Job completed successfully
          setIsAsyncProcessing(false);
          setAsyncJobId(null);
          
          const endTime = Date.now();
          const totalTime = Math.round((endTime - startTime) / 1000);
          setGenerationTime(totalTime);
          
          // Process the result
          if (jobData.result) {
            setFacts(jobData.result.facts);
            
            const htmlWithBudget = generateBudgetEstimateHTML(jobData.result.html, fundingType, fundingLevel);
            setHtml(htmlWithBudget);
            
            // Auto-save
            const autoSaveName = `${clientName} - ${new Date().toLocaleDateString('en-AU')}`;
            autoSaveMutation.mutate({
              name: autoSaveName,
              clientName,
              html: htmlWithBudget,
              extractedFacts: jobData.result.facts,
            });
            
            toast({
              title: "Long Transcript Processing Complete",
              description: `Generated in ${totalTime} seconds using async processing and saved as "${autoSaveName}"`,
            });
          }
          
          return; // Stop polling
        } else if (jobData.status === 'error') {
          // Job failed
          setIsAsyncProcessing(false);
          setAsyncJobId(null);
          setGenerationStartTime(null);
          setGenerationTime(null);
          
          toast({
            title: "Async Processing Failed",
            description: jobData.error || "Unknown error occurred",
            variant: "destructive",
          });
          
          return; // Stop polling
        } else if (attempts >= maxAttempts) {
          // Max attempts reached
          setIsAsyncProcessing(false);
          setAsyncJobId(null);
          
          toast({
            title: "Processing Timeout",
            description: "The transcript is taking longer than expected to process. Please try again.",
            variant: "destructive",
          });
          
          return; // Stop polling
        }
        
        // Continue polling
        setTimeout(poll, 5000); // Poll every 5 seconds
        
      } catch (error) {
        console.error('Polling error:', error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          setIsAsyncProcessing(false);
          setAsyncJobId(null);
          toast({
            title: "Connection Error",
            description: "Lost connection while processing. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        // Retry polling after error
        setTimeout(poll, 5000);
      }
    };
    
    // Start polling
    poll();
  };

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
      
      if (mode === "ai") {
        // Check transcript length to determine processing approach
        const transcriptLength = transcript.length;
        const estimatedSeconds = Math.ceil(transcriptLength / 300);
        
        console.log(`Transcript: ${transcriptLength} chars, estimated: ${estimatedSeconds}s`);
        
        if (estimatedSeconds > 90) {
          // Long transcript - use async processing
          console.log('Using async processing for long transcript');
          setIsAsyncProcessing(true);
          setAsyncProgress(0);
          
          const response = await apiRequest("POST", "/api/chat-parity-async", {
            clientName,
            transcript,
            template: "gold-standard",
            fundingType: fundingType || undefined,
            fundingLevel: fundingLevel || undefined,
            sessionId: newSessionId,
          });
          
          const asyncData = await response.json();
          
          if (asyncData.jobId) {
            setAsyncJobId(asyncData.jobId);
            // Start polling for job completion
            pollAsyncJob(asyncData.jobId, startTime);
            return { isAsync: true, jobId: asyncData.jobId }; // Don't process as normal response
          } else {
            throw new Error(asyncData.message || 'Failed to start async processing');
          }
        } else {
          // Short transcript - use streaming
          console.log('Using streaming for normal transcript');
          const response = await apiRequest("POST", "/api/chat-parity-stream", {
            clientName,
            transcript,
            template: "gold-standard",
            fundingType: fundingType || undefined,
            fundingLevel: fundingLevel || undefined,
            sessionId: newSessionId,
          });
          
          const endTime = Date.now();
          const totalTime = Math.round((endTime - startTime) / 1000);
          setGenerationTime(totalTime);
          
          return response.json();
        }
      } else {
        // Offline mode
        const response = await apiRequest("POST", "/api/offline-analysis", {
          clientName,
          transcript,
          template: "gold-standard",
          fundingType: fundingType || undefined,
          fundingLevel: fundingLevel || undefined,
          sessionId: newSessionId,
        });
        
        const endTime = Date.now();
        const totalTime = Math.round((endTime - startTime) / 1000);
        setGenerationTime(totalTime);
        
        return response.json();
      }
    },
    onSuccess: (data) => {
      // Skip normal processing if this is an async job
      if (data.isAsync) {
        console.log('Async job started, skipping normal success handling');
        toast({
          title: "Long Transcript Detected",
          description: "Processing in background to avoid timeout. You'll be notified when complete.",
        });
        return;
      }
      
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
      setIsAsyncProcessing(false);
      setAsyncJobId(null);
      setAsyncProgress(0);
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-user-menu">
                  <User className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{user?.firstName || user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.role === "admin" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" data-testid="link-admin">
                        <Users className="mr-2 h-4 w-4" />
                        <span>User Management</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          isLoading={generateMutation.isPending || isAsyncProcessing}
          isFetchingNotta={isFetchingNotta}
        />

        {/* Agent Updates - Show only when generating with AI */}
        {(generateMutation.isPending || isAsyncProcessing) && processingMode === "ai" && (
          <div className="w-full lg:w-80 p-4 border-r border-border bg-card/50 lg:min-h-0 lg:max-h-full lg:overflow-y-auto">
            {isAsyncProcessing ? (
              /* Async Processing Status */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Background Processing</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Processing long transcript asynchronously to avoid timeouts...
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{asyncProgress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${asyncProgress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-secondary/50 p-2 rounded border">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Job ID:</div>
                    <div className="text-xs font-mono break-all">{asyncJobId}</div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing in background...</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Streaming Updates */
              <AgentUpdates
                sessionId={sessionId || undefined}
                isGenerating={generateMutation.isPending}
                onComplete={handleAgentCompletion}
              />
            )}
          </div>
        )}

        <FactsPanel
          facts={facts}
          isProcessing={generateMutation.isPending || isAsyncProcessing}
          isCollapsed={isFactsPanelCollapsed}
          onToggleCollapse={() => setIsFactsPanelCollapsed(!isFactsPanelCollapsed)}
        />

        <CarePlanPreview
          html={html}
          isLoading={generateMutation.isPending || isAsyncProcessing}
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
