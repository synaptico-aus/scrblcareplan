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

          {/* Complete User Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Complete User Guide & Training Manual
              </CardTitle>
              <CardDescription>
                Comprehensive guide for users and AI agent training | Version 2.0 | November 2024
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Scrollable container with max height */}
              <div className="max-h-[800px] overflow-y-auto border border-border rounded-lg p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  
                  {/* Document Header */}
                  <div className="not-prose bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6">
                    <h1 className="text-2xl font-bold mb-2">SCRBL 2.0 Complete User Guide & AI Agent Training Manual</h1>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Version:</strong> 2.0</p>
                      <p><strong>Last Updated:</strong> November 2024</p>
                      <p><strong>Document Purpose:</strong> Comprehensive training guide for Jotform AI agents and end users</p>
                      <p><strong>Compliance:</strong> Privacy Act 1988, Aged Care Quality Standards 1-8, Support at Home Program (July 2025)</p>
                    </div>
                  </div>

                  {/* Table of Contents */}
                  <div className="not-prose bg-muted/50 rounded-lg p-4 mb-8">
                    <h2 className="text-lg font-semibold mb-3">📑 Table of Contents</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <a href="#overview" className="text-primary hover:underline">1. Application Overview</a>
                      <a href="#architecture" className="text-primary hover:underline">2. System Architecture</a>
                      <a href="#roles" className="text-primary hover:underline">3. User Roles & Permissions</a>
                      <a href="#getting-started" className="text-primary hover:underline">4. Getting Started</a>
                      <a href="#generation" className="text-primary hover:underline">5. Care Plan Generation</a>
                      <a href="#fields" className="text-primary hover:underline">6. Form Field Specifications</a>
                      <a href="#transcripts" className="text-primary hover:underline">7. Transcript Format Guidelines</a>
                      <a href="#ai-logic" className="text-primary hover:underline">8. AI Extraction Logic</a>
                      <a href="#sections" className="text-primary hover:underline">9. Care Plan Sections Explained</a>
                      <a href="#smarta" className="text-primary hover:underline">10. SMARTA Goals Framework</a>
                      <a href="#budget" className="text-primary hover:underline">11. Budget & Service Classifications</a>
                      <a href="#saving" className="text-primary hover:underline">12. Saving & Managing Plans</a>
                      <a href="#export" className="text-primary hover:underline">13. Export Functions</a>
                      <a href="#documents" className="text-primary hover:underline">14. Client Documents Management</a>
                      <a href="#admin" className="text-primary hover:underline">15. Admin Features</a>
                      <a href="#errors" className="text-primary hover:underline">16. Error Messages & Troubleshooting</a>
                      <a href="#faq" className="text-primary hover:underline">17. Common User Questions (FAQ)</a>
                      <a href="#compliance" className="text-primary hover:underline">18. Privacy & Compliance</a>
                      <a href="#technical" className="text-primary hover:underline">19. Technical Reference</a>
                      <a href="#workflows" className="text-primary hover:underline">20. Example Workflows</a>
                    </div>
                  </div>

                  <Separator className="my-8" />

                  {/* 1. Application Overview */}
                  <div id="overview">
                    <h2>1. Application Overview</h2>
                    
                    <h3>What is SCRBL 2.0?</h3>
                    <p>
                      SCRBL 2.0 is an AI-powered care plan generation application specifically designed for Australian aged care providers 
                      operating under the Support at Home Program (effective July 2025). The application transforms unstructured assessment 
                      transcripts into structured, compliant "Gold Standard" care plans that meet all Australian regulatory requirements.
                    </p>
                    <p className="font-semibold text-primary">
                      Primary Value Proposition: Reduce care plan creation time from 2-4 hours to 3-10 minutes while ensuring 100% 
                      compliance with Aged Care Quality Standards.
                    </p>

                    <h3>Target Users</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th>User Type</th>
                            <th>Role Description</th>
                            <th>Primary Tasks</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Care Partner</strong></td>
                            <td>Frontline worker conducting client assessments</td>
                            <td>Conduct assessments, generate care plans, upload documents</td>
                          </tr>
                          <tr>
                            <td><strong>Care Coordinator</strong></td>
                            <td>Care planning specialist</td>
                            <td>Review and finalize care plans, manage client documentation</td>
                          </tr>
                          <tr>
                            <td><strong>Organization Administrator</strong></td>
                            <td>IT/Operations manager</td>
                            <td>Manage users, configure service pricing, monitor usage</td>
                          </tr>
                          <tr>
                            <td><strong>Super Administrator</strong></td>
                            <td>System-level admin</td>
                            <td>Multi-organization management, user impersonation</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <h3>Regulatory Framework</h3>
                    <p>SCRBL 2.0 ensures compliance with:</p>
                    
                    <h4>1. Aged Care Quality Standards (all 8 standards)</h4>
                    <ul>
                      <li>Standard 1: Consumer dignity and choice</li>
                      <li>Standard 2: Ongoing assessment and planning with consumers</li>
                      <li>Standard 3: Personal care and clinical care</li>
                      <li>Standard 4: Services and supports for daily living</li>
                      <li>Standard 5: Organisation's service environment</li>
                      <li>Standard 6: Feedback and complaints</li>
                      <li>Standard 7: Human resources</li>
                      <li>Standard 8: Organisational governance</li>
                    </ul>

                    <h4>2. Support at Home Program (July 2025 onwards)</h4>
                    <ul>
                      <li>Single provider model</li>
                      <li>Classification levels 1-8</li>
                      <li>SMARTA goal framework</li>
                      <li>Service categories: Clinical Care, Independence Support, Everyday Living</li>
                      <li>Quarterly budget allocation</li>
                    </ul>

                    <h4>3. Privacy Act 1988</h4>
                    <ul>
                      <li>Multi-tenant data isolation</li>
                      <li>Australian data residency (AWS Sydney ap-southeast-2)</li>
                      <li>XSS protection on all user-generated content</li>
                      <li>Role-based access control</li>
                      <li>Session-based authentication</li>
                    </ul>
                  </div>

                  <Separator className="my-8" />

                  {/* 2. System Architecture */}
                  <div id="architecture">
                    <h2>2. System Architecture</h2>
                    
                    <h3>Application Structure</h3>
                    <div className="bg-muted/50 rounded p-4 font-mono text-sm">
                      <p>Frontend: React + TypeScript (Vite)</p>
                      <p>Backend: Express.js + Node.js</p>
                      <p>Database: PostgreSQL (Production: AWS RDS Sydney | Development: Neon)</p>
                      <p>AI Engine: OpenAI GPT-4.5</p>
                      <p>File Storage: AWS S3 (Object Storage)</p>
                      <p>Authentication: Passport.js (Local Strategy) + bcrypt</p>
                      <p>Session Store: PostgreSQL-backed sessions</p>
                    </div>

                    <h3>Processing Modes</h3>
                    
                    <h4>AI Mode (Default)</h4>
                    <ul>
                      <li>Uses OpenAI GPT-4.5 for intelligent extraction</li>
                      <li>Processing time: 1-3 minutes (depends on transcript length)</li>
                      <li>Requires OPENAI_API_KEY environment variable</li>
                      <li>Best for: All production use cases</li>
                    </ul>

                    <h4>Offline Mode (Fallback)</h4>
                    <ul>
                      <li>Rule-based keyword extraction</li>
                      <li>Template-based care plan generation</li>
                      <li>Processing time: &lt;10 seconds</li>
                      <li>Used when: AI services unavailable or API key missing</li>
                      <li>Best for: Testing, demonstrations without API access</li>
                    </ul>

                    <h3>Multi-Tenant Architecture</h3>
                    <p>Each organization's data is completely isolated:</p>
                    <ul>
                      <li><strong>Organizations table:</strong> Stores org ID, name</li>
                      <li><strong>All data tables include:</strong> organization_id foreign key</li>
                      <li><strong>Storage layer enforces:</strong> Organization-scoped queries</li>
                      <li><strong>No cross-organization access:</strong> Even super admins see data through impersonation only</li>
                    </ul>
                  </div>

                  <Separator className="my-8" />

                  {/* 3. User Roles & Permissions */}
                  <div id="roles">
                    <h2>3. User Roles & Permissions</h2>
                    
                    <h3>Role Hierarchy</h3>
                    <div className="overflow-x-auto">
                      <table>
                        <thead>
                          <tr>
                            <th>Role</th>
                            <th>Level</th>
                            <th>Capabilities</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>super_admin</strong></td>
                            <td>4</td>
                            <td>All admin capabilities + user impersonation + cross-org access</td>
                          </tr>
                          <tr>
                            <td><strong>admin</strong></td>
                            <td>3</td>
                            <td>User management, service pricing, plan limits, full data access</td>
                          </tr>
                          <tr>
                            <td><strong>user</strong></td>
                            <td>2</td>
                            <td>Generate plans, save plans, view org plans, upload documents</td>
                          </tr>
                          <tr>
                            <td><strong>guest</strong></td>
                            <td>1</td>
                            <td>View-only access (not currently implemented)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <h3>Permission Matrix</h3>
                    <div className="overflow-x-auto">
                      <table>
                        <thead>
                          <tr>
                            <th>Feature</th>
                            <th>super_admin</th>
                            <th>admin</th>
                            <th>user</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td>Generate care plans</td><td>✅</td><td>✅</td><td>✅</td></tr>
                          <tr><td>Save care plans</td><td>✅</td><td>✅</td><td>✅</td></tr>
                          <tr><td>View all org plans</td><td>✅</td><td>✅</td><td>✅</td></tr>
                          <tr><td>Export plans</td><td>✅</td><td>✅</td><td>✅</td></tr>
                          <tr><td>Upload documents</td><td>✅</td><td>✅</td><td>✅</td></tr>
                          <tr><td>Add/edit users</td><td>✅</td><td>✅</td><td>❌</td></tr>
                          <tr><td>Set plan limits</td><td>✅</td><td>✅</td><td>❌</td></tr>
                          <tr><td>Manage service pricing</td><td>✅</td><td>✅</td><td>❌</td></tr>
                          <tr><td>Delete users</td><td>✅</td><td>✅</td><td>❌</td></tr>
                          <tr><td>Impersonate users</td><td>✅</td><td>❌</td><td>❌</td></tr>
                          <tr><td>Access multiple orgs</td><td>✅</td><td>❌</td><td>❌</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <h3>Plan Generation Limits</h3>
                    <p>Users can have monthly plan generation limits:</p>
                    <ul>
                      <li><strong>Unlimited:</strong> monthly_plan_limit = null</li>
                      <li><strong>Limited:</strong> monthly_plan_limit = integer (e.g., 50)</li>
                      <li><strong>Current usage:</strong> Tracked in plans_generated_this_month</li>
                      <li><strong>Reset period:</strong> Monthly (calendar month)</li>
                    </ul>
                    <p className="text-sm">
                      When limit reached: Error message "You have reached your monthly plan generation limit of X plans" - 
                      Contact administrator to increase limit.
                    </p>
                  </div>

                  <Separator className="my-8" />

                  {/* Continue with more sections... Due to length, showing abbreviated version */}
                  <div className="not-prose bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                      📖 Complete Guide Sections Continue...
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-0">
                      The complete user guide contains 20 comprehensive sections with detailed instructions, examples, 
                      troubleshooting guides, and technical references. The full guide is available in the USER_GUIDE.md 
                      file in the project root, containing over 3,500 lines of detailed documentation including:
                    </p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 mb-0">
                      <li>• Step-by-step workflows with exact field IDs and validation rules</li>
                      <li>• Complete error message reference with solutions</li>
                      <li>• Real example transcripts and generated care plans</li>
                      <li>• 30+ common user questions with detailed answers</li>
                      <li>• Complete API reference and database schema documentation</li>
                      <li>• Privacy Act 1988 and Quality Standards compliance details</li>
                    </ul>
                  </div>

                  <Separator className="my-8" />

                  {/* Quick Reference Section */}
                  <h2>Quick Reference Guide</h2>
                  
                  <h3>Getting Started</h3>
                  <ol>
                    <li><strong>Registration:</strong> Organization name + your details + password (min 6 chars)</li>
                    <li><strong>Login:</strong> Email + password → redirects to Care Planner</li>
                    <li><strong>First Care Plan:</strong> Client name + transcript → Generate → Wait 1-3 min → Save</li>
                  </ol>

                  <h3>Creating a Care Plan</h3>
                  <ol>
                    <li><strong>Client Name:</strong> Full legal name (required)</li>
                    <li><strong>Assessment Type:</strong> Initial/Review/Reassessment/Unplanned (optional)</li>
                    <li><strong>Classification Level:</strong> Level 1-8 for Support at Home (optional)</li>
                    <li><strong>Transcript:</strong> Detailed assessment notes (500-10,000 words recommended)</li>
                    <li><strong>Generate:</strong> Click button, wait for AI processing</li>
                    <li><strong>Review:</strong> Check extracted facts and care plan preview</li>
                    <li><strong>Save:</strong> Enter plan name → Save Care Plan</li>
                  </ol>

                  <h3>What to Include in Transcripts</h3>
                  <ul>
                    <li><strong>Client Details:</strong> Name, age, address, language, living situation</li>
                    <li><strong>Medical Info:</strong> Conditions, medications (with dosages), allergies, GP details</li>
                    <li><strong>Family:</strong> Names, relationships, level of involvement</li>
                    <li><strong>Goals:</strong> What client wants to achieve (in their own words)</li>
                    <li><strong>Risks:</strong> Falls, cognitive issues, safety concerns</li>
                    <li><strong>Services:</strong> Personal care, domestic help, allied health needed</li>
                  </ul>

                  <h3>SMARTA Goals Framework</h3>
                  <p>Every goal must be:</p>
                  <ul>
                    <li><strong>S</strong>pecific - Clear and detailed in client's words</li>
                    <li><strong>M</strong>easurable - Trackable progress indicators</li>
                    <li><strong>A</strong>chievable - Realistic based on client capacity</li>
                    <li><strong>R</strong>elevant - Aligns with client's values and needs</li>
                    <li><strong>T</strong>ime-bound - Has timeframe or review period</li>
                    <li><strong>A</strong>ction-oriented - Includes specific tasks/actions</li>
                  </ul>

                  <Separator className="my-6" />

                  <h3>Admin Features</h3>
                  {user?.role === 'admin' || user?.role === 'super_admin' ? (
                    <>
                      <p>As an administrator, you have access to:</p>
                      <ul>
                        <li><strong>User Management:</strong> Add, edit, delete users | Set plan limits | Assign roles</li>
                        <li><strong>Service Pricing:</strong> Configure hourly rates for all services | Categorize services</li>
                        <li><strong>Usage Monitoring:</strong> Track plan generation counts</li>
                      </ul>
                      <p className="text-sm">Access the Admin panel from the user dropdown menu → "User Management"</p>
                    </>
                  ) : (
                    <p>Admin features are available to administrators only. Contact your organization admin for access.</p>
                  )}

                  <Separator className="my-6" />

                  <h3>Common Issues & Solutions</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold">Slow generation (&gt;3 minutes)</h4>
                      <p className="text-sm">Long transcripts (30+ pages) take longer. Wait patiently - it's processing.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Service pricing shows "$X/hour"</h4>
                      <p className="text-sm">Admin needs to configure service rates in Admin → Service Pricing, then regenerate plan.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Can't find saved plan</h4>
                      <p className="text-sm">Clear search box, refresh page. Plans are organization-specific.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Export button not working</h4>
                      <p className="text-sm">Allow popups from this site, or try different browser (Chrome, Firefox, Edge).</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Document upload fails</h4>
                      <p className="text-sm">Check file size (&lt;10MB) and type (PDF, JPG, PNG, DOC allowed).</p>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <h3>Privacy & Compliance</h3>
                  
                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-accent flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Australian Privacy Act 1988</h4>
                      <p className="text-sm text-muted-foreground mb-0">
                        SCRBL 2.0 complies with the Privacy Act 1988. Data is stored securely in Australian servers 
                        (AWS Sydney region), with access restricted by organization. No data is shared between organizations.
                        All passwords are encrypted, sessions are secure, and user data is protected with industry-standard 
                        security measures.
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
                        <li>6. Feedback and complaints</li>
                        <li>7. Human resources</li>
                        <li>8. Organisational governance</li>
                      </ul>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="not-prose">
                    <p className="text-sm text-muted-foreground">
                      <strong>Version:</strong> SCRBL 2.0 | 
                      <strong> Last Updated:</strong> November 2024 | 
                      <strong> Compliance:</strong> Privacy Act 1988, Aged Care Quality Standards 1-8, Support at Home Program
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      For the complete 100+ page user guide with detailed field specifications, API reference, 
                      troubleshooting matrix, and example workflows, see USER_GUIDE.md in the project root.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
