import { Separator } from "@/components/ui/separator";
import { Shield, FileText } from "lucide-react";

interface UserGuideContentProps {
  userRole?: string;
}

export function UserGuideContent({ userRole }: UserGuideContentProps) {
  return (
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
          <table>
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

      {/* Continue with remaining content */}
      <div className="not-prose bg-info-50 dark:bg-info-950/20 border border-info-200 dark:border-info-800 rounded-lg p-6 my-8">
        <p className="text-sm font-semibold text-info-800 dark:text-info-200 mb-3">
          📖 Complete User Guide - Full Content Available
        </p>
        <p className="text-sm text-info-700 dark:text-info-300 mb-3">
          The complete user guide contains over 3,500 lines of detailed documentation. For the full experience with all 
          sections, detailed examples, troubleshooting guides, API references, and workflow scenarios, please refer to 
          the <code className="bg-info-100 dark:bg-info-900 px-2 py-0.5 rounded">USER_GUIDE.md</code> file in the project 
          root directory.
        </p>
        <p className="text-sm text-info-700 dark:text-info-300 mb-2">
          This file contains comprehensive documentation including:
        </p>
        <ul className="text-sm text-info-700 dark:text-info-300 space-y-1 mb-0">
          <li>✓ 20 comprehensive sections with full content</li>
          <li>✓ Detailed field-by-field specifications with validation rules</li>
          <li>✓ Complete error message reference with solutions</li>
          <li>✓ Real example transcripts and generated care plans</li>
          <li>✓ 30+ common user questions with detailed answers</li>
          <li>✓ Complete API reference and database schema documentation</li>
          <li>✓ Privacy Act 1988 and Quality Standards compliance details</li>
          <li>✓ Example workflows showing complete user journeys</li>
        </ul>
      </div>

      <Separator className="my-8" />

      {/* Quick Reference sections continue below... */}
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
      {userRole === 'admin' || userRole === 'super_admin' ? (
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
  );
}
