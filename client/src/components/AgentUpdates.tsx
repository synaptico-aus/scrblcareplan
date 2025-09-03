import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertCircle, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AgentUpdate {
  type: 'status' | 'action' | 'complete' | 'error' | 'ping';
  message?: string;
  action?: string;
  step?: number;
  totalSteps?: number;
  result?: any;
  chunkProgress?: {
    current: number;
    total: number;
  };
}

interface AgentUpdatesProps {
  sessionId?: string;
  isGenerating: boolean;
  onComplete?: (result: any) => void;
}

export function AgentUpdates({ sessionId, isGenerating, onComplete }: AgentUpdatesProps) {
  const [updates, setUpdates] = useState<AgentUpdate[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(8);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [chunkProgress, setChunkProgress] = useState<{current: number; total: number} | null>(null);

  useEffect(() => {
    if (!sessionId || !isGenerating) {
      return;
    }

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const connectToStream = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(`/api/generation-stream/${sessionId}`);
      
      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionAttempts(0);
      };

      eventSource.onmessage = (event) => {
        try {
          const update: AgentUpdate = JSON.parse(event.data);
          
          // SSE event processing
          
          if (update.type === 'ping' || (update as any).type === 'connected') {
            return;
          }

          setUpdates(prev => [...prev, update]);

          if (update.step && update.totalSteps) {
            setCurrentStep(update.step);
            setTotalSteps(update.totalSteps);
          }

          // Handle chunk progress updates
          if (update.chunkProgress) {
            setChunkProgress(update.chunkProgress);
          } else {
            setChunkProgress(null); // Clear chunk progress when not chunking
          }

          if (update.type === 'action' && update.action) {
            setActions(prev => [...prev, update.action as string]);
          }

          if (update.type === 'complete' && update.result && onComplete) {
            onComplete(update.result);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        
        // Retry connection for deployment environments
        if (connectionAttempts < 5) {
          setConnectionAttempts(prev => prev + 1);
          retryTimeout = setTimeout(() => {
            connectToStream();
          }, Math.min(1000 * Math.pow(2, connectionAttempts), 10000)); // Exponential backoff, max 10s
        }
      };
    };

    connectToStream();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      setIsConnected(false);
    };
  }, [sessionId, isGenerating, onComplete, connectionAttempts]);

  // Reset updates when starting a new generation
  useEffect(() => {
    if (isGenerating && sessionId) {
      setUpdates([]);
      setActions([]);
      setCurrentStep(0);
      setTotalSteps(8);
      setChunkProgress(null);
    }
  }, [isGenerating, sessionId]);

  if (!isGenerating || !sessionId) {
    return null;
  }

  const progressPercentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  const latestUpdate = updates[updates.length - 1];
  const latestAction = actions[actions.length - 1];

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="agent-updates">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Agent Updates
          <div className="flex items-center gap-1 ml-auto">
            {isConnected ? (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <Badge variant="secondary" className="text-xs">Live</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <Badge variant="destructive" className="text-xs">Offline</Badge>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{Math.floor(currentStep)} of {totalSteps}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          
          {/* Chunk Progress Indicator */}
          {chunkProgress && chunkProgress.total > 1 && (
            <div className="space-y-1 pt-2 border-t border-border/50">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing Sections</span>
                <span>{chunkProgress.current} of {chunkProgress.total}</span>
              </div>
              <Progress 
                value={(chunkProgress.current / chunkProgress.total) * 100} 
                className="h-1.5" 
              />
              <p className="text-xs text-muted-foreground">
                Large transcript detected - processing in sections for better reliability
              </p>
            </div>
          )}
        </div>

        {/* Current Action */}
        {latestAction && (
          <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20" data-testid="current-action">
            <div className="flex-shrink-0 mt-0.5">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-5">
                {latestAction}
              </p>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {latestUpdate && latestUpdate.type === 'error' && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20" data-testid="error-message">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-5">
                {latestUpdate.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try again or contact support if the issue persists.
              </p>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {latestUpdate && latestUpdate.type === 'complete' && (
          <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20" data-testid="completion-message">
            <div className="flex-shrink-0 mt-0.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-5">
                {latestUpdate.message || "Care plan generation complete!"}
              </p>
            </div>
          </div>
        )}

        {/* Actions History */}
        {actions.length > 1 && (
          <div className="space-y-2" data-testid="actions-history">
            <h4 className="text-sm font-medium text-muted-foreground">Completed Actions:</h4>
            <div className="space-y-1.5">
              {actions.slice(0, -1).map((action, index) => (
                <div key={index} className="flex items-start gap-2 text-xs">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5"></div>
                  <span className="text-muted-foreground leading-relaxed">{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {isConnected ? (
            <span className="flex items-center justify-center gap-1">
              <div className="w-1 h-1 bg-green-500 rounded-full"></div>
{currentStep > 0 ? `Processing step ${currentStep} of ${totalSteps}...` : 'Waiting for updates...'}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1">
              <div className="w-1 h-1 bg-red-500 rounded-full"></div>
              Connection lost - retrying...
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}