import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { fundingLevels } from "@shared/schema";

interface BatchJob {
  id: number;
  nottaUrl: string;
  clientName: string;
  fundingType: "hcp" | "sah" | "";
  fundingLevel: string;
  status: "pending" | "processing" | "completed" | "error";
  transcript?: string;
  carePlanId?: string;
  error?: string;
}

interface BatchProcessorProps {
  isVisible: boolean;
}

export function BatchProcessor({ isVisible }: BatchProcessorProps) {
  const [jobs, setJobs] = useState<BatchJob[]>([
    { id: 1, nottaUrl: "", clientName: "", fundingType: "", fundingLevel: "", status: "pending" },
    { id: 2, nottaUrl: "", clientName: "", fundingType: "", fundingLevel: "", status: "pending" },
    { id: 3, nottaUrl: "", clientName: "", fundingType: "", fundingLevel: "", status: "pending" },
    { id: 4, nottaUrl: "", clientName: "", fundingType: "", fundingLevel: "", status: "pending" }
  ]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobIndex, setCurrentJobIndex] = useState(-1);
  const [overallProgress, setOverallProgress] = useState(0);

  const updateJob = (id: number, updates: Partial<BatchJob>) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, ...updates } : job
    ));
  };

  const getStatusIcon = (status: BatchJob["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "processing":
        return <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const processBatch = async () => {
    setIsProcessing(true);
    setOverallProgress(0);
    
    const validJobs = jobs.filter(job => job.nottaUrl && job.clientName);
    
    for (let i = 0; i < validJobs.length; i++) {
      const job = validJobs[i];
      setCurrentJobIndex(i);
      updateJob(job.id, { status: "processing" });
      
      try {
        // Step 1: Fetch transcript from Notta
        const nottaResponse = await fetch("/api/notta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: job.nottaUrl }),
        });
        
        if (!nottaResponse.ok) {
          throw new Error("Failed to fetch from Notta");
        }
        
        const { transcript } = await nottaResponse.json();
        updateJob(job.id, { transcript });
        
        // Step 2: Generate care plan
        const carePlanResponse = await fetch("/api/chat-parity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: transcript,
            clientName: job.clientName,
            fundingType: job.fundingType,
            fundingLevel: job.fundingLevel,
          }),
        });
        
        if (!carePlanResponse.ok) {
          throw new Error("Failed to generate care plan");
        }
        
        const { html: carePlanHtml } = await carePlanResponse.json();
        
        // Step 3: Save care plan
        const saveResponse = await fetch("/api/saved-care-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: job.clientName,
            html: carePlanHtml,
            transcript,
            fundingType: job.fundingType,
            fundingLevel: job.fundingLevel,
          }),
        });
        
        if (!saveResponse.ok) {
          throw new Error("Failed to save care plan");
        }
        
        const { id: carePlanId } = await saveResponse.json();
        updateJob(job.id, { status: "completed", carePlanId });
        
      } catch (error) {
        updateJob(job.id, { 
          status: "error", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
      
      setOverallProgress(((i + 1) / validJobs.length) * 100);
    }
    
    setIsProcessing(false);
    setCurrentJobIndex(-1);
  };

  const stopProcessing = () => {
    setIsProcessing(false);
    setCurrentJobIndex(-1);
    // Reset processing jobs back to pending
    setJobs(prev => prev.map(job => 
      job.status === "processing" ? { ...job, status: "pending" } : job
    ));
  };

  const resetBatch = () => {
    setJobs(prev => prev.map(job => ({
      ...job,
      status: "pending" as const,
      transcript: undefined,
      carePlanId: undefined,
      error: undefined
    })));
    setOverallProgress(0);
  };

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Batch Processing - Multiple Notta URLs</span>
          <div className="flex items-center space-x-2">
            {!isProcessing ? (
              <Button 
                onClick={processBatch}
                disabled={!jobs.some(job => job.nottaUrl && job.clientName)}
                data-testid="button-start-batch"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Batch
              </Button>
            ) : (
              <Button 
                onClick={stopProcessing}
                variant="destructive"
                data-testid="button-stop-batch"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
            <Button 
              onClick={resetBatch}
              variant="outline"
              disabled={isProcessing}
              data-testid="button-reset-batch"
            >
              Reset
            </Button>
          </div>
        </CardTitle>
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job, index) => (
            <div 
              key={job.id} 
              className={`p-4 border rounded-lg ${
                currentJobIndex === index ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center">
                  {getStatusIcon(job.status)}
                  <span className="ml-2">Job {job.id}</span>
                </h3>
                <span className="text-sm text-muted-foreground capitalize">
                  {job.status}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor={`notta-url-${job.id}`} className="text-sm">
                    Notta URL
                  </Label>
                  <Input
                    id={`notta-url-${job.id}`}
                    data-testid={`input-notta-url-${job.id}`}
                    value={job.nottaUrl}
                    onChange={(e) => updateJob(job.id, { nottaUrl: e.target.value })}
                    placeholder="https://notta.ai/..."
                    disabled={isProcessing}
                  />
                </div>
                
                <div>
                  <Label htmlFor={`client-name-${job.id}`} className="text-sm">
                    Client Name
                  </Label>
                  <Input
                    id={`client-name-${job.id}`}
                    data-testid={`input-client-name-${job.id}`}
                    value={job.clientName}
                    onChange={(e) => updateJob(job.id, { clientName: e.target.value })}
                    placeholder="Client full name"
                    disabled={isProcessing}
                  />
                </div>
                
                <div>
                  <Label htmlFor={`funding-type-${job.id}`} className="text-sm">
                    Funding Type
                  </Label>
                  <Select 
                    value={job.fundingType} 
                    onValueChange={(value: "hcp" | "sah") => updateJob(job.id, { fundingType: value })}
                    disabled={isProcessing}
                  >
                    <SelectTrigger data-testid={`select-funding-type-${job.id}`}>
                      <SelectValue placeholder="Select funding type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hcp">Home Care Package (HCP)</SelectItem>
                      <SelectItem value="sah">Support at Home (SaH)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor={`funding-level-${job.id}`} className="text-sm">
                    Funding Level
                  </Label>
                  <Select 
                    value={job.fundingLevel} 
                    onValueChange={(value) => updateJob(job.id, { fundingLevel: value })}
                    disabled={isProcessing || !job.fundingType}
                  >
                    <SelectTrigger data-testid={`select-funding-level-${job.id}`}>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {job.fundingType && Object.entries(fundingLevels[job.fundingType]).map(([key, level]) => (
                        <SelectItem key={key} value={key}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {job.error && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                  Error: {job.error}
                </div>
              )}
              
              {job.status === "completed" && job.carePlanId && (
                <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-400">
                  ✅ Care plan generated and saved successfully
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}