import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Upload, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Download,
  Trash2,
  Eye,
  FileType
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DocumentAnalysis } from "@shared/schema";
import scrblLogo from "@/assets/scrbl-logo.png";

export default function DocumentAnalysisPage() {
  const [selectedAnalysis, setSelectedAnalysis] = useState<DocumentAnalysis | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all document analyses
  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["/api/document-analysis"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/document-analysis");
      return response.json() as Promise<DocumentAnalysis[]>;
    },
  });

  // Process document mutation
  const processDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PUT", `/api/document-analysis/${id}/process`);
      return response.json() as Promise<DocumentAnalysis>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-analysis"] });
      toast({
        title: "Success",
        description: "Document analysis completed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process document",
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/document-analysis/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-analysis"] });
      setSelectedAnalysis(null);
      toast({
        title: "Success",
        description: "Document analysis deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  // Handle file upload completion
  const handleUploadComplete = async (fileData: {
    fileName: string;
    fileType: string;
    fileSize: string;
    objectPath: string;
  }) => {
    try {
      // Create document analysis record
      const response = await apiRequest("POST", "/api/document-analysis", {
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize,
        objectPath: fileData.objectPath,
        processingStatus: "pending",
      });

      const analysis = await response.json() as DocumentAnalysis;
      
      // Immediately start processing
      processDocumentMutation.mutate(analysis.id);
      
      queryClient.invalidateQueries({ queryKey: ["/api/document-analysis"] });
      
      toast({
        title: "Upload successful",
        description: "Document uploaded and processing started",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create document record",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "processing":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatFileSize = (sizeStr: string | null) => {
    if (!sizeStr) return "Unknown size";
    return sizeStr;
  };

  const renderAnalysisResult = (analysis: DocumentAnalysis) => {
    if (!analysis.analysisResult) return null;

    const result = analysis.analysisResult as any;
    
    return (
      <div className="space-y-6">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{result.summary}</p>
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-500">Document Type: </span>
              <Badge variant="outline">{result.keyInformation?.documentType}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Key Information */}
        {result.keyInformation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.keyInformation.mainTopics?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Main Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.keyInformation.mainTopics.map((topic: string, index: number) => (
                      <Badge key={index} variant="secondary">{topic}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.keyInformation.keyPeople?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Key People</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.keyInformation.keyPeople.map((person: any, index: number) => (
                      <li key={index} className="text-sm">
                        <strong>{person.name}</strong>
                        {person.role && <span className="text-gray-600"> - {person.role}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.keyInformation.importantDates?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Important Dates</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.keyInformation.importantDates.map((date: any, index: number) => (
                      <li key={index} className="text-sm">
                        <strong>{date.date}</strong>: {date.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.keyInformation.financialInformation?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Financial Information</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.keyInformation.financialInformation.map((info: any, index: number) => (
                      <li key={index} className="text-sm">
                        <strong>{info.amount}</strong>: {info.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.keyInformation.actionItems?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Action Items</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.keyInformation.actionItems.map((item: string, index: number) => (
                      <li key={index} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.keyInformation.riskFactors?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Risk Factors</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.keyInformation.riskFactors.map((risk: string, index: number) => (
                      <li key={index} className="text-sm text-red-600">{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.keyInformation.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.keyInformation.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-sm text-green-600">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Extracted Text */}
        {analysis.extractedText && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Extracted Text</CardTitle>
              <CardDescription>Raw text extracted from the document</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full border rounded p-4">
                <pre className="text-sm whitespace-pre-wrap">{analysis.extractedText}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (selectedAnalysis) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <img src={scrblLogo} alt="Scrbl" className="h-8 w-auto" />
                <div className="hidden md:flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedAnalysis(null)}
                    className="flex items-center space-x-2"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Documents</span>
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteDocumentMutation.mutate(selectedAnalysis.id)}
                  disabled={deleteDocumentMutation.isPending}
                  data-testid="button-delete"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900" data-testid="text-document-name">
                  {selectedAnalysis.fileName}
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500">
                    {formatFileSize(selectedAnalysis.fileSize)}
                  </span>
                  <Badge variant="outline">{selectedAnalysis.fileType}</Badge>
                  {getStatusBadge(selectedAnalysis.processingStatus)}
                </div>
              </div>
            </div>
          </div>

          {selectedAnalysis.processingStatus === "failed" && selectedAnalysis.errorMessage && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-700">{selectedAnalysis.errorMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedAnalysis.processingStatus === "completed" && renderAnalysisResult(selectedAnalysis)}
          
          {selectedAnalysis.processingStatus === "processing" && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Processing document...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img src={scrblLogo} alt="Scrbl" className="h-8 w-auto" />
              <div className="hidden md:flex items-center space-x-4">
                <Link href="/" className="text-gray-500 hover:text-gray-900" data-testid="link-home">
                  Care Planner
                </Link>
                <Link href="/saved-plans" className="text-gray-500 hover:text-gray-900" data-testid="link-saved-plans">
                  Saved Plans
                </Link>
                <span className="text-gray-900 font-medium">Document Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Analysis</h1>
          <p className="text-gray-600">
            Upload documents and let AI extract key information for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Upload Document</span>
              </CardTitle>
              <CardDescription>
                Upload PDF, Word documents, or images for AI-powered analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ObjectUploader
                clientName="Document Analysis"
                onUploadComplete={handleUploadComplete}
                className="w-full"
                data-testid="button-upload"
              >
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Choose Document</span>
                </div>
              </ObjectUploader>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>Supported formats:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>PDF documents</li>
                  <li>Word documents (.docx)</li>
                  <li>Images (PNG, JPG, JPEG) - OCR will be used</li>
                  <li>Plain text files</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Info Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>AI Analysis Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Smart Text Extraction</h4>
                    <p className="text-sm text-gray-600">Extract text from PDFs, documents, and images using OCR</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Key Information Detection</h4>
                    <p className="text-sm text-gray-600">Identify important dates, people, financial info, and topics</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Risk & Action Items</h4>
                    <p className="text-sm text-gray-600">Automatically identify potential risks and actionable items</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Document Summarization</h4>
                    <p className="text-sm text-gray-600">Generate concise summaries of document content</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document List */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Document Analyses</CardTitle>
              <CardDescription>
                Your uploaded documents and their analysis results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600">Loading documents...</p>
                </div>
              ) : analyses.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No documents uploaded yet</p>
                  <p className="text-sm text-gray-500">Upload a document above to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyses.map((analysis) => (
                    <div 
                      key={analysis.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedAnalysis(analysis)}
                      data-testid={`card-analysis-${analysis.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileType className="w-5 h-5 text-gray-400" />
                          <div>
                            <h4 className="font-medium" data-testid={`text-filename-${analysis.id}`}>
                              {analysis.fileName}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {formatFileSize(analysis.fileSize)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {analysis.fileType}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(analysis.processingStatus)}
                          <Button variant="ghost" size="sm" data-testid={`button-view-${analysis.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {analysis.processingStatus === "processing" && (
                        <div className="mt-2 text-xs text-blue-600 flex items-center">
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          Processing...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}