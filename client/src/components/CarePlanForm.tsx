import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Settings } from "lucide-react";

interface CarePlanFormProps {
  clientName: string;
  setClientName: (name: string) => void;
  transcript: string;
  setTranscript: (transcript: string) => void;
  processingMode: "ai" | "offline";
  setProcessingMode: (mode: "ai" | "offline") => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export function CarePlanForm({
  clientName,
  setClientName,
  transcript,
  setTranscript,
  processingMode,
  setProcessingMode,
  onGenerate,
  isLoading
}: CarePlanFormProps) {
  return (
    <div className="w-1/3 bg-card border-r border-border flex flex-col">
      {/* Client Information */}
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg mr-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
          </div>
          Client Information
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="client-name" className="block text-sm font-medium text-foreground mb-2">
              Client Name
            </Label>
            <Input
              id="client-name"
              data-testid="input-client-name"
              type="text"
              className="w-full"
              placeholder="Enter client full name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium">Processing Mode:</span>
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                data-testid="button-ai-mode"
                variant={processingMode === "ai" ? "default" : "ghost"}
                size="sm"
                className="px-3 py-1 rounded text-sm"
                onClick={() => setProcessingMode("ai")}
              >
                AI Mode
              </Button>
              <Button
                data-testid="button-offline-mode"
                variant={processingMode === "offline" ? "default" : "ghost"}
                size="sm"
                className="px-3 py-1 rounded text-sm"
                onClick={() => setProcessingMode("offline")}
              >
                Offline
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Input */}
      <div className="flex-1 p-6 flex flex-col">
        <div className="mb-4">
          <h3 className="text-md font-semibold mb-2 flex items-center">
            <svg className="w-5 h-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            Assessment Transcript
          </h3>
          <p className="text-sm text-muted-foreground">
            Paste the raw assessment transcript below. Include all dialogue, timestamps, and administrative content.
          </p>
        </div>
        <div className="flex-1 relative">
          <Textarea
            data-testid="textarea-transcript"
            className="w-full h-full p-4 resize-none text-sm"
            placeholder={`Paste assessment transcript here...

Example:
Unknown speaker 00:00
and no cultural factors and do you have mum's pension and Medicare card to hand at all please yep okay thank you...

Unknown speaker 03:08
I can't find out. I think the words are in the end...`}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </div>
        
        <div className="mt-4 flex space-x-3">
          <Button
            data-testid="button-generate-care-plan"
            className="flex-1"
            onClick={onGenerate}
            disabled={isLoading || !clientName.trim() || !transcript.trim()}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                Generate Care Plan
              </>
            )}
          </Button>
          <Button
            data-testid="button-upload-file"
            variant="outline"
            size="icon"
            className="px-4"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
