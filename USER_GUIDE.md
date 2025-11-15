# SCRBL 2.0 Complete User Guide & AI Agent Training Manual

**Version**: 2.0  
**Last Updated**: November 2024  
**Document Purpose**: Comprehensive training guide for Jotform AI agents and end users  
**Compliance**: Privacy Act 1988, Aged Care Quality Standards 1-8, Support at Home Program (July 2025)

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [System Architecture](#system-architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Getting Started](#getting-started)
5. [Care Plan Generation](#care-plan-generation)
6. [Form Field Specifications](#form-field-specifications)
7. [Transcript Format Guidelines](#transcript-format-guidelines)
8. [AI Extraction Logic](#ai-extraction-logic)
9. [Care Plan Sections Explained](#care-plan-sections-explained)
10. [SMARTA Goals Framework](#smarta-goals-framework)
11. [Budget & Service Classifications](#budget--service-classifications)
12. [Saving & Managing Plans](#saving--managing-plans)
13. [Export Functions](#export-functions)
14. [Client Documents Management](#client-documents-management)
15. [Admin Features](#admin-features)
16. [Error Messages & Troubleshooting](#error-messages--troubleshooting)
17. [Common User Questions (AI Agent FAQ)](#common-user-questions-ai-agent-faq)
18. [Privacy & Compliance](#privacy--compliance)
19. [Technical Reference](#technical-reference)
20. [Example Workflows](#example-workflows)

---

## Application Overview

### What is SCRBL 2.0?

SCRBL 2.0 is an AI-powered care plan generation application specifically designed for Australian aged care providers operating under the Support at Home Program (effective July 2025). The application transforms unstructured assessment transcripts into structured, compliant "Gold Standard" care plans that meet all Australian regulatory requirements.

**Primary Value Proposition**: Reduce care plan creation time from 2-4 hours to 3-10 minutes while ensuring 100% compliance with Aged Care Quality Standards.

### Target Users

| User Type | Role Description | Primary Tasks |
|-----------|-----------------|---------------|
| **Care Partner** | Frontline worker conducting client assessments | Conduct assessments, generate care plans, upload documents |
| **Care Coordinator** | Care planning specialist | Review and finalize care plans, manage client documentation |
| **Organization Administrator** | IT/Operations manager | Manage users, configure service pricing, monitor usage |
| **Super Administrator** | System-level admin | Multi-organization management, user impersonation |

### Regulatory Framework

SCRBL 2.0 ensures compliance with:

**1. Aged Care Quality Standards (all 8 standards)**
- Standard 1: Consumer dignity and choice
- Standard 2: Ongoing assessment and planning with consumers
- Standard 3: Personal care and clinical care
- Standard 4: Services and supports for daily living
- Standard 5: Organisation's service environment
- Standard 6: Feedback and complaints
- Standard 7: Human resources
- Standard 8: Organisational governance

**2. Support at Home Program (July 2025 onwards)**
- Single provider model
- Classification levels 1-8
- SMARTA goal framework
- Service categories: Clinical Care, Independence Support, Everyday Living
- Quarterly budget allocation

**3. Privacy Act 1988**
- Multi-tenant data isolation
- Australian data residency (AWS Sydney ap-southeast-2)
- XSS protection on all user-generated content
- Role-based access control
- Session-based authentication

---

## System Architecture

### Application Structure

```
Frontend: React + TypeScript (Vite)
Backend: Express.js + Node.js
Database: PostgreSQL (Production: AWS RDS Sydney | Development: Neon)
AI Engine: OpenAI GPT-4.5
File Storage: AWS S3 (Object Storage)
Authentication: Passport.js (Local Strategy) + bcrypt
Session Store: PostgreSQL-backed sessions
```

### Processing Modes

**AI Mode (Default)**
- Uses OpenAI GPT-4.5 for intelligent extraction
- Processing time: 1-3 minutes (depends on transcript length)
- Requires OPENAI_API_KEY environment variable
- Best for: All production use cases

**Offline Mode (Fallback)**
- Rule-based keyword extraction
- Template-based care plan generation
- Processing time: <10 seconds
- Used when: AI services unavailable or API key missing
- Best for: Testing, demonstrations without API access

### Multi-Tenant Architecture

Each organization's data is completely isolated:
- **Organizations table**: Stores org ID, name
- **All data tables include**: `organization_id` foreign key
- **Storage layer enforces**: Organization-scoped queries
- **No cross-organization access**: Even super admins see data through impersonation only

---

## User Roles & Permissions

### Role Hierarchy

| Role | Level | Capabilities |
|------|-------|--------------|
| **super_admin** | 4 | All admin capabilities + user impersonation + cross-org access |
| **admin** | 3 | User management, service pricing, plan limits, full data access |
| **user** | 2 | Generate plans, save plans, view org plans, upload documents |
| **guest** | 1 | View-only access (not currently implemented) |

### Permission Matrix

| Feature | super_admin | admin | user |
|---------|-------------|-------|------|
| Generate care plans | ✅ | ✅ | ✅ |
| Save care plans | ✅ | ✅ | ✅ |
| View all org plans | ✅ | ✅ | ✅ |
| Export plans | ✅ | ✅ | ✅ |
| Upload documents | ✅ | ✅ | ✅ |
| Add/edit users | ✅ | ✅ | ❌ |
| Set plan limits | ✅ | ✅ | ❌ |
| Manage service pricing | ✅ | ✅ | ❌ |
| Delete users | ✅ | ✅ | ❌ |
| Impersonate users | ✅ | ❌ | ❌ |
| Access multiple orgs | ✅ | ❌ | ❌ |

### Plan Generation Limits

Users can have monthly plan generation limits:
- **Unlimited**: `monthly_plan_limit` = `null`
- **Limited**: `monthly_plan_limit` = integer (e.g., 50)
- **Current usage**: Tracked in `plans_generated_this_month`
- **Reset period**: Monthly (calendar month)

When limit reached:
- Error message: "You have reached your monthly plan generation limit of X plans"
- Contact administrator to increase limit

---

## Getting Started

### Registration (First-Time Setup)

#### Page URL
`/register`

#### Form Fields

| Field Name | HTML ID | Data Type | Required | Validation Rules | Error Messages |
|------------|---------|-----------|----------|-----------------|----------------|
| Organization Name | `input-organization` | text | Yes | Min 2 chars, Max 100 chars | "Organization name must be at least 2 characters" |
| First Name | `input-first-name` | text | Yes | Min 1 char, Max 50 chars | "First name is required" |
| Last Name | `input-last-name` | text | Yes | Min 1 char, Max 50 chars | "Last name is required" |
| Email | `input-email` | email | Yes | Valid email format | "Please enter a valid email address" |
| Password | `input-password` | password | Yes | Min 6 chars | "Password must be at least 6 characters" |

#### Step-by-Step Registration Process

**Step 1**: Navigate to Registration Page
- User clicks "Sign up" link on login page
- Page displays: SCRBL 2.0 logo + "AI Assisted Care Plan Drafts in Minutes" tagline
- Form shows 5 input fields

**Step 2**: Fill Organization Details
- User enters organization name
- Real-time validation: Must be 2+ characters
- Example: "Salveo Care Services"

**Step 3**: Fill Personal Details
- First Name: User's given name (e.g., "Sarah")
- Last Name: User's family name (e.g., "Johnson")
- Email: Work email address (e.g., "sarah.johnson@salveocare.com.au")

**Step 4**: Create Password
- Minimum 6 characters (enforced)
- Best practice: 12+ characters with mix of letters, numbers, symbols
- Password is hashed using bcrypt (10 rounds) before storage

**Step 5**: Submit Form
- User clicks "Create Account" button (`button-create-account`)
- System validates all fields
- If validation fails: Error messages appear below each field
- If validation passes: Proceeds to account creation

#### Backend Processing

1. **Validation**
   - Check if email already exists
   - Validate all field formats
   - Error if email exists: "An account with this email already exists"

2. **Organization Creation**
   - New organization record created
   - Returns `organization_id`

3. **User Creation**
   - Password hashed with bcrypt
   - User record created with:
     - `organization_id` (link to org)
     - `role` = "admin" (first user becomes admin)
     - `monthly_plan_limit` = null (unlimited)
     - `plans_generated_this_month` = 0

4. **Auto-Login**
   - User automatically logged in
   - Session created in PostgreSQL
   - Redirect to `/care-planner`

#### Success States

**Visual Feedback**:
- Toast notification: "Registration successful - Welcome to SCRBL 2.0!"
- Redirect to care planner page
- User dropdown shows user name

**Session Created**:
- Cookie: `connect.sid` (HttpOnly, Secure in production)
- Session data includes: `userId`, `organizationId`, `role`

#### Common Registration Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| "Email already exists" | Email in use | Try logging in or use different email |
| "Organization name required" | Empty field | Enter organization name |
| "Password too short" | < 6 characters | Use longer password |
| "Invalid email format" | Malformed email | Check email format (must include @) |
| "Server error" | Database/network issue | Try again or contact support |

---

### Login (Returning Users)

#### Page URL
`/login`

#### Form Fields

| Field Name | HTML ID | Data Type | Required | Validation Rules |
|------------|---------|-----------|----------|-----------------|
| Email | `input-email` | email | Yes | Valid email format |
| Password | `input-password` | password | Yes | Any non-empty string |

#### Step-by-Step Login Process

**Step 1**: Navigate to Login Page
- Default landing page or click "Log in" from registration
- Page displays: SCRBL 2.0 logo + login form

**Step 2**: Enter Credentials
- Email: User's registered email
- Password: User's password (masked with bullets)

**Step 3**: Submit Login
- Click "Login" button (`button-login`)
- System validates credentials

**Step 4**: Authentication
- Backend checks email exists
- Compares password hash using bcrypt
- If match: Create session and redirect
- If no match: Display error message

#### Success States

**On Successful Login**:
- Toast: "Login successful - Welcome to SCRBL 2.0!"
- Redirect to `/care-planner` (or `/` which redirects to care planner)
- User dropdown in header shows: User name + email

#### Login Errors

| Error Message | Cause | User Action |
|--------------|-------|-------------|
| "Invalid email or password" | Wrong credentials | Check email/password, try again |
| "Login failed" | Server error | Wait and retry |
| "Session expired" | Previous session timed out | Log in again |
| (No error, just refresh) | Missing env variables | Contact administrator |

#### Session Behavior

**Session Duration**:
- Default: 24 hours of inactivity
- Sliding window: Resets on each request
- Cookie: `connect.sid`

**Session Expiry**:
- After 24 hours inactivity: Auto-logout
- User sees: Redirect to login page
- Must log in again

---

## Care Plan Generation

### Overview

Care plan generation is the core feature of SCRBL 2.0. It transforms unstructured assessment transcripts into structured, compliant care plans through AI-powered analysis.

### Generation Workflow

```
User Input (Transcript) 
  → AI Processing (OpenAI GPT-4.5)
    → Fact Extraction
      → HTML Generation
        → Display in Preview Panel
          → User Reviews
            → Save or Export
```

### Step-by-Step Process

#### Step 1: Access Care Planner

**URL**: `/care-planner` or `/` (default)

**Page Layout**:
- **Header**: Logo, plan counter, user menu
- **Three-Panel Interface**:
  - Left: Care Plan Form (input)
  - Middle: Extracted Facts (AI output)
  - Right: Care Plan Preview (final HTML)

#### Step 2: Fill Care Plan Form

**Form Location**: Left panel, titled "Care Plan Information"

**Required Fields**:

##### 2.1 Client Name
- **Field ID**: `input-client-name`
- **Type**: Text input
- **Required**: Yes
- **Validation**: Min 2 characters
- **Example**: "Margaret Wilson"
- **Purpose**: Used in care plan header, file names, search

##### 2.2 Assessment Type
- **Field ID**: `select-assessment-type`
- **Type**: Dropdown select
- **Required**: No (defaults to empty)
- **Options**:
  1. "" (empty - Select assessment type)
  2. "Initial Assessment"
  3. "Review Assessment"
  4. "Reassessment"
  5. "Unplanned Review"
- **Purpose**: Documents assessment context in care plan

##### 2.3 Funding Type
- **Field ID**: `select-funding-type`
- **Type**: Dropdown select
- **Required**: No (defaults to empty)
- **Options**:
  1. "" (Select funding type)
  2. "hcp" (Home Care Package - legacy)
  3. "sah" (Support at Home - July 2025 onwards)
- **Purpose**: Determines care plan format and compliance framework

##### 2.4 Classification/Funding Level
- **Field ID**: `select-classification-level`
- **Type**: Dropdown select
- **Required**: No (defaults to empty)
- **Options** (for Support at Home):
  1. "" (Select level)
  2. "level1" - "level8" (Support at Home classification levels)
  3. "restorative" (Short-term restorative care)
  4. "endoflife" (End of life care)
- **Purpose**: Determines funding allocation and service intensity

##### 2.5 Assessment Transcript
- **Field ID**: `textarea-transcript`
- **Type**: Large textarea
- **Required**: Yes
- **Validation**: Min 10 characters
- **Character Limit**: None (technically unlimited)
- **Recommended Length**: 500-10,000 words
- **Purpose**: Primary input for AI analysis

##### 2.6 Notta URL (Optional)
- **Field ID**: `input-notta-url`
- **Type**: Text input (URL)
- **Required**: No
- **Format**: `https://www.notta.ai/share/XXXXX` or `notta.ai/share/XXXXX`
- **Purpose**: Allows direct import from Notta.ai transcription service
- **Note**: Currently disabled in UI but backend supported

#### Step 3: Enter Transcript

**What to Include in Transcript**:

1. **Client Demographics**
   - Full name
   - Age or date of birth
   - Address
   - Language and cultural background
   - Living situation (lives alone, with family, etc.)

2. **Medical Information**
   - Diagnosed conditions (e.g., "diabetes type 2", "dementia")
   - Medications (name, dosage, frequency)
   - Allergies
   - Recent medical events
   - GP details

3. **Support Network**
   - Family members (names, relationships, level of involvement)
   - Informal supports (friends, neighbors)
   - Other service providers

4. **Client Goals & Preferences**
   - What client wants to achieve (in their words)
   - Preferred days/times for services
   - Cultural or religious preferences
   - Care worker preferences

5. **Risks & Concerns**
   - Fall risk
   - Cognitive issues
   - Behavioral concerns
   - Safety hazards in home

6. **Services Needed**
   - Personal care
   - Domestic assistance
   - Allied health (physio, OT, etc.)
   - Nursing care

**Example Transcript Format**:

```
Assessment Date: 15/10/2024
Assessor: Sarah Johnson
Client: Margaret Wilson, 82 years old

Margaret lives alone in a 3-bedroom house in Camberwell. She has been 
managing independently but has noticed increasing difficulty with 
household tasks following a fall 3 months ago.

Medical History:
- Type 2 Diabetes (managed with Metformin 500mg twice daily)
- Osteoarthritis in both knees
- Mild cognitive impairment (diagnosed 2023)
- Previous fall resulting in fractured wrist (July 2024)

Current Medications:
1. Metformin 500mg - twice daily with meals
2. Panadol Osteo - as needed for pain
3. Vitamin D supplement - daily

Family Support:
Margaret's daughter Jane visits twice weekly and helps with shopping.
Her son David lives interstate but calls regularly.

Goals (in Margaret's words):
"I want to stay in my own home for as long as possible. I need help 
with cleaning because my knees hurt when I bend down. I'd also like 
someone to help me with showering because I'm worried about falling 
again."

Risks Identified:
- Fall risk (high) - previous fall, arthritis, home hazards
- Margaret refuses to use walking frame despite recommendation
- Kitchen has loose mat near sink

Services Needed:
- Personal care (showering) 2x per week
- Domestic assistance 2 hours per week
- Physiotherapy for strength and balance
```

#### Step 4: Generate Care Plan

**Action**: Click "Generate Care Plan" button (`button-generate`)

**Button States**:
- **Ready**: Blue button, enabled
- **Generating**: Blue button with spinner, disabled
- **Error**: Returns to ready state

**Visual Feedback During Generation**:

1. **Button Changes**:
   - Text: "Generating..." with spinner icon
   - Disabled state (cannot click again)

2. **Progress Indicator** (if AI mode):
   - Progress bar appears (0-90%)
   - Elapsed time counter
   - Message: "Generating Care Plan..."

3. **Agent Updates Panel** (AI mode only):
   - Real-time status updates
   - Shows: "Analyzing transcript...", "Extracting facts...", "Generating care plan..."
   - Provides transparency into AI processing

**Processing Time Expectations**:

| Transcript Length | Estimated Time | Mode |
|------------------|----------------|------|
| < 1,000 words | 15-30 seconds | AI |
| 1,000-5,000 words | 30-90 seconds | AI |
| 5,000-10,000 words | 1-2 minutes | AI |
| 10,000+ words | 2-3 minutes | AI |
| Any length | < 10 seconds | Offline |

#### Step 5: Review Results

**What Appears After Generation**:

##### 5.1 Middle Panel: Extracted Facts

**Panel Title**: "Extracted Facts"  
**Collapsible**: Yes (toggle to collapse/expand)

**Sections**:

1. **Client Details**
   - Name
   - Age / Date of Birth
   - Language
   - Interpreter Required (Yes/No)
   - Living Situation
   - Address

2. **Medical Information**
   - **Conditions**: Array of diagnoses
   - **Medications**: Array of objects with:
     - name
     - dosage
     - frequency
   - **Allergies**: Array of allergens
   - **GP Details**: Name, phone, address

3. **Support Network**
   - **Family Members**: Array of objects with:
     - name
     - relationship
     - level of involvement
   - **Informal Supports**: Array of support people

4. **Goals**
   - Array of goal statements (extracted from transcript)

5. **Risks**
   - Array of identified risks

6. **Service Requirements**
   - Array of needed services

**Purpose**: Verify AI extraction accuracy before finalizing

##### 5.2 Right Panel: Care Plan Preview

**Panel Title**: "Care Plan Preview"

**Action Buttons** (top of panel):
- **Print**: Opens print dialog
- **Export to Word**: Downloads .doc file

**Care Plan Sections** (18 total):

1. Care Plan (title with client name)
2. Care Alerts
3. My Care Plan (demographics)
4. People involved in developing my care plan
5. Cultural, diversity, values and beliefs
6. Care worker and service delivery preferences
7. Preferred Support People
8. Informal Supports
9. Important things to know about me
10. My Medical Information
11. Risk Assessment
12. Emergency Contacts & Instructions
13. My Goals (SMARTA format)
14. Budget and Service Classifications
15. Care Plan Consent and Distribution
16. Prepared By
17. Transcript Summary (mapped to Standards 1-8)
18. Dignity of Risk Assessment

**Formatting**:
- Professional HTML with proper headings
- Tables for structured data
- First-person narrative throughout
- SCRBL 2.0 branding

#### Step 6: Save Care Plan

**Location**: Bottom of Care Plan Preview panel

**Save Form Fields**:

1. **Plan Name**
   - **Field ID**: `input-plan-name`
   - **Type**: Text input
   - **Required**: Yes
   - **Placeholder**: "Enter plan name (e.g., Client Name - Assessment Type)"
   - **Validation**: Min 3 characters
   - **Example**: "Margaret Wilson - Initial Assessment Oct 2024"

2. **Save Button**
   - **Button ID**: `button-save-plan`
   - **Label**: "Save Care Plan"
   - **State**: Disabled until plan name entered

**Save Process**:

1. User enters plan name
2. User clicks "Save Care Plan"
3. System validates plan name
4. Backend saves:
   - `client_name`
   - `plan_name`
   - `html` (full care plan HTML)
   - `extracted_facts` (JSON object)
   - `save_date` (timestamp)
   - `organization_id`
5. Success toast: "Care plan saved successfully"
6. Plan appears in Saved Plans list

**What Gets Saved**:
- Client name
- Plan name
- Full HTML care plan
- Extracted facts (JSON)
- Assessment type
- Funding type/level
- Save date/time
- User who created it
- Organization ID

---

## Form Field Specifications

### Complete Field Reference

| Field Name | Element Type | Data Type | Required | Min Length | Max Length | Default Value | Validation Pattern | Test ID |
|------------|-------------|-----------|----------|-----------|-----------|--------------|-------------------|---------|
| Client Name | `<input>` | text | Yes | 2 | 200 | "" | Any characters | `input-client-name` |
| Assessment Type | `<select>` | enum | No | - | - | "" | See options below | `select-assessment-type` |
| Funding Type | `<select>` | enum | No | - | - | "" | "hcp" \| "sah" \| "" | `select-funding-type` |
| Classification Level | `<select>` | enum | No | - | - | "" | See options below | `select-classification-level` |
| Transcript | `<textarea>` | text | Yes | 10 | 1000000 | "" | Any characters | `textarea-transcript` |
| Notta URL | `<input>` | url | No | 0 | 500 | "" | URL pattern | `input-notta-url` |
| Plan Name | `<input>` | text | Yes (for save) | 3 | 200 | "" | Any characters | `input-plan-name` |

### Assessment Type Options

```javascript
[
  { value: "", label: "Select assessment type" },
  { value: "Initial Assessment", label: "Initial Assessment" },
  { value: "Review Assessment", label: "Review Assessment" },
  { value: "Reassessment", label: "Reassessment" },
  { value: "Unplanned Review", label: "Unplanned Review" }
]
```

### Classification Level Options

```javascript
[
  { value: "", label: "Select classification level" },
  { value: "level1", label: "Level 1 - Low Needs" },
  { value: "level2", label: "Level 2" },
  { value: "level3", label: "Level 3" },
  { value: "level4", label: "Level 4" },
  { value: "level5", label: "Level 5" },
  { value: "level6", label: "Level 6" },
  { value: "level7", label: "Level 7" },
  { value: "level8", label: "Level 8 - High Needs" },
  { value: "restorative", label: "Restorative Care" },
  { value: "endoflife", label: "End of Life Care" }
]
```

### Field Dependencies

**Funding Type affects Classification Level options**:
- When `fundingType` = "hcp": Show HCP levels 1-4
- When `fundingType` = "sah": Show SAH levels 1-8 + restorative + end of life
- When `fundingType` = "": Show all options

---

## Transcript Format Guidelines

### Recommended Structure

**Best Practice Transcript Template**:

```
ASSESSMENT INFORMATION
======================
Date: [DD/MM/YYYY]
Assessor: [Name]
Assessment Type: [Initial/Review/etc]
Location: [Client's home/Phone/Video]

CLIENT DETAILS
==============
Name: [Full Name]
DOB: [DD/MM/YYYY] or Age: [XX years]
Address: [Full Address]
Phone: [Phone Number]
Language: [Primary Language]
Cultural Background: [If relevant]

LIVING SITUATION
================
Lives: [alone/with family/etc]
Housing Type: [house/unit/aged care facility]
Family Nearby: [Yes/No - details]

MEDICAL HISTORY
===============
Diagnosed Conditions:
1. [Condition 1]
2. [Condition 2]

Current Medications:
1. [Medication Name] [Dosage] [Frequency]
2. [Medication Name] [Dosage] [Frequency]

Allergies: [List or "None known"]

Recent Medical Events:
- [Falls, hospitalizations, diagnoses]

GP Details:
Name: [Dr. Name]
Clinic: [Clinic Name]
Phone: [Phone Number]

SUPPORT NETWORK
===============
Family:
- [Name]: [Relationship] - [Level of involvement]
- [Name]: [Relationship] - [Level of involvement]

Other Supports:
- [Friends, neighbors, other services]

FUNCTIONAL ASSESSMENT
====================
Mobility: [Description]
Personal Care: [Description of abilities/needs]
Domestic Tasks: [What client can/cannot do]
Cognitive Function: [Any issues noted]

RISKS IDENTIFIED
================
- [Risk 1]: [Details]
- [Risk 2]: [Details]

CLIENT GOALS (in their words)
==============================
"[Direct quote from client about what they want to achieve]"
"[Another goal in client's words]"

SERVICES DISCUSSED
==================
- [Service 1]: [Frequency]
- [Service 2]: [Frequency]

NOTES
=====
[Any additional relevant information]
```

### Content Guidelines

#### What Makes a Good Transcript

**✅ DO Include**:
1. **Specific Medical Details**
   - Exact medication names and dosages
   - Diagnosed conditions (not just symptoms)
   - Dates of recent medical events

2. **Direct Quotes**
   - Client's own words about goals
   - Preferences expressed by client
   - Family member statements

3. **Concrete Information**
   - Actual names (family, GP, specialists)
   - Specific addresses and phone numbers
   - Real dates and frequencies

4. **Observable Behaviors**
   - "Client walks with unsteady gait"
   - "Difficulty remembering recent conversations"
   - "Becomes anxious when discussing finances"

5. **Context**
   - Why assessment is happening now
   - What triggered need for services
   - Client's living environment description

**❌ DON'T Include**:
1. Vague statements like "some medications"
2. "Client has various health issues"
3. "Family helps sometimes"
4. Unstructured conversation without context
5. Irrelevant tangents

#### Optimal Length

**Minimum Effective Length**: 500 words
- Enough for basic care plan
- AI can extract core facts
- May miss nuances

**Sweet Spot**: 1,500-3,000 words
- Comprehensive information
- Detailed goals and preferences
- Rich context for AI
- Processing time: 1-2 minutes

**Maximum Practical Length**: 15,000 words
- Very detailed assessments
- Processing time: 2-3 minutes
- AI may need to summarize

---

## AI Extraction Logic

### How the AI Processes Transcripts

#### Phase 1: Initial Analysis (15-30 seconds)

**AI Prompt Structure**:
```
You are an expert Australian aged care assessor. Extract structured facts
from this assessment transcript following the Gold Standard care plan format.

Requirements:
- Extract exact medication names, dosages, frequencies
- Identify all diagnosed medical conditions
- List family members with their relationships and involvement
- Extract client goals in first-person narrative
- Identify risks with severity levels
- Determine service requirements
- Map information to Aged Care Quality Standards 1-8
```

**AI Processing Steps**:
1. Read entire transcript
2. Identify entities (people, places, medications, conditions)
3. Extract relationships (who is related to whom)
4. Parse dates, numbers, measurements
5. Categorize information by section
6. Convert to structured JSON

#### Phase 2: Fact Extraction (30-60 seconds)

**Extracted Facts Schema**:

```json
{
  "clientDetails": {
    "name": "string",
    "age": "string",
    "dateOfBirth": "string",
    "language": "string",
    "interpreterRequired": boolean,
    "livingSituation": "string",
    "address": "string"
  },
  "medicalInfo": {
    "conditions": ["string"],
    "medications": [
      {
        "name": "string",
        "dosage": "string",
        "frequency": "string"
      }
    ],
    "allergies": ["string"],
    "gpDetails": {
      "name": "string",
      "phone": "string",
      "address": "string"
    }
  },
  "supportNetwork": {
    "familyMembers": [
      {
        "name": "string",
        "relationship": "string",
        "involvement": "string"
      }
    ],
    "informalSupports": ["string"]
  },
  "goals": ["string"],
  "risks": ["string"],
  "serviceRequirements": ["string"]
}
```

#### Phase 3: HTML Generation (30-90 seconds)

**AI Generates**:
1. All 18 care plan sections
2. SMARTA-formatted goals with:
   - Service pricing lookup from database
   - Monthly cost calculations
   - Service category assignment
3. Dignity of Risk tables
4. Compliance mapping to Standards 1-8
5. Professional HTML formatting

**Service Pricing Integration**:
- AI identifies services needed (e.g., "personal care", "physiotherapy")
- System queries `service_rates` table for organization
- If service found: Inserts hourly rate and monthly cost
- If service not found: Uses placeholder "$X/hour"

---

## Care Plan Sections Explained

### Section-by-Section Breakdown

#### Section 1: Care Plan (Title)
**Content**: 
```html
<h1>Care Plan Draft</h1>
<p><strong>Client Name:</strong> [Client Name]</p>
<p><strong>Classification Level:</strong> [Level X - Support at Home]</p>
<p><strong>Date Prepared:</strong> [Current Date]</p>
```

**Purpose**: Header identifying the client and care plan type

---

#### Section 2: Care Alerts
**Content**: Critical information requiring immediate attention

**Examples**:
- "Fall risk - use walking frame for all transfers"
- "Diabetic - monitor blood sugar levels"
- "Allergy to penicillin"
- "Dementia - repeat instructions clearly"

**Format**: Bullet points, highlighted or bold

**AI Extraction**: Pulls from risks, medical conditions, behavioral notes

---

#### Section 3: My Care Plan (Demographics)
**Content**:
```
Name: [Full Name]
Date of Birth: [DOB]
Address: [Full Address]
Phone: [Phone Number]
Language: [Primary Language]
Interpreter Required: [Yes/No]
```

**Purpose**: Basic demographics for identification

---

#### Section 4: People Involved in Developing My Care Plan
**Content**: Table or list of:
- Client name
- Family members who participated
- Assessor name
- Date of assessment

**Example**:
```
This care plan was developed with:
- Margaret Wilson (Client)
- Jane Wilson (Daughter)
- Sarah Johnson (Care Partner, Salveo Care)
- Assessment Date: 15 October 2024
```

---

#### Section 5: Cultural, Diversity, Values and Beliefs
**Content**: First-person narrative about:
- Cultural background
- Religious beliefs
- Important values
- Preferences related to culture

**Example**:
```
"I am of Greek heritage and Orthodox faith. I prefer to have meals 
that include Mediterranean foods. I observe Easter according to the 
Orthodox calendar and may need flexibility with services during 
religious holidays."
```

---

#### Section 6: Care Worker and Service Delivery Preferences
**Content**: Preferences for how services are delivered

**Examples**:
- "I prefer female care workers for personal care"
- "I like services in the morning between 8-10am"
- "I prefer the same care worker for continuity"
- "I need services on weekdays only, not weekends"

---

#### Section 7: Preferred Support People
**Content**: Family members client wants involved

**Format**: Table with:
| Name | Relationship | Phone | Role in Care |
|------|-------------|-------|--------------|
| Jane Wilson | Daughter | 0412 XXX XXX | Primary contact, medical decisions |

---

#### Section 8: Informal Supports
**Content**: Non-professional support network

**Examples**:
- "My daughter Jane helps with shopping weekly"
- "Neighbor Mrs. Thompson checks on me daily"
- "Son David calls from Sydney twice weekly"

---

#### Section 9: Important Things to Know About Me
**Content**: Personal information relevant to care

**Examples**:
- "I worked as a teacher for 40 years"
- "I love gardening but can't do heavy lifting anymore"
- "I become anxious in noisy environments"
- "I'm very independent and like to do things myself when possible"

---

#### Section 10: My Medical Information
**Content**: Comprehensive medical details

**Subsections**:

**Diagnosed Conditions**:
- Type 2 Diabetes
- Osteoarthritis (both knees)
- Mild Cognitive Impairment

**Current Medications**:
| Medication | Dosage | Frequency | Purpose |
|-----------|--------|-----------|---------|
| Metformin | 500mg | Twice daily with meals | Diabetes management |
| Panadol Osteo | As needed | For pain | Arthritis pain relief |

**Allergies**: 
- Penicillin (causes rash)

**GP Details**:
- Dr. Michael Chen
- Camberwell Medical Centre
- Phone: (03) 9XXX XXXX

---

#### Section 11: Risk Assessment
**Content**: Identified risks with severity and mitigation

**Format**: Table with:
| Risk | Severity | Mitigation Strategy |
|------|----------|-------------------|
| Falls | High | Walking frame, grab rails, remove trip hazards |
| Medication management | Medium | Webster pack, care worker supervision |

**Common Risks**:
- Falls (most common)
- Medication errors
- Social isolation
- Cognitive decline
- Nutritional deficiency
- Skin integrity (pressure injuries)

---

#### Section 12: Emergency Contacts & Instructions
**Content**: Who to contact in emergencies

**Format**:
```
Emergency Contact 1:
Name: Jane Wilson
Relationship: Daughter
Phone: 0412 XXX XXX
Available: All times

Emergency Contact 2:
Name: David Wilson
Relationship: Son
Phone: 0423 XXX XXX
Available: Business hours

Emergency Instructions:
- In case of fall: Call ambulance 000, then contact Jane
- If blood sugar issues: Check levels, contact GP or 000 if severe
- Hospital preference: Box Hill Hospital
```

---

#### Section 13: My Goals (SMARTA Format)

**This is the most important section**. See detailed breakdown in [SMARTA Goals Framework](#smarta-goals-framework) section below.

---

#### Section 14: Budget and Service Classifications

See detailed breakdown in [Budget & Service Classifications](#budget--service-classifications) section below.

---

#### Section 15: Care Plan Consent and Distribution
**Content**: Consent and sharing information

**Example**:
```
I, Margaret Wilson, consent to this care plan and agree to have it 
shared with:
- My GP Dr. Michael Chen
- My daughter Jane Wilson
- Salveo Care staff involved in my care

I understand I can request changes to this plan at any time.

Client Signature: ___________________ Date: ___________
```

---

#### Section 16: Prepared By
**Content**: 
```
Care Plan Prepared By:
Name: Sarah Johnson
Role: Care Partner
Organization: Salveo Care Services
Date: 15 October 2024
```

---

#### Section 17: Transcript Summary (Mapped to Standards 1-8)
**Content**: AI summary of transcript mapped to each Quality Standard

**Format**:
```
Standard 1: Consumer Dignity and Choice
Margaret has clearly expressed her wish to remain in her own home 
and maintain independence. She values making her own decisions while 
acknowledging where she needs support.

Standard 2: Ongoing Assessment and Planning
This initial assessment involved Margaret and her daughter Jane. 
Regular reviews will occur quarterly or sooner if needs change.

[Continues for all 8 standards]
```

**Purpose**: Demonstrates compliance with regulatory requirements

---

#### Section 18: Dignity of Risk Assessment
**Content**: Documents client's right to make informed choices

**Format**: Table with:
| Risk Identified | Client's Choice | Potential Consequences | Mitigation | Acknowledgement | Date |
|----------------|----------------|---------------------|-----------|----------------|------|
| Fall risk - refuses walking frame | Continue walking without frame in familiar areas | May fall and injure self | Remove trip hazards, physio for strength | Margaret understands risk and chooses independence | 15/10/2024 |

**Philosophy**: 
- Acknowledges client autonomy
- Documents informed decision-making
- Shows duty of care while respecting choice
- Protects both client and provider

---

## SMARTA Goals Framework

### What is SMARTA?

SMARTA is a goal-setting framework mandated by the Support at Home Program (July 2025). It extends the traditional SMART framework with an Action-oriented component.

### SMARTA Components

| Letter | Component | Definition | Key Question |
|--------|-----------|-----------|--------------|
| **S** | Specific | Clear, detailed, unambiguous goal | What exactly does the client want? |
| **M** | Measurable | Observable progress indicators | How will we know if we're succeeding? |
| **A** | Achievable | Realistic given client's abilities | Can this actually be accomplished? |
| **R** | Relevant | Aligns with client's values and needs | Why does this matter to the client? |
| **T** | Time-bound | Has a timeframe or review period | When will this be achieved/reviewed? |
| **A** | Action-oriented | Specific tasks and responsibilities | Who does what, and when? |

### Goal Structure in Care Plan

Each goal includes:

```html
<div class="goal">
  <h3>Goal [Number]: [Goal Title]</h3>
  
  <p><strong>What I want to achieve:</strong></p>
  <p>[First-person narrative of goal]</p>
  
  <p><strong>My abilities and what we need to consider:</strong></p>
  <p>[Client's current abilities and any risks to consider]</p>
  
  <p><strong>How we'll achieve it:</strong></p>
  <ul>
    <li>[Specific action 1]</li>
    <li>[Specific action 2]</li>
  </ul>
  
  <p><strong>Who is responsible:</strong></p>
  <p>[Care worker role/organization]</p>
  
  <p><strong>When it will be done:</strong></p>
  <p>[Frequency/schedule]</p>
  
  <p><strong>Service and Cost:</strong></p>
  <p>[Service Name] at $[X]/hour ($[Y]/month based on [Z] hours monthly)</p>
  <p>Service Category: [Clinical Care/Independence Support/Everyday Living]</p>
</div>
```

### Example Goals

#### Example 1: Personal Care Goal

**Goal 1: Maintain personal hygiene and feel confident**

**What I want to achieve:**
"I want to shower safely twice a week and feel clean and confident. I'm worried about falling in the shower since my wrist fracture, so I need someone to support me and make sure I'm safe."

**My abilities and what we need to consider:**
I can wash myself once I'm safely in the shower, but I need help getting in and out. I have arthritis in my knees which makes it hard to step over the bath edge. I also have some balance issues, especially when wet.

**How we'll achieve it:**
- Care worker will assist with getting safely in and out of shower
- Supervision during showering to prevent falls
- Help with washing back and feet (areas I can't reach easily)
- Ensure bathroom is warm before starting
- Use non-slip mat and grab rails

**Who is responsible:**
Salveo Care personal care worker

**When it will be done:**
Every Tuesday and Friday morning, 9:00am

**Service and Cost:**
Personal Care at $75/hour ($600/month based on 8 hours monthly)
Service Category: Independence Support - Personal Activities

---

#### Example 2: Domestic Assistance Goal

**Goal 2: Keep my home clean and comfortable**

**What I want to achieve:**
"I've always kept a tidy home and it's important to me. I need help with the heavy cleaning that I can't do anymore because of my knees. I want to be able to keep living here comfortably."

**My abilities and what we need to consider:**
I can do light tasks like dishes and making my bed. I cannot vacuum, mop floors, or clean the bathroom anymore due to arthritis pain. Bending down hurts my knees significantly.

**How we'll achieve it:**
- Vacuum all rooms including under furniture
- Mop kitchen and bathroom floors
- Clean bathroom (toilet, shower, sink)
- Change bed linen
- Take bins out on collection day
- Clean surfaces in kitchen

**Who is responsible:**
Salveo Care domestic assistance worker

**When it will be done:**
Every Wednesday, 10:00am-12:00pm (2 hours weekly)

**Service and Cost:**
Domestic Assistance at $65/hour ($520/month based on 8 hours monthly)
Service Category: Everyday Living - Household Tasks

---

#### Example 3: Allied Health Goal

**Goal 3: Improve my strength and reduce fall risk**

**What I want to achieve:**
"I want to feel steadier on my feet and not be so scared of falling again. The physiotherapist can help me get stronger and more confident with my balance."

**My abilities and what we need to consider:**
I had a fall 3 months ago which knocked my confidence. I can walk short distances but feel unsteady. I'm willing to do exercises but need professional guidance. I tend to rush which increases fall risk.

**How we'll achieve it:**
- Initial physiotherapy assessment of strength and balance
- Develop personalized exercise program
- Practice exercises with physio supervision weekly
- Review progress and adjust exercises as needed
- Education on fall prevention strategies
- Gradual confidence building

**Who is responsible:**
Salveo Care physiotherapist

**When it will be done:**
Weekly sessions (45 minutes) for 12 weeks, then review

**Service and Cost:**
Physiotherapy at $180/hour ($540/month based on 3 hours monthly)
Service Category: Clinical Care - Allied Health

---

### Service Categories Explained

**Clinical Care**:
- Nursing care
- Allied health (physio, OT, podiatry, dietitian)
- Medication management
- Clinical monitoring

**Independence Support**:
- Personal care (showering, dressing, grooming)
- Mobility assistance
- Cognitive support
- Behavioral support

**Everyday Living**:
- Domestic assistance
- Meal preparation
- Shopping
- Transport
- Social support

---

## Budget & Service Classifications

### Purpose

The Budget and Service Classifications section shows:
1. **What services** the client needs (based on their goals)
2. **How services are categorized** under Support at Home
3. **Budget allocation** across categories
4. **Classification level** justification

### Important Design Decision

**SCRBL 2.0 displays ONLY services mentioned in client's goals**, not the entire organizational service catalog.

**Why?**
- Keeps care plan focused and relevant
- Avoids overwhelming clients with unused services
- Accurately reflects actual service needs
- Simplifies budget planning

### Section Structure

```html
<h2>Budget and Service Classifications</h2>

<h3>Services Required (Based on Goals)</h3>
<table>
  <thead>
    <tr>
      <th>Service</th>
      <th>Category</th>
      <th>Rate</th>
      <th>Monthly Hours</th>
      <th>Monthly Cost</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Personal Care</td>
      <td>Independence Support</td>
      <td>$75/hour</td>
      <td>8 hours</td>
      <td>$600</td>
    </tr>
    <!-- More services -->
  </tbody>
</table>

<h3>Budget Allocation</h3>
<p>Total Monthly Services: $[Total]</p>
<p>Quarterly Budget: $[Total × 3]</p>

<p>Budget Breakdown by Category:</p>
<ul>
  <li>Clinical Care: $[Amount] ([Percentage]%)</li>
  <li>Independence Support: $[Amount] ([Percentage]%)</li>
  <li>Everyday Living: $[Amount] ([Percentage]%)</li>
</ul>

<h3>Classification Level</h3>
<p>This client has been assessed as Classification Level [X] under the 
Support at Home Program based on:
- [Reason 1]
- [Reason 2]
</p>
```

### Example Budget Section

```
BUDGET AND SERVICE CLASSIFICATIONS

Services Required (Based on Goals)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| Service              | Category              | Rate       | Monthly Hours | Monthly Cost |
|---------------------|----------------------|-----------|--------------|-------------|
| Personal Care       | Independence Support  | $75/hour  | 8 hours      | $600        |
| Domestic Assistance | Everyday Living       | $65/hour  | 8 hours      | $520        |
| Physiotherapy       | Clinical Care         | $180/hour | 3 hours      | $540        |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Budget Allocation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Monthly Services: $1,660
Quarterly Budget: $4,980

Budget Breakdown by Category:
• Clinical Care: $540 (32.5%)
• Independence Support: $600 (36.1%)
• Everyday Living: $520 (31.4%)

Classification Level
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This client has been assessed as Classification Level 4 under the 
Support at Home Program based on:
- Multiple chronic health conditions requiring ongoing management
- Moderate support needs for personal care and domestic tasks
- Allied health services for fall prevention and mobility
- Cognitive impairment requiring some supervision
```

### How Services Are Matched

**AI Process**:
1. AI identifies services in goals (e.g., "personal care", "physiotherapy")
2. System queries organization's `service_rates` table
3. Matches service names (case-insensitive, partial match)
4. Retrieves hourly rate and category
5. If match found: Inserts rate and calculates monthly cost
6. If no match: Uses placeholder "$X/hour" and suggests admin configure rate

**Service Name Matching Examples**:
- Goal mentions "showering assistance" → Matches "Personal Care"
- Goal mentions "cleaning" → Matches "Domestic Assistance"
- Goal mentions "physio" → Matches "Physiotherapy" or "Physiotherapist"

---

## Saving & Managing Plans

### Saved Plans Page

**URL**: `/saved-plans`

**Page Structure**:
- **Header**: Same as care planner (logo, user menu)
- **Main Content**: Table of all saved care plans for the organization

### Care Plans Table

**Columns**:

| Column | Content | Sortable | Searchable |
|--------|---------|----------|------------|
| Plan Name | User-entered plan name | Yes | Yes |
| Client Name | Client's name from care plan | Yes | Yes |
| Date Saved | Timestamp when saved | Yes | Yes |
| Actions | View, Export, Delete buttons | No | No |

**Example Table Display**:
```
┌──────────────────────────────────────┬─────────────────┬─────────────────────┬─────────┐
│ Plan Name                            │ Client Name     │ Date Saved          │ Actions │
├──────────────────────────────────────┼─────────────────┼─────────────────────┼─────────┤
│ Margaret Wilson - Initial Oct 2024   │ Margaret Wilson │ 15/10/2024 2:30 PM  │ [View]  │
│ John Smith - Review Assessment       │ John Smith      │ 12/10/2024 10:15 AM │ [View]  │
│ Sarah Lee - Reassessment            │ Sarah Lee       │ 08/10/2024 3:45 PM  │ [View]  │
└──────────────────────────────────────┴─────────────────┴─────────────────────┴─────────┘
```

### Search Functionality

**Search Box**:
- **Location**: Top of page
- **Field ID**: `input-search-plans`
- **Placeholder**: "Search plans by client name, plan name..."
- **Type**: Text input
- **Real-time**: Yes (filters as you type)

**Search Behavior**:
- Searches across: Plan name, Client name
- Case-insensitive
- Partial match
- Results update instantly

**Example**:
- Search "margaret" → Shows all plans with "margaret" in name
- Search "oct 2024" → Shows plans saved in October 2024
- Search "initial" → Shows all initial assessments

### Viewing a Saved Plan

**Action**: Click on any row in the table

**Result**: Opens detail view of the selected plan

**Detail View Shows**:

1. **Header Section**:
   - Plan name
   - Client name
   - Date saved
   - Action buttons:
     - Print
     - Export to Word
     - Back to list

2. **Extracted Facts Panel** (if available):
   - Same layout as care planner middle panel
   - Shows all extracted facts
   - Collapsible sections

3. **Care Plan HTML**:
   - Full formatted care plan
   - All 18 sections
   - Professional styling
   - Print-ready

4. **Client Documents Section**:
   - List of attached documents for this client
   - Upload new documents button
   - Document previews/download links

### Filtering by Client

When viewing a plan, user can see all plans for the same client:

**"Care Plans for this Client" Section**:
- Shows all saved plans for the current client
- Grouped by client name
- Sorted by date (newest first)
- Quick navigation between versions

### Client Folders

**Automatic Organization**:
- System automatically groups documents by client name
- Each client gets a virtual "folder"
- Folder name = client name from first saved plan
- All documents uploaded when viewing any plan for that client go into client's folder

**Folder Aliases**:
- If client name changes, system maintains folder mapping
- Example: "Marg Wilson" and "Margaret Wilson" can be linked to same folder
- Admins can create aliases in database

---

## Export Functions

### Export to Word

**Button Location**: 
- Care Planner: Top-right of preview panel
- Saved Plans: Top-right of plan detail view

**Button**: 
- **ID**: `button-export-word`
- **Label**: "Export to Word"
- **Color**: Blue
- **Icon**: Download icon

**What Happens**:

1. User clicks "Export to Word"
2. System generates .doc file containing:
   - **Header**: "SCRBL 2.0 - AI Assisted Care Plan Drafts in Minutes"
   - **Full care plan HTML** (sanitized with DOMPurify)
   - **Styling**: Professional formatting with Times New Roman font
3. File downloads to user's device
4. Toast notification: "Word Export Complete"

**File Name Format**:
```
[ClientName]-[Date].doc

Examples:
- margaret-wilson-2024-10-15.doc
- john-smith-2024-10-12.doc
```

**File Contents**:

```html
<html>
  <head>
    <title>Care Plan Draft - [Client Name]</title>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Times New Roman', serif; margin: 40px; }
      .logo-header { 
        text-align: center; 
        margin-bottom: 30px; 
        padding-bottom: 20px; 
        border-bottom: 2px solid #ddd; 
      }
      h1 { font-size: 18pt; font-weight: bold; }
      h2 { font-size: 14pt; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 6pt; }
    </style>
  </head>
  <body>
    <div class="logo-header">
      <h2>SCRBL 2.0 - AI Assisted Care Plan Drafts in Minutes</h2>
    </div>
    [CARE PLAN HTML CONTENT]
  </body>
</html>
```

**Editing in Microsoft Word**:
- File opens as editable Word document
- Users can modify text, formatting, tables
- Can add organization letterhead
- Can sign electronically or print for wet signature

**Use Cases**:
- Customize care plan after AI generation
- Add organization-specific sections
- Prepare for client/family review
- Archive in client management system

### Print Function

**Button Location**: Same as Export to Word

**Button**:
- **ID**: `button-print`
- **Label**: "Print"
- **Style**: Outline (less prominent than export)
- **Icon**: Printer icon

**What Happens**:

1. User clicks "Print"
2. Browser print dialog opens
3. Print preview shows:
   - Care plan HTML
   - Extracted facts (if from saved plan)
   - No page headers/footers from website
4. User can:
   - Print to physical printer
   - Save as PDF through browser
   - Adjust print settings

**Print Styling**:
- Optimized for A4 paper
- Page breaks between major sections
- Black and white friendly
- Professional fonts

---

## Client Documents Management

### Overview

Client documents feature allows users to attach files (PDFs, images, Word docs) to care plans. Documents are organized by client and stored in AWS S3 object storage.

### Accessing Document Upload

**Location**: When viewing a saved care plan

**Section**: "Client Documents" (below care plan HTML)

**Upload Button**:
- **ID**: `button-upload-document`
- **Label**: "Upload Document"
- **Visibility**: Only visible when viewing a saved plan

### Upload Process

#### Step 1: Click Upload Document

**What Appears**: File upload modal/dialog

**Modal Contents**:
- File selector
- Optional note field
- Upload button
- Cancel button

#### Step 2: Select File

**Supported File Types**:
- **Documents**: .pdf, .doc, .docx
- **Images**: .jpg, .jpeg, .png, .gif
- **Other**: .txt, .csv, .xlsx

**File Size Limits**:
- **Maximum**: 10 MB per file
- **Recommended**: < 5 MB for faster upload
- **Large files**: May take longer to upload

#### Step 3: Add Note (Optional)

**Note Field**:
- **Purpose**: Describe what the document is
- **Examples**:
  - "Medical report from Dr. Chen - Oct 2024"
  - "Consent form signed by family"
  - "Photo of home hazards identified"
- **Character Limit**: 500 characters

#### Step 4: Upload

**Action**: Click "Upload" button

**Process**:
1. File is validated (type, size)
2. File uploaded to AWS S3
3. Database record created with:
   - File name
   - S3 object key
   - Client folder
   - Upload date
   - Uploaded by (user ID)
   - Optional note
4. Success toast: "Document uploaded successfully"

**Error Handling**:
| Error | Cause | Message | Resolution |
|-------|-------|---------|------------|
| File too large | > 10 MB | "File exceeds maximum size of 10MB" | Compress or split file |
| Invalid type | Not in allowed types | "File type not supported" | Convert to PDF or image |
| Upload failed | Network/S3 error | "Failed to upload document" | Try again |
| No file selected | Empty upload | "Please select a file" | Choose a file |

### Viewing Documents

**Document List Display**:
```
Client Documents for Margaret Wilson
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 medical-report-oct-2024.pdf
   Uploaded: 15/10/2024 2:45 PM
   Note: Medical report from Dr. Chen - Oct 2024
   [Download] [Delete]

📄 consent-form-signed.pdf
   Uploaded: 15/10/2024 2:30 PM
   Note: Consent form signed by family
   [Download] [Delete]

🖼️ home-photo.jpg
   Uploaded: 15/10/2024 2:35 PM
   Note: Photo of home hazards identified
   [Preview] [Download] [Delete]
```

**Document Actions**:

**Download**:
- Generates signed S3 URL
- Downloads file to user's device
- Preserves original file name

**Preview** (images only):
- Shows image in modal
- Full-size view
- Can download from preview

**Delete**:
- Shows confirmation: "Are you sure you want to delete this document?"
- If confirmed: Removes from S3 and database
- Cannot be undone

### Client Folder Organization

**Automatic Folder Assignment**:
- Each unique client name gets a folder
- Folder name = normalized client name
- Example: "Margaret Wilson" → folder `margaret-wilson`

**Folder Sharing**:
- All plans for the same client share documents
- Documents uploaded on any plan for "Margaret Wilson" appear on all her plans
- Organization-scoped: Only users in same organization see documents

**Folder Aliases** (Admin Feature):
- Allows linking different names to same client
- Example: "Marg Wilson", "Margaret Wilson", "M. Wilson" → same folder
- Managed in database `client_folder_aliases` table

---

## Admin Features

### Accessing Admin Panel

**Requirement**: User must have `role` = "admin" or "super_admin"

**Access Method**:
1. Click user dropdown (top-right corner)
2. Menu shows "User Management" option (only for admins)
3. Click "User Management"
4. Redirects to `/admin`

**If Not Admin**:
- "User Management" option does not appear in dropdown
- Direct navigation to `/admin` shows access denied

### Admin Dashboard Layout

**URL**: `/admin`

**Page Structure**:
- Header (same as other pages)
- Two tabs:
  1. **Users** (default)
  2. **Service Pricing**

---

### Users Tab

**Purpose**: Manage organization users and their access

#### User List Table

**Columns**:

| Column | Content | Width |
|--------|---------|-------|
| Name | First Name Last Name | 25% |
| Email | User's email address | 30% |
| Role | admin or user | 15% |
| Plan Limit | Monthly limit or "Unlimited" | 15% |
| Actions | Edit, Delete buttons | 15% |

**Example Display**:
```
┌──────────────────┬─────────────────────────────┬───────┬──────────────┬─────────┐
│ Name             │ Email                       │ Role  │ Plan Limit   │ Actions │
├──────────────────┼─────────────────────────────┼───────┼──────────────┼─────────┤
│ Sarah Johnson    │ sarah@salveocare.com.au     │ admin │ Unlimited    │ [Edit]  │
│ John Williams    │ john@salveocare.com.au      │ user  │ 50/month     │ [Edit]  │
│ Emma Davis       │ emma@salveocare.com.au      │ user  │ 30/month     │ [Edit]  │
└──────────────────┴─────────────────────────────┴───────┴──────────────┴─────────┘
```

**Plan Limit Display**:
- If `monthly_plan_limit` is `null`: Shows "Unlimited"
- If `monthly_plan_limit` is number: Shows "X/month"
- Shows current usage: "5 of 50 used this month"

#### Add New User

**Button**: "Add User" (top-right of Users tab)

**Modal/Form Fields**:

| Field | Required | Type | Validation | Default |
|-------|----------|------|-----------|---------|
| Email | Yes | email | Valid email format | "" |
| Password | Yes | password | Min 6 chars | "" |
| First Name | Yes | text | Min 1 char | "" |
| Last Name | Yes | text | Min 1 char | "" |
| Role | Yes | select | "admin" or "user" | "user" |
| Monthly Plan Limit | No | number | Positive integer or empty | null (unlimited) |

**Add User Process**:

1. Admin clicks "Add User"
2. Modal opens with form
3. Admin fills in fields:
   - **Email**: New user's work email
   - **Password**: Temporary password (user should change)
   - **First/Last Name**: User's full name
   - **Role**: 
     - "user" = Standard access (generate, save, view plans)
     - "admin" = Full access (+ user management, service pricing)
   - **Monthly Plan Limit**:
     - Leave empty for unlimited
     - Enter number (e.g., 50) to limit
4. Admin clicks "Create User"
5. Backend validates:
   - Email not already in use
   - All required fields present
   - Valid email format
6. User created with:
   - Hashed password (bcrypt)
   - Same `organization_id` as admin
   - Specified role and limits
7. Success toast: "User created successfully"
8. User appears in table

**New User Access**:
- Can log in immediately with email/password provided
- Recommended: Send credentials securely (email, phone, in-person)
- Best practice: User changes password on first login

#### Edit User

**Action**: Click "Edit" button next to user

**Modal Fields** (pre-filled with current values):
- First Name
- Last Name
- Email
- Role
- Monthly Plan Limit
- **Password**: Empty (only fill to change)

**Edit Process**:
1. Admin clicks "Edit"
2. Modal opens with current values
3. Admin modifies fields
4. Admin clicks "Update User"
5. Changes saved to database
6. Success toast: "User updated successfully"

**Common Edits**:
- **Increase plan limit**: User needs more plans
- **Change role**: Promote user to admin
- **Reset password**: User forgot password
- **Update name**: Legal name change

#### Delete User

**Action**: Click "Delete" button next to user

**Warning**: "Are you sure you want to delete this user? This cannot be undone."

**Confirmation Required**: Yes

**What Gets Deleted**:
- User account
- User sessions

**What Remains**:
- Care plans created by user (ownership transferred to organization)
- Documents uploaded by user

**Cannot Delete**:
- Currently logged-in user (self-deletion prevented)
- Last admin in organization (prevents lockout)

---

### Service Pricing Tab

**Purpose**: Configure hourly rates for services offered by organization

**Why Important**: 
- AI uses these rates in care plan goals
- Automatic cost calculations
- Budget accuracy

#### Service Pricing Table

**Columns**:

| Column | Content | Width |
|--------|---------|-------|
| Service Name | Name of service | 35% |
| Category | Clinical/Independence/Everyday | 30% |
| Hourly Rate | Dollar amount | 20% |
| Actions | Edit, Delete buttons | 15% |

**Example Display**:
```
┌──────────────────────┬──────────────────────┬──────────────┬─────────┐
│ Service Name         │ Category             │ Hourly Rate  │ Actions │
├──────────────────────┼──────────────────────┼──────────────┼─────────┤
│ Personal Care        │ Independence Support │ $75.00       │ [Edit]  │
│ Domestic Assistance  │ Everyday Living      │ $65.00       │ [Edit]  │
│ Physiotherapy        │ Clinical Care        │ $180.00      │ [Edit]  │
│ Nursing              │ Clinical Care        │ $150.00      │ [Edit]  │
│ Meal Preparation     │ Everyday Living      │ $60.00       │ [Edit]  │
└──────────────────────┴──────────────────────┴──────────────┴─────────┘
```

#### Add New Service

**Button**: "Add Service" (top-right of Service Pricing tab)

**Modal Fields**:

| Field | Required | Type | Validation | Example |
|-------|----------|------|-----------|---------|
| Service Name | Yes | text | Min 2 chars | "Physiotherapy" |
| Category | Yes | select | See options below | "Clinical Care" |
| Hourly Rate | Yes | number | Positive number | 180.00 |

**Category Options**:
1. "Clinical Care" - Nursing, allied health, clinical monitoring
2. "Independence Support" - Personal care, mobility, cognitive support
3. "Everyday Living" - Domestic tasks, meals, shopping, social

**Add Service Process**:
1. Admin clicks "Add Service"
2. Modal opens
3. Admin enters:
   - **Service Name**: "Physiotherapy" (or "Physio", "Physiotherapist" - all work)
   - **Category**: "Clinical Care"
   - **Hourly Rate**: 180.00
4. Clicks "Add Service"
5. Backend creates service record with organization_id
6. Success toast: "Service added successfully"
7. Service appears in table

**Matching Logic**:
- AI looks for partial, case-insensitive matches
- "physio" in goal → matches "Physiotherapy" service
- "personal care" → matches "Personal Care"
- "cleaning" → matches "Domestic Assistance" or "Cleaning"

#### Edit Service

**Action**: Click "Edit" next to service

**Modal**: Same fields as Add, pre-filled with current values

**Common Edits**:
- Update rates (annual price increases)
- Rename service (better AI matching)
- Change category (reclassification)

**Process**:
1. Click "Edit"
2. Modify fields
3. Click "Update"
4. Changes saved
5. Future care plans use new rates
6. Existing saved plans retain old rates

#### Delete Service

**Action**: Click "Delete" next to service

**Warning**: "Are you sure? This service will no longer be available for new care plans."

**What Happens**:
- Service removed from database
- AI won't match this service in future plans
- Existing care plans with this service are unaffected

**Best Practice**: Instead of deleting, set rate to 0 or rename to "DEPRECATED - [Name]"

---

## Error Messages & Troubleshooting

### Common Errors by Category

#### Authentication Errors

| Error Message | When It Appears | Cause | User Action |
|--------------|----------------|-------|-------------|
| "Invalid email or password" | Login page | Wrong credentials | Check email/password, try again |
| "Session expired" | Any page, suddenly logged out | 24hr inactivity timeout | Log in again |
| "Access denied" | Trying to access admin features | User doesn't have admin role | Contact administrator |
| "An account with this email already exists" | Registration | Email in use | Try logging in or use different email |

#### Care Plan Generation Errors

| Error Message | When It Appears | Cause | User Action |
|--------------|----------------|-------|-------------|
| "Client name is required" | Clicking Generate | Empty client name field | Enter client name |
| "Transcript is required" | Clicking Generate | Empty transcript field | Paste transcript content |
| "Transcript too short" | Clicking Generate | < 10 characters in transcript | Add more detailed transcript |
| "Failed to generate care plan" | During generation | AI API error or timeout | Try again; if persists, contact admin |
| "You have reached your monthly plan generation limit of X plans" | Clicking Generate | User exceeded monthly limit | Wait until next month or contact admin to increase limit |
| "OpenAI API key not configured" | During generation | Missing OPENAI_API_KEY | System falls back to offline mode; contact admin for AI features |

#### Save Errors

| Error Message | When It Appears | Cause | User Action |
|--------------|----------------|-------|-------------|
| "Plan name is required" | Clicking Save | Empty plan name field | Enter a plan name |
| "Failed to save care plan" | Clicking Save | Database error | Try again; if persists, contact support |
| "No care plan to save" | Clicking Save | Haven't generated plan yet | Generate a care plan first |

#### Document Upload Errors

| Error Message | When It Appears | Cause | User Action |
|--------------|----------------|-------|-------------|
| "File exceeds maximum size of 10MB" | Uploading file | File > 10MB | Compress file or split into parts |
| "File type not supported" | Uploading file | Invalid file extension | Convert to PDF, JPG, PNG, or DOC |
| "Failed to upload document" | During upload | S3 or network error | Check internet connection, try again |
| "Please select a file" | Clicking Upload | No file selected | Choose a file first |

#### Admin Errors

| Error Message | When It Appears | Cause | User Action |
|--------------|----------------|-------|-------------|
| "Email already exists" | Adding user | Email in use in organization | Use different email |
| "Cannot delete last admin" | Deleting user | Trying to delete only admin | Promote another user to admin first |
| "Cannot delete yourself" | Deleting user | Admin tries to delete own account | Have another admin delete you |
| "Service name required" | Adding service | Empty service name | Enter service name |
| "Hourly rate must be positive" | Adding/editing service | Rate ≤ 0 | Enter positive dollar amount |

### Troubleshooting Guide

#### Issue: Care Plan Generation is Very Slow

**Symptoms**:
- Progress bar stuck at low percentage
- Elapsed time > 3 minutes
- No error message

**Possible Causes**:
1. **Long transcript**: > 10,000 words takes longer
2. **AI service slow**: OpenAI API experiencing delays
3. **Network issues**: Slow internet connection

**Solutions**:
1. **Wait patiently**: Large transcripts can take 3-4 minutes
2. **Check transcript length**: Consider shortening if > 15,000 words
3. **Try again**: Close and retry generation
4. **Use offline mode**: If urgent, admin can switch to offline processing

**How to Check Transcript Length**:
- Copy transcript to Word
- Check word count (typical: 1,000-5,000 words)
- If > 10,000 words, consider summarizing

---

#### Issue: Service Pricing Not Showing in Care Plan

**Symptoms**:
- Goals show "$X/hour" instead of actual rates
- Budget section missing pricing

**Cause**: Services not configured in Admin panel

**Solution**:
1. Go to Admin > Service Pricing
2. Add all services your organization offers
3. Ensure service names match what AI might extract:
   - "Personal Care" (not "PC" or "personal cares")
   - "Domestic Assistance" (not "cleaning")
   - "Physiotherapy" (can also add "Physio" as separate entry)
4. Regenerate the care plan

**Prevention**: Set up all services before generating first care plan

---

#### Issue: Can't Find Saved Care Plan

**Symptoms**:
- Plan not appearing in Saved Plans table
- Search returns no results

**Possible Causes**:
1. **Different organization**: Viewing as different user/org
2. **Recently saved**: Page not refreshed
3. **Plan deleted**: Someone deleted it
4. **Search too specific**: Narrow search criteria

**Solutions**:
1. **Refresh page**: Click "Saved Plans" again or F5
2. **Clear search**: Remove search terms to see all plans
3. **Check spelling**: Search for part of name
4. **Verify organization**: Ensure logged in to correct account

---

#### Issue: Export Not Working

**Symptoms**:
- Clicking export does nothing
- File doesn't download
- Error in browser console

**Possible Causes**:
1. **Popup blocker**: Browser blocking download
2. **JavaScript error**: Browser compatibility issue
3. **No care plan content**: Nothing to export

**Solutions**:
1. **Allow popups**: Add site to popup whitelist
2. **Try different browser**: Use Chrome, Firefox, or Edge
3. **Check care plan exists**: Ensure plan has content before exporting
4. **Disable extensions**: Temporarily disable ad blockers

**Browser-Specific**:
- **Chrome**: Settings > Privacy > Site Settings > Popups > Allow
- **Firefox**: Preferences > Privacy > Permissions > Block pop-up windows > Exceptions
- **Safari**: Preferences > Websites > Pop-up Windows > Allow

---

#### Issue: Documents Not Uploading

**Symptoms**:
- Upload button does nothing
- Error message appears
- Upload progress stuck

**Possible Causes**:
1. **File too large**: > 10MB
2. **Wrong file type**: Not PDF/image/doc
3. **Network issue**: Slow or no internet
4. **S3 credentials missing**: Server configuration problem

**Solutions**:
1. **Check file size**: Right-click file > Properties > Size
2. **Convert file**: Use PDF converter or image compressor
3. **Check internet**: Test connection
4. **Try smaller file**: Test with small image first
5. **Contact admin**: If all else fails, server config issue

---

#### Issue: Login Fails in Production/Deployed Version

**Symptoms**:
- Can log in during development, not production
- "500 Internal Server Error"
- Page just refreshes, no error

**Cause**: Missing environment variables in production

**Required Environment Variables**:
```
DATABASE_URL=postgresql://... (AWS RDS connection string)
SESSION_SECRET=... (random string)
OPENAI_API_KEY=sk-... (OpenAI key)
AWS_ACCESS_KEY_ID=... (S3 access)
AWS_SECRET_ACCESS_KEY=... (S3 secret)
AWS_REGION=ap-southeast-2 (Sydney)
AWS_S3_BUCKET=... (bucket name)
```

**Solution** (for system administrators):
1. Check deployment platform environment variables
2. Ensure DATABASE_URL points to production database
3. Verify all AWS credentials are correct
4. Test database connection separately
5. Check application logs for specific errors

---

## Common User Questions (AI Agent FAQ)

### Getting Started Questions

**Q: How do I create my first care plan?**

A: Follow these steps:
1. Make sure you're logged in (if not, go to login page)
2. Click "Care Planner" in the header (or it's the default page)
3. Enter client's name in "Client Name" field
4. Select assessment type and classification level (optional but recommended)
5. Paste your assessment transcript in the large text box
6. Click "Generate Care Plan" button
7. Wait 1-3 minutes while AI processes
8. Review the results in the three panels
9. Click "Save Care Plan" at the bottom if you're happy with it

**Q: What should I include in the transcript?**

A: Include these key elements:
- **Client basics**: Name, age, address, language
- **Medical info**: Conditions, medications (with dosages), allergies, GP details
- **Family**: Names and relationships of family members involved
- **Goals**: What the client wants to achieve, in their own words
- **Risks**: Safety concerns, fall risk, cognitive issues
- **Services needed**: Personal care, domestic help, allied health, etc.

The more specific you are, the better the care plan. For example, instead of "client has diabetes," write "Client has Type 2 Diabetes, managed with Metformin 500mg twice daily with meals."

**Q: How long does it take to generate a care plan?**

A: Typical processing times:
- **Short transcript** (< 1,000 words): 30-60 seconds
- **Medium transcript** (1,000-5,000 words): 1-2 minutes
- **Long transcript** (5,000-10,000 words): 2-3 minutes
- **Very long** (>10,000 words): 3-4 minutes

You'll see a progress bar and timer while it's processing. Don't close the page or click away - just wait patiently.

**Q: Do I have to fill in all the fields?**

A: Required fields:
- **Client Name**: Yes, always required
- **Transcript**: Yes, always required (minimum 10 characters)
- **Assessment Type**: No, but recommended for proper documentation
- **Funding Type**: No, but helps AI format correctly
- **Classification Level**: No, but important for budget planning

---

### Using the System Questions

**Q: Can I edit the care plan after it's generated?**

A: Not directly in SCRBL 2.0, but you have two options:
1. **Export to Word**: Click "Export to Word" button, then edit in Microsoft Word
2. **Regenerate**: Modify your transcript and generate again

The Word export is fully editable - you can change any text, add sections, customize formatting, etc.

**Q: How do I save a care plan?**

A: After generating a care plan:
1. Scroll to the bottom of the Care Plan Preview (right panel)
2. You'll see "Save Care Plan" section
3. Enter a descriptive plan name (e.g., "Margaret Wilson - Initial Assessment Oct 2024")
4. Click "Save Care Plan" button
5. You'll see a success message
6. Access it later from "Saved Plans" in the header

**Q: Where do my saved plans go?**

A: All saved plans appear in the "Saved Plans" page:
- Click "Saved Plans" in the header
- You'll see a table of all plans for your organization
- You can search by client name or plan name
- Click any row to view the full plan
- Only people in your organization can see your saved plans

**Q: Can I attach documents to a care plan?**

A: Yes! When viewing a saved care plan:
1. Scroll to the "Client Documents" section
2. Click "Upload Document" button
3. Choose a file (PDF, image, Word doc)
4. Add an optional note describing the document
5. Click "Upload"

Documents are organized by client name, so all plans for the same client share the same documents.

**Q: What file types can I upload?**

A: Supported file types:
- **Documents**: PDF (.pdf), Word (.doc, .docx), Text (.txt), Excel (.xlsx, .csv)
- **Images**: JPEG (.jpg, .jpeg), PNG (.png), GIF (.gif)
- **Maximum size**: 10MB per file

If you have a larger file, try compressing it or splitting it into parts.

---

### Care Plan Content Questions

**Q: What does "SMARTA" mean?**

A: SMARTA is a goal-setting framework used in aged care:
- **S** = Specific (clear and detailed)
- **M** = Measurable (can track progress)
- **A** = Achievable (realistic)
- **R** = Relevant (matches client's values)
- **T** = Time-bound (has a timeframe)
- **A** = Action-oriented (specific tasks)

Every goal in your care plan follows this format to meet Support at Home Program requirements.

**Q: Why doesn't my care plan show pricing for services?**

A: Two possible reasons:
1. **Services not configured**: Your organization administrator needs to set up service pricing
   - Go to Admin > Service Pricing
   - Add all services with hourly rates
   - Regenerate the care plan

2. **Service names don't match**: The AI extracts service names from your transcript
   - If transcript says "showering help" but pricing only has "personal care," they won't match
   - Admin should add common variations of service names

**Q: What is "Dignity of Risk" section?**

A: Dignity of Risk acknowledges that clients have the right to make their own choices, even if those choices involve some risk. 

For example: A client might refuse to use a walking frame even though they have fall risk. The Dignity of Risk section documents:
- The risk (falls)
- Client's choice (not using frame)
- Potential consequences (injury from fall)
- Mitigation strategies (remove trip hazards, physio for strength)
- That client understands and accepts the risk

This protects both the client's autonomy and your organization's duty of care.

**Q: Can I change the care plan template or sections?**

A: No, the 18-section Gold Standard template is fixed to ensure compliance with Australian Aged Care Quality Standards and Support at Home Program requirements. However:
- You can export to Word and modify there
- All sections are automatically populated based on your transcript
- If sections seem incomplete, add more detail to your transcript and regenerate

---

### Admin Questions

**Q: How do I add a new user?**

A: (For administrators only)
1. Click your name in the top-right
2. Select "User Management" from dropdown
3. Go to "Users" tab
4. Click "Add User" button
5. Fill in:
   - Email (their work email)
   - Password (temporary password)
   - First and last name
   - Role (admin or user)
   - Monthly plan limit (leave empty for unlimited)
6. Click "Create User"
7. Give them their email and password securely

**Q: What's the difference between admin and user roles?**

A: **User** (standard role):
- Generate care plans
- Save and view care plans
- Export plans
- Upload documents
- View all organization's plans

**Admin** (elevated role):
- Everything users can do, PLUS:
- Add, edit, delete users
- Set plan generation limits
- Configure service pricing
- Manage organization settings

**Q: How do I set up service pricing?**

A: 1. Go to Admin > Service Pricing tab
2. Click "Add Service"
3. Enter:
   - Service name (e.g., "Personal Care")
   - Category (Clinical Care, Independence Support, or Everyday Living)
   - Hourly rate (e.g., 75.00)
4. Click "Add Service"
5. Repeat for all services your organization offers

**Pro tip**: Add common variations:
- "Physiotherapy" AND "Physio" AND "Physiotherapist"
- "Personal Care" AND "Showering" AND "Personal Care Services"

This helps the AI match services mentioned in transcripts.

**Q: How do plan limits work?**

A: Plan limits control how many care plans a user can generate per calendar month.

**Setting limits**:
- When adding/editing a user, enter a number in "Monthly Plan Limit"
- Leave empty for unlimited
- Example: Enter "50" to allow 50 plans per month

**What happens when limit reached**:
- User sees error: "You have reached your monthly plan generation limit"
- They must wait until next month OR
- Admin can increase their limit

**Why use limits**:
- Control AI API costs (each generation costs money)
- Manage user usage
- Encourage thoughtful, quality care plans vs. mass generation

**Q: Can I delete a user account?**

A: Yes, but with limitations:
1. Go to Admin > Users tab
2. Click "Delete" next to the user
3. Confirm deletion

**Cannot delete**:
- Yourself (the currently logged-in admin)
- The last remaining admin (would lock out organization)

**What happens to their data**:
- User account deleted
- Care plans they created remain (transferred to organization)
- Documents they uploaded remain

---

### Troubleshooting Questions

**Q: The care plan generation seems stuck - what should I do?**

A: First, check the progress:
- Look at the progress bar (should be moving slowly)
- Check elapsed time (should be increasing)
- Long transcripts can take 3-4 minutes

If it's been > 5 minutes:
1. Don't close the page yet - wait a bit longer
2. If > 10 minutes, something's wrong:
   - Refresh the page
   - Try generating again
   - Check your internet connection
3. If it keeps happening, contact your administrator

**Q: I can't log in - what's wrong?**

A: Try these steps:
1. **Check your email and password**: Make sure no typos, check caps lock
2. **Try password reset**: (if feature enabled) or contact administrator
3. **Clear browser cache**: Try incognito/private mode
4. **Try different browser**: Use Chrome, Firefox, or Edge
5. **Check with admin**: They can verify your account exists and reset password

**Q: I saved a care plan but can't find it - where did it go?**

A: Check these:
1. Go to "Saved Plans" page (click in header)
2. **Clear any search filters**: Click the X in search box
3. **Refresh the page**: Press F5 or click Saved Plans again
4. **Check you're logged in to the right organization**: If you have accounts in multiple orgs
5. **Ask colleague**: Maybe someone else can see it?

If still missing, it might not have saved - look for success message when saving.

**Q: Why is the export button not working?**

A: Most common cause: **popup blocker**

Fix it:
1. Look for popup blocker icon in browser address bar
2. Click it and select "Always allow popups from this site"
3. Try export again

Other fixes:
- Try different browser
- Disable browser extensions temporarily
- Make sure the care plan has content (generate first)

**Q: How do I get the service pricing to show up in my care plans?**

A: Two-step process:

**Step 1: Set up services** (Administrator does this):
1. Go to Admin > Service Pricing
2. Add each service your organization offers with hourly rates
3. Use names that match what might appear in transcripts

**Step 2: Regenerate care plan**:
1. Go back to Care Planner
2. Enter/paste the same information
3. Click "Generate Care Plan" again
4. New plan will show pricing

**Note**: Already-saved plans keep old pricing. Only new generations use updated rates.

---

### Best Practices Questions

**Q: What makes a good transcript for AI processing?**

A: **Good transcript characteristics**:
- **Specific medical details**: "Type 2 Diabetes managed with Metformin 500mg twice daily" not "has diabetes"
- **Exact medication info**: Names, dosages, frequencies
- **Direct client quotes**: "I want to stay in my own home" (actual words)
- **Concrete details**: Names of family members, GP's name and phone, actual address
- **Clear goals**: What client wants to achieve, not what worker thinks they need
- **Context**: Why assessment is happening, what triggered need

**Poor transcript examples**:
- "Client has some health issues"
- "Takes various medications"
- "Family helps out"
- "Needs personal care"

**Q: Should I save every care plan I generate?**

A: **Save when**:
- You're happy with the results
- Plan will be used with client/family
- Want to attach documents later
- Need to reference or export later

**Don't need to save**:
- Testing the system
- Practice runs
- You're just going to regenerate immediately
- Duplicate of existing plan

**Q: How should I name my saved plans?**

A: Use a clear, consistent format:

**Good naming examples**:
- "Margaret Wilson - Initial Assessment Oct 2024"
- "John Smith - Review 15-10-2024"
- "Sarah Lee - Reassessment Q3 2024"

**Poor naming examples**:
- "Care plan"
- "Test"
- "MW1"
- "asdf"

**Naming tips**:
- Include client name
- Include assessment type
- Include date
- Be consistent across your organization

**Q: How often should we update service pricing?**

A: **Recommended schedule**:
- **Annual review**: Check rates every July (new financial year)
- **When costs change**: If your organization changes pricing
- **When adding services**: Add new services as you start offering them

**Process**:
1. Admin reviews all service rates
2. Updates any changed rates
3. Notifies team of changes
4. Team regenerates any active care plans

**Note**: Changing rates doesn't affect already-saved plans - they keep original pricing.

---

## Privacy & Compliance

### Privacy Act 1988 Compliance

SCRBL 2.0 is designed to comply with the Australian Privacy Act 1988, particularly the Australian Privacy Principles (APPs).

#### Data Collection (APP 3)

**What Data We Collect**:
- User account info: Email, name, password (hashed)
- Organization info: Organization name
- Care plan data: Client names, assessment transcripts, medical information
- Usage data: Plan generation counts, login times
- Uploaded files: Client documents

**Why We Collect It**:
- User authentication and access control
- Care plan generation and storage
- Usage monitoring and plan limits
- Compliance and audit purposes

**Legal Basis**: Consent (users agree to terms when registering)

#### Data Storage & Security (APP 11)

**Data Residency**:
- **Production Database**: AWS RDS PostgreSQL, Sydney region (ap-southeast-2)
- **File Storage**: AWS S3, Sydney region
- **All data stays in Australia**

**Security Measures**:
- Passwords hashed with bcrypt (10 rounds)
- HTTPS encryption in transit (TLS 1.2+)
- Database encryption at rest (AWS RDS encryption)
- Session-based authentication (secure cookies)
- XSS protection (DOMPurify sanitization)
- SQL injection protection (Drizzle ORM parameterized queries)
- Multi-factor authentication support (future feature)

#### Data Access & Disclosure (APP 6, APP 12)

**Who Can Access Data**:
- **Users**: Only their own organization's data
- **Admins**: All data within their organization
- **Super Admins**: Can impersonate users for support (with audit trail)
- **External parties**: NONE (no data sharing with third parties)

**Multi-Tenant Isolation**:
- Every data table includes `organization_id`
- All queries filtered by organization
- No cross-organization access
- Enforced at database layer

**Audit Trail**:
- All super admin impersonations logged
- User actions timestamped
- IP addresses recorded for security events

#### Data Quality (APP 10)

**Accuracy Measures**:
- Users review AI-extracted facts before saving
- Editable exports (Word) for corrections
- Version control (multiple plans per client)

**Update Process**:
- Users can regenerate plans with updated info
- Admins can edit user details
- No automated data modifications

#### Individual Rights (APP 12, APP 13)

**Right to Access**:
- Users can view all their organization's care plans
- Export feature allows data download
- Admin can provide data exports on request

**Right to Correction**:
- Regenerate care plans with corrected transcripts
- Export to Word and manually correct
- Admin can delete incorrect plans

**Right to Deletion**:
- Users can request account deletion (admin performs)
- Care plans can be deleted individually
- Documents can be deleted
- Data retention policy: 7 years (aged care standard)

---

### Aged Care Quality Standards Compliance

SCRBL 2.0 care plans map to all 8 Aged Care Quality Standards:

#### Standard 1: Consumer Dignity and Choice

**How Care Plans Address This**:
- First-person narrative throughout
- Client goals in their own words
- Dignity of Risk section (acknowledges right to choose)
- Cultural preferences documented
- Service delivery preferences respected

**Care Plan Sections**:
- Section 5: Cultural, diversity, values and beliefs
- Section 6: Care worker and service delivery preferences
- Section 18: Dignity of Risk Assessment

---

#### Standard 2: Ongoing Assessment and Planning with Consumers

**How Care Plans Address This**:
- Assessment type documented (initial, review, reassessment)
- People involved in developing plan listed
- Review periods in goals (time-bound)
- Transcript summary shows client/family involvement

**Care Plan Sections**:
- Section 4: People involved in developing my care plan
- Section 13: My Goals (includes review timeframes)
- Section 17: Transcript Summary

---

#### Standard 3: Personal Care and Clinical Care

**How Care Plans Address This**:
- Medical information comprehensively documented
- Medications with dosages and frequencies
- GP and specialist details
- Clinical service needs identified

**Care Plan Sections**:
- Section 10: My Medical Information
- Section 13: My Goals (clinical services)
- Section 14: Budget and Service Classifications

---

#### Standard 4: Services and Supports for Daily Living

**How Care Plans Address This**:
- Domestic assistance needs documented
- Meal preparation requirements
- Social support identified
- Everyday living services categorized

**Care Plan Sections**:
- Section 13: My Goals (everyday living)
- Section 14: Budget and Service Classifications (Everyday Living category)

---

#### Standard 5: Organisation's Service Environment

**How Care Plans Address This**:
- Service delivery preferences
- Preferred times and days
- Care worker preferences
- Environmental considerations

**Care Plan Sections**:
- Section 6: Care worker and service delivery preferences
- Section 9: Important things to know about me

---

#### Standard 6: Feedback and Complaints

**How Care Plans Address This**:
- Consent and distribution section
- Client signature for agreement
- Process for requesting changes

**Care Plan Sections**:
- Section 15: Care Plan Consent and Distribution

---

#### Standard 7: Human Resources

**How Care Plans Address This**:
- Care worker requirements specified
- Preferred worker characteristics
- Cultural matching needs

**Care Plan Sections**:
- Section 6: Care worker and service delivery preferences
- Section 5: Cultural, diversity, values and beliefs

---

#### Standard 8: Organisational Governance

**How Care Plans Address This**:
- Care plan prepared by section (accountability)
- Organization name documented
- Compliance mapping to all standards
- Audit trail (save dates, user IDs)

**Care Plan Sections**:
- Section 16: Prepared By
- Section 17: Transcript Summary (mapped to Standards 1-8)

---

### Support at Home Program (July 2025)

#### Classification Levels

SCRBL 2.0 supports all Support at Home classification levels:

| Level | Description | Typical Needs |
|-------|------------|--------------|
| **Level 1** | Low needs | Minimal support, preventative services |
| **Level 2** | Low-moderate needs | Some personal care, domestic assistance |
| **Level 3** | Moderate needs | Regular personal care, some clinical support |
| **Level 4** | Moderate-high needs | Daily support, medication management |
| **Level 5** | High needs | Significant daily support, regular clinical care |
| **Level 6** | High-complex needs | Extensive support, complex medical needs |
| **Level 7** | Very high needs | Near-constant support, significant clinical care |
| **Level 8** | Extreme needs | 24/7 support considerations, very complex needs |
| **Restorative** | Short-term restorative | Time-limited intensive support for recovery |
| **End of Life** | Palliative care | Comfort care, dignity in final stages |

#### Service Categories

**Clinical Care**:
- Nursing (wound care, medication management)
- Allied Health (physio, OT, podiatry, dietitian, speech therapy)
- Clinical monitoring
- Continence management

**Independence Support**:
- Personal care (showering, dressing, grooming)
- Mobility assistance
- Cognitive support
- Behavioral support
- Support with activities of daily living

**Everyday Living**:
- Domestic assistance (cleaning, laundry)
- Meal preparation
- Shopping and errands
- Social support and companionship
- Transport assistance
- Home maintenance

#### SMARTA Goals Requirement

All goals must follow SMARTA framework - see [SMARTA Goals Framework](#smarta-goals-framework) section.

#### Quarterly Budget Allocation

Care plans include quarterly budget breakdown:
- Total monthly services cost
- Multiplied by 3 for quarterly
- Breakdown by service category
- Percentage allocation across categories

---

## Technical Reference

### API Endpoints

#### Authentication Endpoints

**POST /api/auth/register**
- **Purpose**: Create new user account and organization
- **Request Body**:
  ```json
  {
    "email": "string (email format)",
    "password": "string (min 6 chars)",
    "firstName": "string",
    "lastName": "string",
    "organizationName": "string (min 2 chars)"
  }
  ```
- **Response**: 
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "admin",
      "organizationId": "uuid"
    }
  }
  ```
- **Error Codes**: 400 (validation), 409 (email exists), 500 (server error)

**POST /api/auth/login**
- **Purpose**: Authenticate user and create session
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "admin|user",
      "organizationId": "uuid",
      "monthlyPlanLimit": "number|null",
      "plansGeneratedThisMonth": "number"
    }
  }
  ```
- **Error Codes**: 401 (invalid credentials), 500 (server error)

**POST /api/auth/logout**
- **Purpose**: Destroy session and log out user
- **Request Body**: None
- **Response**: `{ "message": "Logged out successfully" }`

**GET /api/auth/me**
- **Purpose**: Get current authenticated user
- **Response**: Same as login response
- **Error Codes**: 401 (not authenticated)

---

#### Care Plan Endpoints

**POST /api/generate-care-plan**
- **Purpose**: Generate care plan from transcript
- **Request Body**:
  ```json
  {
    "clientName": "string",
    "assessmentType": "string (optional)",
    "fundingType": "hcp|sah|'' (optional)",
    "fundingLevel": "level1-8|restorative|endoflife|'' (optional)",
    "transcript": "string (min 10 chars)",
    "processingMode": "ai|offline"
  }
  ```
- **Response**:
  ```json
  {
    "facts": {
      "clientDetails": {...},
      "medicalInfo": {...},
      "supportNetwork": {...},
      "goals": [...],
      "risks": [...],
      "serviceRequirements": [...]
    },
    "html": "string (full care plan HTML)",
    "processingTime": "number (milliseconds)"
  }
  ```
- **Error Codes**: 400 (validation), 429 (rate limit exceeded), 500 (generation failed)

---

#### Saved Care Plans Endpoints

**POST /api/saved-care-plans**
- **Purpose**: Save a care plan
- **Request Body**:
  ```json
  {
    "clientName": "string",
    "planName": "string",
    "html": "string",
    "extractedFacts": "object",
    "assessmentType": "string (optional)",
    "fundingType": "string (optional)",
    "fundingLevel": "string (optional)"
  }
  ```
- **Response**:
  ```json
  {
    "id": "uuid",
    "planName": "string",
    "clientName": "string",
    "saveDate": "timestamp"
  }
  ```

**GET /api/saved-care-plans**
- **Purpose**: Get all saved care plans for organization
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "planName": "string",
      "clientName": "string",
      "saveDate": "timestamp",
      "extractedFacts": "object|null",
      "html": "string",
      "assessmentType": "string",
      "fundingType": "string",
      "fundingLevel": "string"
    }
  ]
  ```

**DELETE /api/saved-care-plans/:id**
- **Purpose**: Delete a saved care plan
- **Response**: `{ "message": "Care plan deleted" }`
- **Error Codes**: 404 (not found), 403 (wrong organization)

---

#### Admin Endpoints

**GET /api/users** (Admin only)
- **Purpose**: Get all users in organization
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "admin|user",
      "monthlyPlanLimit": "number|null",
      "plansGeneratedThisMonth": "number"
    }
  ]
  ```

**POST /api/users** (Admin only)
- **Purpose**: Create new user
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "admin|user",
    "monthlyPlanLimit": "number|null"
  }
  ```

**PATCH /api/users/:id** (Admin only)
- **Purpose**: Update user
- **Request Body**: Partial user object

**DELETE /api/users/:id** (Admin only)
- **Purpose**: Delete user
- **Restrictions**: Cannot delete self or last admin

**GET /api/service-rates** (Admin only)
- **Purpose**: Get all service rates for organization

**POST /api/service-rates** (Admin only)
- **Purpose**: Add service rate
- **Request Body**:
  ```json
  {
    "serviceName": "string",
    "category": "Clinical Care|Independence Support|Everyday Living",
    "hourlyRate": "number"
  }
  ```

**PATCH /api/service-rates/:id** (Admin only)
- **Purpose**: Update service rate

**DELETE /api/service-rates/:id** (Admin only)
- **Purpose**: Delete service rate

---

#### Document Endpoints

**POST /api/client-documents**
- **Purpose**: Upload client document
- **Request**: Multipart form data with file and metadata
- **Response**: Document object with S3 URL

**GET /api/client-documents/:clientName**
- **Purpose**: Get all documents for a client

**DELETE /api/client-documents/:id**
- **Purpose**: Delete document

---

### Database Schema

#### Tables Overview

| Table Name | Purpose | Key Columns |
|-----------|---------|------------|
| `organizations` | Multi-tenant organizations | id, name |
| `users` | User accounts | id, email, password_hash, organization_id, role |
| `saved_care_plans` | Saved care plans | id, organization_id, client_name, plan_name, html, extracted_facts |
| `service_rates` | Service pricing | id, organization_id, service_name, category, hourly_rate |
| `client_documents` | Uploaded files | id, organization_id, client_name, file_name, s3_key |
| `client_folder_aliases` | Client name mappings | id, organization_id, client_name, folder_name |
| `sessions` | User sessions | sid, sess, expire |

#### Users Table Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'user')),
  monthly_plan_limit INTEGER NULL, -- NULL = unlimited
  plans_generated_this_month INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Saved Care Plans Table Schema

```sql
CREATE TABLE saved_care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  client_name VARCHAR(255) NOT NULL,
  plan_name VARCHAR(255) NOT NULL,
  html TEXT NOT NULL,
  extracted_facts JSONB,
  assessment_type VARCHAR(100),
  funding_type VARCHAR(50),
  funding_level VARCHAR(50),
  save_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_plans_org ON saved_care_plans(organization_id);
CREATE INDEX idx_saved_plans_client ON saved_care_plans(client_name);
```

---

### Environment Variables

**Required for Production**:

```bash
# Database (AWS RDS PostgreSQL)
DATABASE_URL=postgresql://username:password@endpoint.ap-southeast-2.rds.amazonaws.com:5432/database_name

# Session Security
SESSION_SECRET=random-256-bit-secret-key-here

# OpenAI API
OPENAI_API_KEY=sk-proj-...

# AWS S3 Object Storage
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET=scrbl-client-documents

# Application
NODE_ENV=production
PORT=5000
```

---

## Example Workflows

### Workflow 1: First-Time User - Complete Journey

**Scenario**: Sarah is a new care coordinator at Salveo Care. She needs to create her first care plan for a client named Margaret Wilson.

**Step-by-Step**:

1. **Registration** (5 minutes)
   - Sarah visits SCRBL 2.0 URL
   - Clicks "Sign up"
   - Enters:
     - Organization: "Salveo Care Services"
     - Name: "Sarah Johnson"
     - Email: "sarah.johnson@salveocare.com.au"
     - Password: "SecurePass123!"
   - Clicks "Create Account"
   - Automatically logged in, sees Care Planner page
   - Sarah is now the first admin for Salveo Care

2. **Set Up Service Pricing** (10 minutes)
   - Sarah clicks user dropdown → "User Management"
   - Clicks "Service Pricing" tab
   - Adds services:
     - Personal Care: Independence Support, $75/hour
     - Domestic Assistance: Everyday Living, $65/hour
     - Nursing: Clinical Care, $150/hour
     - Physiotherapy: Clinical Care, $180/hour
     - Occupational Therapy: Clinical Care, $170/hour
   - Clicks "Add Service" for each

3. **Create First Care Plan** (30 minutes assessment + 3 minutes generation)
   - Sarah conducts phone assessment with Margaret Wilson
   - Takes notes during conversation
   - After assessment, goes to Care Planner
   - Enters:
     - Client Name: "Margaret Wilson"
     - Assessment Type: "Initial Assessment"
     - Funding Type: "Support at Home"
     - Classification Level: "Level 4"
   - Pastes detailed transcript (2,500 words) including:
     - Margaret's demographics (82 years old, lives alone)
     - Medical conditions (Type 2 Diabetes, Osteoarthritis)
     - Medications (Metformin 500mg twice daily, Panadol Osteo)
     - Family (daughter Jane, son David)
     - Goals (stay at home, need help with cleaning and showering)
     - Risks (fall risk, cognitive impairment)
   - Clicks "Generate Care Plan"
   - Waits 2 minutes while AI processes
   - Reviews results

4. **Review and Save** (5 minutes)
   - Sarah reviews Extracted Facts panel:
     - Checks medical info is accurate
     - Verifies family details correct
     - Confirms goals match what Margaret said
   - Reviews Care Plan Preview:
     - Reads through all 18 sections
     - Checks SMARTA goals make sense
     - Verifies service pricing appears correctly
   - Scrolls to bottom
   - Enters Plan Name: "Margaret Wilson - Initial Assessment Oct 2024"
   - Clicks "Save Care Plan"
   - Sees success message

5. **Export to Word** (2 minutes)
   - Sarah clicks "Export to Word"
   - Word document downloads
   - Opens in Microsoft Word
   - Adds Salveo Care letterhead
   - Adjusts formatting slightly
   - Saves on network drive
   - Prints copy for Margaret

**Total Time**: ~55 minutes (vs. 2-4 hours manually)

---

### Workflow 2: Admin Managing Team

**Scenario**: Sarah (admin) needs to add 3 new care coordinators to the system and set their plan limits.

**Step-by-Step**:

1. **Add First User** (3 minutes)
   - Click user dropdown → "User Management"
   - Click "Users" tab
   - Click "Add User"
   - Fill in:
     - Email: john.williams@salveocare.com.au
     - Password: TempPass123! (will tell John to change)
     - First Name: John
     - Last Name: Williams
     - Role: user
     - Monthly Plan Limit: 50
   - Click "Create User"
   - Success message appears

2. **Add Second User** (3 minutes)
   - Click "Add User"
   - Fill in:
     - Email: emma.davis@salveocare.com.au
     - Password: TempPass456!
     - First Name: Emma
     - Last Name: Davis
     - Role: user
     - Monthly Plan Limit: 30
   - Click "Create User"

3. **Add Third User - Admin** (3 minutes)
   - Click "Add User"
   - Fill in:
     - Email: michael.chen@salveocare.com.au
     - Password: TempPass789!
     - First Name: Michael
     - Last Name: Chen
     - Role: admin (senior care coordinator)
     - Monthly Plan Limit: (leave empty for unlimited)
   - Click "Create User"

4. **Communicate Credentials** (5 minutes)
   - Sarah sends secure emails to each:
     - "Your SCRBL 2.0 account is ready"
     - Email and temporary password
     - Link to login page
     - Instructions to change password on first login

5. **Later: Adjust Limits** (1 month later, 2 minutes)
   - John has generated 48 plans, approaching limit
   - Sarah goes to Admin → Users
   - Clicks "Edit" next to John Williams
   - Changes Monthly Plan Limit from 50 to 100
   - Clicks "Update User"
   - John can now generate more plans

**Total Time**: ~16 minutes to onboard 3 users

---

### Workflow 3: Bulk Care Plan Review

**Scenario**: Emma needs to review and update care plans for 10 clients whose reviews are due this quarter.

**Step-by-Step**:

1. **View All Saved Plans** (1 minute)
   - Emma logs in
   - Clicks "Saved Plans"
   - Sees table of all organization's care plans
   - 127 plans total

2. **Filter to Her Clients** (2 minutes)
   - Uses search box to find each client:
     - Searches "Robert Martinez"
     - Finds 2 plans (Initial from June, Review from Sept)
     - Clicks on September review
   - Repeats for 9 more clients

3. **For Each Client - Review Process** (10 minutes per client)
   - Opens saved plan
   - Reviews current care plan HTML
   - Checks Client Documents section
   - Notes what's changed since last review
   - Conducts phone/video review with client
   - Documents changes in notes

4. **Generate Updated Plans** (5 minutes per client)
   - Goes to Care Planner
   - Enters client name
   - Sets Assessment Type: "Review Assessment"
   - Pastes updated transcript with:
     - Changes since last review
     - New goals or modified goals
     - Updated medical information
     - Changed service needs
   - Clicks "Generate Care Plan"
   - Reviews results

5. **Save Updated Plans** (2 minutes per client)
   - Scrolls to bottom
   - Enters Plan Name: "[Client Name] - Review Assessment Oct 2024"
   - Clicks "Save Care Plan"

6. **Export for Distribution** (3 minutes per client)
   - Clicks "Export to Word"
   - Opens in Word
   - Adds cover page with review summary
   - Emails to client/family

**Total Time**: ~3 hours for 10 comprehensive reviews (vs. 1-2 days manually)

---

### Workflow 4: Troubleshooting Service Pricing Issue

**Scenario**: John generates a care plan but notices service pricing shows "$X/hour" instead of actual rates.

**Problem Identification**:
- John generates plan for new client
- Goals section shows:
  - "Personal Care at $X/hour"
  - "Physiotherapy at $X/hour"
- Budget section can't calculate costs

**Troubleshooting Steps**:

1. **Check if Services Exist** (2 minutes)
   - John clicks user dropdown
   - No "User Management" option (he's not admin)
   - Messages Sarah (admin) on Teams

2. **Sarah Checks Service Pricing** (3 minutes)
   - Sarah logs in
   - Goes to Admin → Service Pricing tab
   - Sees only 3 services configured:
     - Domestic Assistance
     - Nursing
     - Occupational Therapy
   - Missing: Personal Care and Physiotherapy

3. **Sarah Adds Missing Services** (3 minutes)
   - Clicks "Add Service"
   - Adds Personal Care:
     - Service Name: Personal Care
     - Category: Independence Support
     - Hourly Rate: 75.00
   - Clicks "Add Service"
   - Adds Physiotherapy:
     - Service Name: Physiotherapy
     - Category: Clinical Care
     - Hourly Rate: 180.00
   - Clicks "Add Service"

4. **John Regenerates Plan** (4 minutes)
   - Goes back to Care Planner
   - Enters same client name and transcript
   - Clicks "Generate Care Plan"
   - Waits for generation
   - Now sees correct pricing:
     - "Personal Care at $75/hour ($600/month)"
     - "Physiotherapy at $180/hour ($540/month)"

5. **Saves Corrected Plan** (1 minute)
   - Enters plan name
   - Clicks "Save Care Plan"

**Resolution Time**: 13 minutes

**Prevention**: Sarah creates organization standard that all services must be configured before generating first care plan.

---

## Version History

**Version 2.0** (November 2024)
- Complete rewrite of user guide for AI agent training
- Added comprehensive field specifications
- Included detailed troubleshooting matrix
- Added example workflows and scenarios
- Expanded technical reference section
- Updated branding to "SCRBL 2.0 - AI Assisted Care Plan Drafts in Minutes"
- Removed PDF export, kept Word export only

**Version 1.0** (October 2024)
- Initial release
- Basic user guide with setup and usage instructions
- Compliance documentation
- Admin features guide

---

**Document End**

For additional support, contact your organization administrator or refer to specific sections above using the table of contents.
