import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Trash2, Eye, Calendar, User, ArrowLeft, Info, Download, FileType, Folder, Upload, File, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SavedCarePlan, ExtractedFacts, ClientDocument } from "@shared/schema";
import scrblLogo from "@/assets/scrbl-logo.png";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { ObjectUploader } from "@/components/ObjectUploader";

export default function SavedPlans() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<SavedCarePlan | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: savedPlans = [], isLoading } = useQuery({
    queryKey: ["/api/saved-care-plans"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/saved-care-plans");
      return response.json() as Promise<SavedCarePlan[]>;
    },
  });
  
  const { data: clientDocuments = [] } = useQuery({
    queryKey: ["/api/client-documents"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/client-documents");
      return response.json() as Promise<ClientDocument[]>;
    },
  });
  
  const { data: selectedClientDocuments = [] } = useQuery({
    queryKey: ["/api/client-documents", selectedClient],
    queryFn: async () => {
      if (!selectedClient) return [];
      const response = await apiRequest("GET", `/api/client-documents/${encodeURIComponent(selectedClient)}`);
      return response.json() as Promise<ClientDocument[]>;
    },
    enabled: !!selectedClient,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/saved-care-plans/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-care-plans"] });
      toast({
        title: "Care Plan Deleted",
        description: "The care plan has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete care plan",
        variant: "destructive",
      });
    },
  });
  
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/client-documents/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-documents"] });
      if (selectedClient) {
        queryClient.invalidateQueries({ queryKey: ["/api/client-documents", selectedClient] });
      }
      toast({
        title: "Document Deleted",
        description: "The document has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  // Group saved plans by client name
  const clientGroups = savedPlans.reduce((groups, plan) => {
    const client = plan.clientName;
    if (!groups[client]) {
      groups[client] = [];
    }
    groups[client].push(plan);
    return groups;
  }, {} as Record<string, SavedCarePlan[]>);
  
  // Get client folders with latest dates and document counts
  const clientFolders = Object.entries(clientGroups).map(([clientName, plans]) => {
    const latestPlan = plans.sort((a, b) => new Date(b.saveDate).getTime() - new Date(a.saveDate).getTime())[0];
    const documentCount = clientDocuments.filter(doc => doc.clientName === clientName).length;
    return {
      clientName,
      planCount: plans.length,
      documentCount,
      latestDate: latestPlan.saveDate,
      plans
    };
  }).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  
  // Filter client folders based on search
  const filteredClientFolders = clientFolders.filter(folder =>
    folder.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewPlan = (plan: SavedCarePlan) => {
    setSelectedPlan(plan);
  };
  
  const handleSelectClient = (clientName: string) => {
    setSelectedClient(clientName);
  };
  
  const handleBackToFolders = () => {
    setSelectedClient(null);
    setSelectedPlan(null);
  };
  
  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/client-documents"] });
    if (selectedClient) {
      queryClient.invalidateQueries({ queryKey: ["/api/client-documents", selectedClient] });
    }
  };

  const handleDeletePlan = (id: string, planName: string) => {
    if (confirm(`Are you sure you want to delete "${planName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const handleExportToPDF = (plan: SavedCarePlan) => {
    // Create a complete HTML document with Scrbl logo
    const htmlWithLogo = `
      <html>
        <head>
          <title>Care Plan - ${plan.clientName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
            .logo-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ddd; }
            .logo-header img { height: 60px; }
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
          <div class="logo-header">
            <img src="${scrblLogo}" alt="Scrbl Logo" />
          </div>
          ${plan.html}
        </body>
      </html>
    `;
    
    const element = document.createElement('div');
    element.innerHTML = htmlWithLogo;
    
    const opt = {
      margin: 1,
      filename: `${plan.clientName || 'care-plan'}-${new Date(plan.saveDate).toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
    
    toast({
      title: "PDF Export Started",
      description: `Exporting "${plan.name}" to PDF...`,
    });
  };

  const handleExportToWord = (plan: SavedCarePlan) => {
    // Create a complete HTML document with Scrbl logo for Word
    const htmlWithLogo = `
      <html>
        <head>
          <title>Care Plan - ${plan.clientName}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
            .logo-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ddd; }
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
          <div class="logo-header">
            <h2>Scrbl - Digital Care Plan Agent</h2>
          </div>
          ${plan.html}
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlWithLogo], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${plan.clientName || 'care-plan'}-${new Date(plan.saveDate).toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Word Export Complete",
      description: `"${plan.name}" has been exported as a Word document.`,
    });
  };

  const generateFactsHtml = (facts: ExtractedFacts) => {
    return `
      <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #ddd;">
        <h2 style="font-size: 16pt; font-weight: bold; margin-bottom: 15px;">Extracted Facts</h2>
        
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">Client Details</h3>
          <p><strong>Name:</strong> ${facts.clientDetails?.name || "Not documented"}</p>
          <p><strong>Language:</strong> ${facts.clientDetails?.language || "Not documented"}</p>
          <p><strong>Interpreter Required:</strong> ${facts.clientDetails?.interpreterRequired !== undefined ? (facts.clientDetails?.interpreterRequired ? "Yes" : "No") : "Not documented"}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">Medical Information</h3>
          <p><strong>GP:</strong> ${facts.medical?.gp || "Not documented"}</p>
          <p><strong>Pharmacy:</strong> ${facts.medical?.pharmacy || "Not documented"}</p>
          <p><strong>Medications:</strong> ${facts.medical?.medications || "Not documented"}</p>
          <p><strong>Allergies:</strong> ${facts.medical?.allergies || "Not documented"}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">Support Network</h3>
          <p><strong>Primary Contact:</strong> ${facts.support?.primaryContact || "Not documented"}</p>
          <p><strong>Secondary Contact:</strong> ${facts.support?.secondaryContact || "Not documented"}</p>
          <p><strong>Living Arrangement:</strong> ${facts.support?.livingArrangement || "Not documented"}</p>
        </div>
      </div>
    `;
  };

  // Show plan detail view
  if (selectedPlan) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPlan(null)}
                data-testid="button-back-to-client"
              >
                ← Back to {selectedPlan.clientName}
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{selectedPlan.name}</h1>
                <p className="text-sm text-muted-foreground">Client: {selectedPlan.clientName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    const facts = selectedPlan.extractedFacts as ExtractedFacts;
                    const factsSectionHtml = facts ? generateFactsHtml(facts) : '';
                    
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Care Plan - ${selectedPlan.clientName}</title>
                          <style>
                            body { font-family: 'Inter', sans-serif; margin: 40px; line-height: 1.6; }
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
                          ${factsSectionHtml}
                          ${selectedPlan.html}
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
                data-testid="button-print-plan"
              >
                Print
              </Button>
              <Button
                onClick={() => handleExportToPDF(selectedPlan)}
                className="bg-red-500 text-white hover:bg-red-600"
                data-testid="button-export-pdf"
              >
                <FileType className="h-4 w-4 mr-2" />
                Export to PDF
              </Button>
              <Button
                onClick={() => handleExportToWord(selectedPlan)}
                className="bg-blue-500 text-white hover:bg-blue-600"
                data-testid="button-export-word"
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Word
              </Button>
            </div>
          </div>
        </header>

        {/* Care Plan Content */}
        <div className="p-6 max-w-6xl mx-auto">
          {/* Extracted Facts Section */}
          {selectedPlan.extractedFacts && (
            <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-2 mb-6">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Extracted Facts</h2>
              </div>
              
              <div className="space-y-6">
                {/* Client Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Client Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).clientDetails?.name || "Not documented"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Language</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).clientDetails?.language || "Not documented"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Interpreter Required</p>
                      <p className="text-foreground">
                        {(selectedPlan.extractedFacts as ExtractedFacts).clientDetails?.interpreterRequired !== undefined 
                          ? ((selectedPlan.extractedFacts as ExtractedFacts).clientDetails?.interpreterRequired ? "Yes" : "No")
                          : "Not documented"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Medical Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">GP</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).medical?.gp || "Not documented"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pharmacy</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).medical?.pharmacy || "Not documented"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Medications</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).medical?.medications || "Not documented"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Allergies</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).medical?.allergies || "Not documented"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Equipment</p>
                      <p className="text-foreground">
                        {(selectedPlan.extractedFacts as ExtractedFacts).medical?.equipment?.length 
                          ? (selectedPlan.extractedFacts as ExtractedFacts).medical?.equipment?.join(", ")
                          : "Not documented"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Support Network */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Support Network</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Primary Contact</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).support?.primaryContact || "Not documented"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Secondary Contact</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).support?.secondaryContact || "Not documented"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Living Arrangement</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).support?.livingArrangement || "Not documented"}</p>
                    </div>
                  </div>
                </div>

                {/* Risks */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Risk Assessment</h3>
                  {(selectedPlan.extractedFacts as ExtractedFacts).risks?.length ? (
                    <div className="space-y-3">
                      {(selectedPlan.extractedFacts as ExtractedFacts).risks?.map((risk, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-foreground">{risk.type}</p>
                            {risk.severity && (
                              <Badge variant={risk.severity === "high" ? "destructive" : risk.severity === "medium" ? "default" : "secondary"}>
                                {risk.severity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{risk.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No risks documented</p>
                  )}
                </div>

                {/* Preferences */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Preferences</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Worker Preferences</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).preferences?.workerPreferences || "Not documented"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Service Delivery Preferences</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).preferences?.serviceDeliveryPreferences || "Not documented"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cultural Considerations</p>
                      <p className="text-foreground">{(selectedPlan.extractedFacts as ExtractedFacts).preferences?.culturalConsiderations || "Not documented"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Care Plan Document */}
          <div className="care-plan-document bg-white shadow-lg rounded-lg p-8">
            {/* Scrbl Logo Header */}
            <div className="flex justify-center mb-8 pb-6 border-b border-gray-200">
              <img 
                src={scrblLogo} 
                alt="Scrbl Logo" 
                className="h-16 w-auto"
              />
            </div>
            
            <div 
              dangerouslySetInnerHTML={{ __html: selectedPlan.html as string }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show client detail view
  if (selectedClient) {
    const clientPlans = clientGroups[selectedClient] || [];
    
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={handleBackToFolders}
                data-testid="button-back-to-folders"
              >
                ← Back to Client Folders
              </Button>
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{selectedClient}</h1>
                <p className="text-sm text-muted-foreground">
                  {clientPlans.length} care plan{clientPlans.length !== 1 ? 's' : ''} • {selectedClientDocuments.length} document{selectedClientDocuments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ObjectUploader
                clientName={selectedClient}
                onUploadComplete={handleUploadComplete}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </ObjectUploader>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-8">
          {/* Care Plans Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Care Plans ({clientPlans.length})
            </h2>
            {clientPlans.length === 0 ? (
              <div className="text-center py-8 bg-muted/50 rounded-lg">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No care plans for this client</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientPlans.map((plan) => (
                  <Card key={plan.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(plan.saveDate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Button 
                          onClick={() => handleViewPlan(plan)}
                          size="sm"
                          data-testid={`button-view-plan-${plan.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Plan
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id, plan.name)}
                          data-testid={`button-delete-plan-${plan.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Documents Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <File className="h-5 w-5 mr-2" />
              Documents ({selectedClientDocuments.length})
            </h2>
            {selectedClientDocuments.length === 0 ? (
              <div className="text-center py-8 bg-muted/50 rounded-lg">
                <File className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No documents uploaded for this client</p>
                <p className="text-sm text-muted-foreground mt-1">Use the "Upload Document" button to add files</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedClientDocuments.map((document) => (
                  <Card key={document.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-sm truncate">{document.fileName}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center justify-between text-xs">
                          <span>{document.fileSize}</span>
                          <span>{formatDate(document.uploadedAt!)}</span>
                        </div>
                        {document.description && (
                          <p className="mt-1 text-xs">{document.description}</p>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Button 
                          size="sm"
                          onClick={() => window.open(document.objectPath, '_blank')}
                          data-testid={`button-view-document-${document.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteDocumentMutation.mutate(document.id)}
                          data-testid={`button-delete-document-${document.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show client folders view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Client Folders</h1>
              <p className="text-sm text-muted-foreground">Organize care plans and documents by client</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/">
              <Button variant="outline" data-testid="button-back-to-planner">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Planner
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-clients"
            />
          </div>
        </div>

        {/* Client Folders Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading client folders...</p>
            </div>
          </div>
        ) : filteredClientFolders.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? "No clients found" : "No client folders"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Save care plans from the main planner to create client folders"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClientFolders.map((folder) => (
              <Card 
                key={folder.clientName} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSelectClient(folder.clientName)}
                data-testid={`folder-${folder.clientName.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 text-primary p-3 rounded-lg">
                        <Folder className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{folder.clientName}</CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          Last updated: {formatDate(folder.latestDate)}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        {folder.planCount} care plan{folder.planCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center">
                        <File className="h-4 w-4 mr-1" />
                        {folder.documentCount} document{folder.documentCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}