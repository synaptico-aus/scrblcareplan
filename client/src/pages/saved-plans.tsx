import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Trash2, Eye, Calendar, User, ArrowLeft, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SavedCarePlan, ExtractedFacts } from "@shared/schema";

export default function SavedPlans() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<SavedCarePlan | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: savedPlans = [], isLoading } = useQuery({
    queryKey: ["/api/saved-care-plans"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/saved-care-plans");
      return response.json() as Promise<SavedCarePlan[]>;
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

  const filteredPlans = savedPlans.filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewPlan = (plan: SavedCarePlan) => {
    setSelectedPlan(plan);
  };

  const handleDeletePlan = (id: string, planName: string) => {
    if (confirm(`Are you sure you want to delete "${planName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
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
                data-testid="button-back-to-list"
              >
                ← Back to Saved Plans
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
            <div 
              dangerouslySetInnerHTML={{ __html: selectedPlan.html as string }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Saved Care Plans</h1>
              <p className="text-sm text-muted-foreground">View and manage your saved care plans</p>
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
              placeholder="Search care plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-plans"
            />
          </div>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading saved care plans...</p>
            </div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? "No plans found" : "No saved care plans"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Save care plans from the main planner to see them here"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <Card key={plan.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <User className="h-4 w-4 mr-1" />
                        {plan.clientName}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      Saved: {formatDate(plan.saveDate)}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPlan(plan)}
                        className="flex-1"
                        data-testid={`button-view-plan-${plan.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-plan-${plan.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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