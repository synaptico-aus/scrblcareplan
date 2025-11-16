import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, Shield, FileText, Users, Download, Save, Clock, TrendingUp, Award } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import scrblLogo from "@assets/scrbl-logo.png";
import { MarkdownUserGuide } from "@/components/MarkdownUserGuide";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserProfileSchema, type UpdateUserProfile } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Settings() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalPlans: number;
    timeSavedPerPlan: number;
    totalTimeSaved: number;
  }>({
    queryKey: ['/api/care-plan-stats'],
  });

  const form = useForm<UpdateUserProfile>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      company: user?.company || "",
      phoneNumber: user?.phoneNumber || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await refetchUser();
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateUserProfile) => {
    updateProfileMutation.mutate(data);
  };

  const handleExportUserGuide = async () => {
    try {
      setIsExporting(true);
      
      // Fetch the markdown content
      const response = await fetch('/api/user-guide');
      if (!response.ok) {
        throw new Error('Failed to fetch user guide');
      }
      const markdownContent = await response.text();
      
      // Convert markdown to HTML using a temporary div
      const tempDiv = document.createElement('div');
      const ReactDOMServer = await import('react-dom/server');
      const htmlContent = ReactDOMServer.renderToString(
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdownContent}
        </ReactMarkdown>
      );
      
      // Create the full HTML document
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SCRBL 2.0 User Guide</title>
  <style>
    @page {
      margin: 0.5in;
    }
    body {
      font-family: Calibri, Arial, sans-serif;
      margin: 0.5in;
      line-height: 1.4;
      color: #000;
      font-size: 11pt;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #ddd;
    }
    h1 {
      font-family: Calibri, Arial, sans-serif;
      font-size: 20pt;
      font-weight: bold;
      margin-top: 16px;
      margin-bottom: 8px;
      color: #000;
    }
    h2 {
      font-family: Calibri, Arial, sans-serif;
      font-size: 16pt;
      font-weight: bold;
      margin-top: 14px;
      margin-bottom: 6px;
      color: #000;
    }
    h3 {
      font-family: Calibri, Arial, sans-serif;
      font-size: 13pt;
      font-weight: bold;
      margin-top: 12px;
      margin-bottom: 5px;
      color: #000;
    }
    h4 {
      font-family: Calibri, Arial, sans-serif;
      font-size: 11pt;
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 4px;
      color: #000;
    }
    p {
      margin-bottom: 8px;
      font-size: 11pt;
    }
    ul, ol {
      margin-left: 18px;
      margin-bottom: 8px;
    }
    li {
      margin-bottom: 3px;
      font-size: 11pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #000;
      padding: 6px;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 4px;
      font-family: 'Courier New', Consolas, monospace;
      font-size: 10pt;
    }
    pre {
      background-color: #f4f4f4;
      padding: 8px;
      border: 1px solid #ddd;
      overflow-x: auto;
      font-size: 9pt;
    }
    blockquote {
      border-left: 3px solid #ddd;
      padding-left: 10px;
      margin-left: 0;
      font-style: italic;
      color: #666;
    }
    strong {
      font-weight: bold;
    }
    em {
      font-style: italic;
    }
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>SCRBL 2.0</h1>
    <p>AI Assisted Care Plan Drafts in Minutes</p>
    <h2>User Guide</h2>
  </div>
  ${htmlContent}
</body>
</html>`;

      // Create blob and download
      const blob = new Blob([fullHtml], { type: 'application/msword' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SCRBL-User-Guide-${new Date().toISOString().split('T')[0]}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "User guide has been exported to Word",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export user guide. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img 
              src={scrblLogo} 
              alt="Scrbl Logo" 
              className="h-8 sm:h-10 w-auto"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">SCRBL 2.0</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Settings</p>
            </div>
          </div>
          <Link href="/care-planner">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Care Planner
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6">
          {/* Time Savings Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium">
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  Total Care Plans
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-8 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalPlans || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Plans generated with Scrbl</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium">
                  <Clock className="mr-2 h-4 w-4 text-primary" />
                  Time Saved Per Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-8 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.timeSavedPerPlan || 114} min</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">120 min manual vs ~6 min AI</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium">
                  <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                  Total Time Saved
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-8 bg-muted animate-pulse rounded" />
                ) : (
                  <div>
                    <div className="text-2xl font-bold">
                      {Math.floor((stats?.totalTimeSaved || 0) / 60)} hrs {(stats?.totalTimeSaved || 0) % 60} min
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats?.totalTimeSaved || 0} minutes across all plans
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} value={field.value || ""} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} value={field.value || ""} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Care Services" {...field} value={field.value || ""} data-testid="input-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="+61 2 1234 5678" {...field} value={field.value || ""} data-testid="input-phone-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Role:</span>
                      <p className="text-base capitalize">{user?.role}</p>
                    </div>
                    {user?.monthlyPlanLimit !== null && user?.monthlyPlanLimit !== undefined && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Monthly Plan Limit:</span>
                        <p className="text-base">
                          {user.plansGeneratedThisMonth || 0} of {user.monthlyPlanLimit} plans used this month
                        </p>
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Complete User Guide */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <BookOpen className="mr-2 h-5 w-5" />
                    Complete User Guide & Training Manual
                  </CardTitle>
                  <CardDescription>
                    Comprehensive guide for users and AI agent training | Version 2.0 | November 2024
                  </CardDescription>
                </div>
                <Button
                  onClick={handleExportUserGuide}
                  disabled={isExporting}
                  size="sm"
                  data-testid="button-export-user-guide"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export to Word"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Scrollable container with max height */}
              <div className="max-h-[800px] overflow-y-auto border border-border rounded-lg p-6">
                <MarkdownUserGuide />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
