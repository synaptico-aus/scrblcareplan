import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, Shield, FileText, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import scrblLogo from "@assets/scrbl-logo.png";

export default function Settings() {
  const { user } = useAuth();

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

          {/* User Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                User Guide
              </CardTitle>
              <CardDescription>Complete guide to using SCRBL 2.0</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <h2>What is SCRBL 2.0?</h2>
                <p>
                  SCRBL 2.0 is a digital care plan generation tool designed specifically for Australian aged care providers. 
                  It uses artificial intelligence to transform assessment transcripts into comprehensive, compliant care plans 
                  that meet Australian regulatory standards.
                </p>

                <h3>Who is it for?</h3>
                <ul>
                  <li><strong>Care Partners</strong> conducting client assessments</li>
                  <li><strong>Care Coordinators</strong> managing client care plans</li>
                  <li><strong>Organization Administrators</strong> overseeing service delivery</li>
                  <li>Any aged care professional involved in care planning under the Support at Home Program</li>
                </ul>

                <Separator className="my-6" />

                <h2>Key Features</h2>

                <h3>🤖 AI-Powered Care Plan Generation</h3>
                <ul>
                  <li>Converts assessment transcripts into structured Gold Standard care plans</li>
                  <li>Automatically extracts key facts (client details, medical information, goals, risks)</li>
                  <li>Follows the Support at Home Program format (effective July 2025)</li>
                  <li>Ensures compliance with Aged Care Quality Standards 1-8</li>
                </ul>

                <h3>📋 Comprehensive Care Plans Include</h3>
                <ul>
                  <li>Care alerts and client preferences</li>
                  <li>Medical history and medications</li>
                  <li>Risk assessments (including Dignity of Risk)</li>
                  <li>SMARTA-formatted goals with service pricing</li>
                  <li>Budget and service classifications</li>
                  <li>Emergency contacts and GP details</li>
                  <li>Compliance mapping to Quality Standards</li>
                </ul>

                <h3>💾 Document Management</h3>
                <ul>
                  <li>Save and retrieve care plans</li>
                  <li>Attach client documents (PDFs, images)</li>
                  <li>Organize files by client folders</li>
                  <li>Search and filter saved plans</li>
                </ul>

                <h3>📤 Export Capabilities</h3>
                <ul>
                  <li>Export to PDF with professional formatting</li>
                  <li>Export to Word (.doc) for further editing</li>
                  <li>Includes organization branding (Scrbl logo)</li>
                </ul>

                <h3>🔒 Security & Compliance</h3>
                <ul>
                  <li>Privacy Act 1988 compliant</li>
                  <li>Multi-tenant organization separation</li>
                  <li>Role-based access control (Admin, User)</li>
                  <li>Session-based authentication</li>
                  <li>XSS protection on all HTML content</li>
                </ul>

                <Separator className="my-6" />

                <h2>Getting Started</h2>

                <h3>Creating a Care Plan</h3>
                <ol>
                  <li><strong>Enter Client Information:</strong> Client name, assessment type, classification level</li>
                  <li><strong>Paste Assessment Transcript:</strong> Include conversation details, medical info, goals, and preferences</li>
                  <li><strong>Generate:</strong> Click "Generate Care Plan" and wait 1-3 minutes</li>
                  <li><strong>Review:</strong> Check the extracted facts and formatted care plan</li>
                  <li><strong>Save or Export:</strong> Save for later or export to PDF/Word</li>
                </ol>

                <h3>Tips for Better Results</h3>
                <ul>
                  <li>Include specific medical conditions, medications, and dosages</li>
                  <li>Use direct quotes from the client about their goals</li>
                  <li>Note family members' names and their involvement</li>
                  <li>Detail any safety concerns, fall risks, or medical risks</li>
                  <li>State what the client wants to achieve in specific terms</li>
                </ul>

                <Separator className="my-6" />

                <h2>Understanding Care Plans</h2>

                <h3>SMARTA Goals Format</h3>
                <p>Every goal follows the SMARTA framework required by the Support at Home Program:</p>
                <ul>
                  <li><strong>S</strong>pecific - Clear, detailed, in client's own words</li>
                  <li><strong>M</strong>easurable - Trackable progress indicators</li>
                  <li><strong>A</strong>chievable - Realistic based on client capacity</li>
                  <li><strong>R</strong>elevant - Aligns with client's interests and needs</li>
                  <li><strong>T</strong>ime-bound - Has a timeframe or review period</li>
                  <li><strong>A</strong>ction-oriented - Includes specific tasks/actions</li>
                </ul>

                <p>Each goal includes service details with pricing at $X/hour ($Y/month) and categorization.</p>

                <h3>Dignity of Risk Assessment</h3>
                <p>
                  Acknowledges the client's right to make informed choices, even if they involve risk. 
                  Includes a table showing identified risks, client choices, potential consequences, 
                  mitigation strategies, and acknowledgements.
                </p>

                <Separator className="my-6" />

                <h2>Admin Features</h2>
                {user?.role === 'admin' || user?.role === 'super_admin' ? (
                  <>
                    <p>As an administrator, you have access to:</p>
                    <ul>
                      <li><strong>User Management:</strong> Add, edit, and manage user accounts</li>
                      <li><strong>Service Pricing:</strong> Configure hourly rates for all services</li>
                      <li><strong>Plan Limits:</strong> Set monthly plan generation limits per user</li>
                    </ul>
                    <p>Access the Admin panel from the user menu in the header.</p>
                  </>
                ) : (
                  <p>Admin features are available to administrators only. Contact your organization admin for access.</p>
                )}

                <Separator className="my-6" />

                <h2>Privacy & Compliance</h2>

                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Australian Privacy Act 1988</h4>
                    <p className="text-sm text-muted-foreground mb-0">
                      SCRBL 2.0 complies with the Privacy Act 1988. Data is stored securely in Australian servers 
                      (AWS Sydney region), with access restricted by organization. No data is shared between organizations.
                    </p>
                  </div>
                </div>

                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex items-start space-x-3 mt-4">
                  <FileText className="h-5 w-5 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Aged Care Quality Standards</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Care plans are mapped to all 8 Quality Standards:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 mb-0">
                      <li>1. Consumer dignity and choice</li>
                      <li>2. Ongoing assessment and planning with consumers</li>
                      <li>3. Personal care and clinical care</li>
                      <li>4. Services and supports for daily living</li>
                      <li>5. Organisation's service environment</li>
                      <li>6-8. Feedback, Human resources, Organisational governance</li>
                    </ul>
                  </div>
                </div>

                <Separator className="my-6" />

                <h2>Support & Troubleshooting</h2>

                <h3>Common Issues</h3>
                <ul>
                  <li><strong>Slow generation:</strong> Long transcripts (30+ pages) take 2-3 minutes to process</li>
                  <li><strong>Missing service pricing:</strong> Admin needs to configure service rates in Admin panel</li>
                  <li><strong>Can't access saved plans:</strong> Plans are organization-specific; check with your admin</li>
                  <li><strong>Export not working:</strong> Allow popups from SCRBL 2.0 domain or try a different browser</li>
                </ul>

                <p className="text-sm text-muted-foreground mt-6">
                  <strong>Version:</strong> SCRBL 2.0 | 
                  <strong> Last Updated:</strong> November 2024 | 
                  <strong> Compliance:</strong> Privacy Act 1988, Aged Care Quality Standards 1-8, Support at Home Program
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
