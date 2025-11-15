# SCRBL 2.0 User Guide

## What is SCRBL 2.0?

SCRBL 2.0 is a digital care plan generation tool designed specifically for Australian aged care providers. It uses artificial intelligence to transform assessment transcripts into comprehensive, compliant care plans that meet Australian regulatory standards.

### Who is it for?

- **Care Partners** conducting client assessments
- **Care Coordinators** managing client care plans
- **Organization Administrators** overseeing service delivery
- Any aged care professional involved in care planning under the Support at Home Program

---

## Key Features

### 🤖 AI-Powered Care Plan Generation
- Converts assessment transcripts into structured Gold Standard care plans
- Automatically extracts key facts (client details, medical information, goals, risks)
- Follows the Support at Home Program format (effective July 2025)
- Ensures compliance with Aged Care Quality Standards 1-8

### 📋 Comprehensive Care Plans Include
- Care alerts and client preferences
- Medical history and medications
- Risk assessments (including Dignity of Risk)
- SMARTA-formatted goals with service pricing
- Budget and service classifications
- Emergency contacts and GP details
- Compliance mapping to Quality Standards

### 💾 Document Management
- Save and retrieve care plans
- Attach client documents (PDFs, images)
- Organize files by client folders
- Search and filter saved plans

### 📤 Export Capabilities
- Export to PDF with professional formatting
- Export to Word (.doc) for further editing
- Includes organization branding (Scrbl logo)

### 🔒 Security & Compliance
- Privacy Act 1988 compliant
- Multi-tenant organization separation
- Role-based access control (Admin, User)
- Session-based authentication
- XSS protection on all HTML content

---

## Getting Started

### 1. Registration (First Time Users)

1. Navigate to the registration page
2. Fill in your details:
   - **Organization Name**: Your care provider organization
   - **First Name** and **Last Name**
   - **Email**: Your work email address
   - **Password**: Minimum 6 characters
3. Click **Create Account**
4. You'll be automatically logged in and redirected to the care planner

**Note**: The first user who registers becomes the organization admin with full access.

### 2. Login (Returning Users)

1. Go to the login page
2. Enter your **Email** and **Password**
3. Click **Login**
4. You'll be redirected to the Care Planner page

---

## Creating a Care Plan

### Step 1: Enter Client Information

1. **Client Name**: Enter the client's full legal name
2. **Assessment Type**: Select from:
   - Initial Assessment
   - Review Assessment
   - Reassessment
   - Unplanned Review
3. **Classification Level**: Choose level 1-8 under Support at Home Program
4. **Transcript Source** (optional): Paste the Notta.ai share link if using

### Step 2: Paste Assessment Transcript

In the large text area, paste the complete transcript of your assessment conversation with the client and/or their family. This can include:

- Spoken conversation transcripts (from Notta.ai or similar)
- Written notes from the assessment
- Family meeting discussions
- Client preference statements

**Tips for better results:**
- Include specific details about medical conditions, medications, and allergies
- Mention family members and their roles
- Note any risks, safety concerns, or special considerations
- Include client goals in their own words
- Specify services the client needs

### Step 3: Generate the Care Plan

1. Click the **Generate Care Plan** button
2. Wait while the AI processes your transcript (this may take 1-3 minutes for long transcripts)
3. A progress indicator will show the generation status

**During generation, the system:**
- Analyzes the transcript for key information
- Extracts facts into structured categories
- Generates Gold Standard formatted care plan sections
- Applies service pricing from your organization's rates
- Maps information to Aged Care Quality Standards

### Step 4: Review the Results

The page displays three panels:

#### Left Panel: Care Plan Form
- Your original input fields
- Edit and regenerate if needed

#### Middle Panel: Extracted Facts
Review the AI-extracted information:
- Client demographics
- Medical information (conditions, medications, allergies)
- Support network (family, informal supports)
- Goals and preferences
- Risk factors
- Service requirements

**Verify accuracy** - The AI extracts this from your transcript, but you should review for completeness.

#### Right Panel: Care Plan Preview
The formatted care plan with 18 sections:
1. Care Plan (title)
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

### Step 5: Save or Export

**To Save:**
1. Scroll to the bottom of the preview panel
2. Enter a **Plan Name** (e.g., "John Smith - Initial Assessment Oct 2024")
3. Click **Save Care Plan**
4. Access it later from **Saved Plans**

**To Export:**
- Click **Export to PDF** for a printable version with Scrbl branding
- Click **Export to Word** for a .doc file you can edit in Microsoft Word

---

## Managing Saved Care Plans

### Viewing Saved Plans

1. Click **Saved Plans** in the header
2. Browse your organization's care plans in the table
3. Use the search box to find specific plans by:
   - Client name
   - Plan name
   - Date saved

### Opening a Saved Plan

1. Click on any plan row in the table
2. The plan opens in a detail view showing:
   - Complete care plan HTML
   - Extracted facts (if available)
   - Client documents attached to this plan

### Exporting from Saved Plans

1. Open a saved plan
2. Click **Export to PDF** or **Export to Word**
3. The file downloads to your device

### Attaching Client Documents

When viewing a saved plan, you can upload related documents:

1. Click **Upload Document** in the Client Documents section
2. Select a file (PDF, JPG, PNG, etc.)
3. Add an optional note about the document
4. Click **Upload**

Documents are organized by client folder and accessible to all users in your organization.

---

## Admin Features

### Accessing Admin Panel

If you're an administrator, you'll see an **Admin** button in the header:
1. Click **Admin**
2. You'll see two tabs: **Users** and **Service Pricing**

### Managing Users

**View Users:**
- See all users in your organization
- View their role, email, and plan limits

**Add New User:**
1. Click **Add User**
2. Fill in user details:
   - Email, password, first name, last name
   - **Role**: Admin (full access) or User (standard access)
   - **Monthly Plan Limit**: Number of care plans they can generate per month (leave empty for unlimited)
3. Click **Create User**

**Edit Users:**
- Click **Edit** next to any user
- Update their information
- Change their plan limits or role
- Click **Update User**

**Delete Users:**
- Click **Delete** next to any user
- Confirm the deletion

### Managing Service Pricing

Your organization's service rates determine the pricing shown in care plan "Goals" and "Budget" sections.

**Add New Service:**
1. Click **Add Service**
2. Fill in:
   - **Service Name**: (e.g., "Personal Care", "Physiotherapist")
   - **Category**: Clinical Care, Care & Support, or Allied Health
   - **Hourly Rate**: Dollar amount (e.g., 115.00)
3. Click **Add Service**

**Edit Service Rates:**
- Click **Edit** next to any service
- Update the name, category, or rate
- Click **Update**

**Delete Services:**
- Click **Delete** next to any service
- Confirm the deletion

**Important**: Service rates are used by the AI when generating care plans to automatically calculate costs for each goal.

---

## Understanding Care Plan Sections

### SMARTA Goals Format

Every goal in the care plan follows the SMARTA framework required by the Support at Home Program:

- **S**pecific - Clear, detailed, in client's own words
- **M**easurable - Trackable progress indicators
- **A**chievable - Realistic based on client capacity
- **R**elevant - Aligns with client's interests and needs
- **T**ime-bound - Has a timeframe or review period
- **A**ction-oriented - Includes specific tasks/actions

Each goal includes:
- Goal statement (first-person narrative)
- Abilities and considerations (risks)
- How we'll achieve it (tasks)
- Who is responsible
- When it will be done
- **Service and cost**: Specific service from your organization at $X/hour ($Y/month)
- Service category (Clinical Care, Independence Support, or Everyday Living)

### Budget and Service Classifications

This section shows:
- **Services Required**: Only the services mentioned in the client's goals (not your entire service catalog)
- **Service Categories**: Classification of each service type
- **Quarterly Budget Allocation**: Budget planning information
- **Classification Level**: 1-8 under Support at Home

### Dignity of Risk Assessment

Acknowledges the client's right to make informed choices, even if they involve risk. Includes:
- Narrative explanation
- Table showing:
  - Risk identified
  - Client's choice/decision
  - Potential consequences
  - Mitigation strategies
  - Acknowledgement
  - Date

---

## Privacy & Compliance

### Australian Privacy Act 1988

SCRBL 2.0 is designed to comply with the Privacy Act 1988:
- Data is stored securely in Australian servers (AWS Sydney region for production)
- Access is restricted by organization (multi-tenant isolation)
- No data is shared between organizations
- Users can only access their organization's data
- Authentication required for all access

### Aged Care Quality Standards

Care plans are mapped to all 8 Quality Standards:
1. Consumer dignity and choice
2. Ongoing assessment and planning with consumers
3. Personal care and clinical care
4. Services and supports for daily living
5. Organisation's service environment
6. Feedback and complaints
7. Human resources
8. Organisational governance

### Support at Home Program (July 2025)

Care plans follow the new Support at Home format including:
- Classification levels 1-8
- Service categories (Clinical Care, Independence Support, Everyday Living)
- Single provider model
- SMARTA goal framework
- Quarterly budget allocation

---

## Troubleshooting

### Care Plan Generation is Slow

**Cause**: Long transcripts (30+ pages) take more time to process

**Solution**: 
- Wait patiently - transcripts over 80 pages can take 2-3 minutes
- Consider breaking very long transcripts into sections
- The system automatically summarizes extremely long transcripts

### Service Pricing Not Showing

**Cause**: No service rates configured in Admin panel

**Solution**:
1. Go to Admin > Service Pricing
2. Add all services your organization offers
3. Include hourly rates for each service
4. Regenerate the care plan

### Can't Access Saved Plans

**Cause**: Plans are organization-specific

**Solution**:
- Ensure you're logged in
- You can only see plans saved by users in your organization
- Check with your admin if you think you should have access

### Export Not Working

**Cause**: Browser popup blocker or insufficient permissions

**Solution**:
- Allow popups from the SCRBL 2.0 domain
- Try a different browser (Chrome, Firefox, Edge)
- Check that the care plan has content before exporting

### Login Failed (Production/Deployment)

**Cause**: Database environment variables not configured

**Solution**:
- Contact your system administrator
- Ensure production deployment has required environment variables:
  - Database credentials (AWS_RDS_* or DATABASE_URL)
  - Session secret (SESSION_SECRET)
  - OpenAI API key (OPENAI_API_KEY)
  - AWS S3 credentials for file storage

---

## Best Practices

### For Better Care Plans

1. **Detailed Transcripts**: Include specific medical conditions, medications, and dosages
2. **Client Voice**: Use direct quotes from the client about their goals and preferences
3. **Family Context**: Note family members' names and their involvement
4. **Specific Risks**: Detail any safety concerns, fall risks, or medical risks
5. **Clear Goals**: State what the client wants to achieve in specific terms

### For Organization Setup

1. **Configure Services First**: Set up all service pricing before generating care plans
2. **User Limits**: Set monthly plan limits to control usage and costs
3. **Regular Reviews**: Review and update service pricing quarterly
4. **Document Storage**: Encourage staff to attach relevant client documents to saved plans

### For Document Management

1. **Consistent Naming**: Use a clear naming convention (e.g., "ClientName - AssessmentType - Date")
2. **Upload Supporting Docs**: Attach medical reports, consent forms, and supporting documents
3. **Regular Cleanup**: Archive or delete outdated plans periodically

---

## Support & Contact

For technical issues, feature requests, or questions about SCRBL 2.0:
- Contact your organization administrator first
- For system administrators: Check the technical documentation and deployment guides
- For compliance questions: Refer to the Aged Care Quality Standards and Privacy Act documentation

---

**Version**: SCRBL 2.0  
**Last Updated**: November 2024  
**Compliance**: Privacy Act 1988, Aged Care Quality Standards 1-8, Support at Home Program
