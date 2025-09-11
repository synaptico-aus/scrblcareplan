import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Search, Trash2, Eye, Calendar, User, ArrowLeft, Info, Download, FileType, Folder, Upload, File, Plus, Edit, LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SavedCarePlan, ExtractedFacts, ClientDocument, ClientFolderAlias } from "@shared/schema";
import scrblLogo from "@/assets/scrbl-logo.png";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { ObjectUploader } from "@/components/ObjectUploader";

interface SavedPlansProps {
  onLogout?: () => void;
}

export default function SavedPlans({ onLogout }: SavedPlansProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<SavedCarePlan | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingClient, setRenamingClient] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
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
  
  const { data: clientFolderAliases = [] } = useQuery({
    queryKey: ["/api/client-folder-aliases"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/client-folder-aliases");
      return response.json() as Promise<ClientFolderAlias[]>;
    },
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
  
  const renameFolderMutation = useMutation({
    mutationFn: async ({ originalClientName, displayName }: { originalClientName: string; displayName: string }) => {
      const response = await apiRequest("PUT", `/api/client-folder-aliases/${encodeURIComponent(originalClientName)}`, {
        displayName
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-folder-aliases"] });
      setRenameDialogOpen(false);
      setRenamingClient(null);
      setNewFolderName("");
      toast({
        title: "Folder Renamed",
        description: "The folder has been successfully renamed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Rename Failed",
        description: error.message || "Failed to rename folder",
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
  
  // Create alias map for quick lookup
  const aliasMap = clientFolderAliases.reduce((map, alias) => {
    map[alias.originalClientName] = alias.displayName;
    return map;
  }, {} as Record<string, string>);
  
  // Get client folders with latest dates and document counts
  const clientFolders = Object.entries(clientGroups).map(([clientName, plans]) => {
    const latestPlan = plans.sort((a, b) => new Date(b.saveDate).getTime() - new Date(a.saveDate).getTime())[0];
    const documentCount = clientDocuments.filter(doc => doc.clientName === clientName).length;
    const displayName = aliasMap[clientName] || clientName;
    return {
      clientName,
      displayName,
      planCount: plans.length,
      documentCount,
      latestDate: latestPlan.saveDate,
      plans
    };
  }).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  
  // Filter client folders based on search (search both original and display names)
  const filteredClientFolders = clientFolders.filter(folder =>
    folder.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewPlan = (plan: SavedCarePlan) => {
    setSelectedPlan(plan);
  };
  
  const handleRenameFolder = (clientName: string, currentDisplayName: string) => {
    setRenamingClient(clientName);
    setNewFolderName(currentDisplayName);
    setRenameDialogOpen(true);
  };
  
  const handleRenameSubmit = () => {
    if (!renamingClient || !newFolderName.trim()) return;
    
    renameFolderMutation.mutate({
      originalClientName: renamingClient,
      displayName: newFolderName.trim()
    });
  };
  
  const getDisplayName = (clientName: string) => {
    return aliasMap[clientName] || clientName;
  };
  
  const handleDownloadDocument = (doc: ClientDocument) => {
    let downloadUrl = doc.objectPath;
    
    // Handle both old format (Google Cloud Storage URLs) and new format (/objects/ paths)
    if (downloadUrl.startsWith('https://storage.googleapis.com/')) {
      // For old documents, request download through backend API which will handle the conversion
      downloadUrl = `/api/documents/download?url=${encodeURIComponent(downloadUrl)}`;
    }
    // New documents already have the correct /objects/ path format
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = doc.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    return new Date(date).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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
        <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPlan(null)}
                data-testid="button-back-to-client"
                size="sm"
              >
                ← Back to {selectedPlan.clientName}
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{selectedPlan.name}</h1>
                <p className="text-sm text-muted-foreground">Client: {selectedPlan.clientName}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
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
                size="sm"
                className="w-full sm:w-auto"
              >
                Print
              </Button>
              <Button
                onClick={() => handleExportToPDF(selectedPlan)}
                className="bg-red-500 text-white hover:bg-red-600 w-full sm:w-auto"
                data-testid="button-export-pdf"
                size="sm"
              >
                <FileType className="h-4 w-4 mr-2" />
                Export to PDF
              </Button>
              <Button
                onClick={() => handleExportToWord(selectedPlan)}
                className="bg-blue-500 text-white hover:bg-blue-600 w-full sm:w-auto"
                data-testid="button-export-word"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Word
              </Button>
            </div>
          </div>
        </header>

        {/* Care Plan Content */}
        <div className="p-4 sm:p-6 max-w-6xl mx-auto">
          {/* Extracted Facts Section */}
          {selectedPlan.extractedFacts && typeof selectedPlan.extractedFacts === 'object' && selectedPlan.extractedFacts !== null && (
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
          <div className="care-plan-document bg-white shadow-lg rounded-lg p-4 sm:p-8">
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
        <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button 
                variant="outline" 
                onClick={handleBackToFolders}
                data-testid="button-back-to-folders"
                size="sm"
              >
                ← Back to Client Folders
              </Button>
              <div className="bg-primary text-primary-foreground p-1.5 sm:p-2 rounded-lg">
                <Folder className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-foreground">{getDisplayName(selectedClient)}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {clientPlans.length} care plan{clientPlans.length !== 1 ? 's' : ''} • {selectedClientDocuments.length} document{selectedClientDocuments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ObjectUploader
                clientName={selectedClient}
                onUploadComplete={handleUploadComplete}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </ObjectUploader>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientPlans.map((plan) => (
                  <Card key={plan.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg">{plan.name}</CardTitle>
                      <CardDescription className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDateTime(plan.saveDate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2">
                        <Button 
                          onClick={() => handleViewPlan(plan)}
                          size="sm"
                          data-testid={`button-view-plan-${plan.id}`}
                          className="w-full sm:w-auto"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Plan
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id, plan.name)}
                          data-testid={`button-delete-plan-${plan.id}`}
                          className="w-full sm:w-auto"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedClientDocuments.map((document) => (
                  <Card key={document.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm truncate">{document.fileName}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center justify-between text-xs">
                          <span>{document.fileSize}</span>
                          <span>{formatDateTime(document.uploadedAt!)}</span>
                        </div>
                        {document.description && (
                          <p className="mt-1 text-xs">{document.description}</p>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2">
                        <Button 
                          size="sm"
                          onClick={() => handleDownloadDocument(document)}
                          data-testid={`button-download-document-${document.id}`}
                          className="w-full sm:w-auto"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteDocumentMutation.mutate(document.id)}
                          data-testid={`button-delete-document-${document.id}`}
                          className="w-full sm:w-auto"
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
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="bg-primary text-primary-foreground p-1.5 sm:p-2 rounded-lg">
              <Folder className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">Client Folders</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Organize care plans and documents by client</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/">
              <Button variant="outline" data-testid="button-back-to-planner" size="sm" className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Planner</span>
                <span className="sm:hidden">Planner</span>
              </Button>
            </Link>
            {onLogout && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onLogout}
                data-testid="button-logout-saved-plans" 
                className="w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredClientFolders.map((folder) => (
              <Card 
                key={folder.clientName} 
                className="group hover:shadow-md transition-shadow cursor-pointer"
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
                        <CardTitle className="text-lg">{folder.displayName}</CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          Last updated: {formatDateTime(folder.latestDate)}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameFolder(folder.clientName, folder.displayName);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-rename-${folder.clientName.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
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
      
      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Folder Name</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter new folder name"
                data-testid="input-rename-folder"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit();
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setRenameDialogOpen(false)}
                data-testid="button-cancel-rename"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRenameSubmit}
                disabled={!newFolderName.trim() || renameFolderMutation.isPending}
                data-testid="button-confirm-rename"
              >
                {renameFolderMutation.isPending ? "Renaming..." : "Rename"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}