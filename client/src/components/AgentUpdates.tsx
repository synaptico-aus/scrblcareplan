import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertCircle, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AgentUpdate {
  type: 'status' | 'complete' | 'error' | 'ping';
  message: string;
  step?: number;
  totalSteps?: number;
  result?: any;
}

interface AgentUpdatesProps {
  sessionId?: string;
  isGenerating: boolean;
  onComplete?: (result: any) => void;
}

export function AgentUpdates({ sessionId, isGenerating, onComplete }: AgentUpdatesProps) {
  const [updates, setUpdates] = useState<AgentUpdate[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(4);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!sessionId || !isGenerating) {
      return;
    }

    const eventSource = new EventSource(`/api/generation-stream/${sessionId}`);
    
    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const update: AgentUpdate = JSON.parse(event.data);
        
        if (update.type === 'ping') {
          return;
        }

        setUpdates(prev => [...prev, update]);

        if (update.step && update.totalSteps) {
          setCurrentStep(update.step);
          setTotalSteps(update.totalSteps);
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
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [sessionId, isGenerating, onComplete]);

  // Reset updates when starting a new generation
  useEffect(() => {
    if (isGenerating && sessionId) {
      setUpdates([]);
      setCurrentStep(0);
      setTotalSteps(4);
    }
  }, [isGenerating, sessionId]);

  if (!isGenerating || !sessionId) {
    return null;
  }

  const progressPercentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  const latestUpdate = updates[updates.length - 1];

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
            <span>{currentStep} of {totalSteps}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Latest Update */}
        {latestUpdate && (
          <div className="flex items-start gap-3 p-3 bg-accent/20 rounded-lg border" data-testid="latest-update">
            <div className="flex-shrink-0 mt-0.5">
              {latestUpdate.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : latestUpdate.type === 'complete' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-5">
                {latestUpdate.message}
              </p>
              {latestUpdate.type === 'error' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Please try again or contact support if the issue persists.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Update History */}
        {updates.length > 1 && (
          <div className="space-y-2" data-testid="update-history">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Steps:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {updates.slice(0, -1).reverse().map((update, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0"></div>
                  <span className="truncate">{update.message}</span>
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
              Real-time updates active
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