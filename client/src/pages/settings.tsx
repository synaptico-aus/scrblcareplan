import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, Shield, FileText, Users, Download, CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import scrblLogo from "@assets/scrbl-logo.png";
import { MarkdownUserGuide } from "@/components/MarkdownUserGuide";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBillingProfileSchema, type InsertBillingProfile, type BillingProfile } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";

function BillingInformationCard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: billingProfile, isLoading } = useQuery<BillingProfile>({
    queryKey: ['/api/billing-profile'],
    enabled: user?.role === 'admin' || user?.role === 'super_admin',
  });

  const form = useForm<InsertBillingProfile>({
    resolver: zodResolver(insertBillingProfileSchema),
    defaultValues: {
      contactName: '',
      companyName: '',
      addressLine1: '',
      addressLine2: '',
      suburb: '',
      state: '',
      postcode: '',
      email: '',
      phone: '',
      abn: '',
    },
  });

  useEffect(() => {
    if (billingProfile) {
      form.reset({
        contactName: billingProfile.contactName ?? '',
        companyName: billingProfile.companyName ?? '',
        addressLine1: billingProfile.addressLine1 ?? '',
        addressLine2: billingProfile.addressLine2 ?? '',
        suburb: billingProfile.suburb ?? '',
        state: billingProfile.state ?? '',
        postcode: billingProfile.postcode ?? '',
        email: billingProfile.email ?? '',
        phone: billingProfile.phone ?? '',
        abn: billingProfile.abn ?? '',
      });
    }
  }, [billingProfile, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertBillingProfile) => {
      return await apiRequest('POST', '/api/billing-profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing-profile'] });
      toast({
        title: "Billing Information Saved",
        description: "Your billing information has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save billing information",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertBillingProfile) => {
      return await apiRequest('PUT', '/api/billing-profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing-profile'] });
      toast({
        title: "Billing Information Updated",
        description: "Your billing information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update billing information",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertBillingProfile) => {
    if (billingProfile) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Billing Information
          </CardTitle>
          <CardDescription>Organization billing and invoice details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Billing Information
        </CardTitle>
        <CardDescription>
          Manage your organization's billing details for invoices and financial records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} value={field.value || ''} data-testid="input-contact-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company/Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC Care Services" {...field} value={field.value || ''} data-testid="input-company-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} value={field.value || ''} data-testid="input-address-line1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2 (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Suite 456" {...field} value={field.value || ''} data-testid="input-address-line2" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="suburb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb</FormLabel>
                    <FormControl>
                      <Input placeholder="Sydney" {...field} value={field.value || ''} data-testid="input-suburb" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="NSW" {...field} value={field.value || ''} data-testid="input-state" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                      <Input placeholder="2000" {...field} value={field.value || ''} data-testid="input-postcode" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="billing@example.com" {...field} value={field.value || ''} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="0400 000 000" {...field} value={field.value || ''} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="abn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ABN (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="12 345 678 901" {...field} value={field.value || ''} data-testid="input-abn" />
                  </FormControl>
                  <FormDescription>
                    Australian Business Number (11 digits)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-billing"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {billingProfile ? 'Update' : 'Save'} Billing Information
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

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
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your user details and role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Name:</span>
                <p className="text-base">{user?.firstName} {user?.lastName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email:</span>
                <p className="text-base">{user?.email}</p>
              </div>
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
            </CardContent>
          </Card>

          {/* Billing Information (Admin only) */}
          <BillingInformationCard />

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
