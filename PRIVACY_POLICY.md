# SCRBL 2.0 Privacy & Security Policy

**Version**: 2.0  
**Last Updated**: November 2025  
**Effective Date**: November 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Information We Collect](#information-we-collect)
3. [How We Use Your Information](#how-we-use-your-information)
4. [Data Security](#data-security)
5. [Data Storage and Residency](#data-storage-and-residency)
6. [Data Sharing and Disclosure](#data-sharing-and-disclosure)
7. [Your Privacy Rights](#your-privacy-rights)
8. [Multi-Tenant Security](#multi-tenant-security)
9. [Data Retention](#data-retention)
10. [Compliance Framework](#compliance-framework)
11. [Contact Information](#contact-information)

---

## Introduction

SCRBL 2.0 ("we", "our", or "us") is committed to protecting the privacy and security of personal information and sensitive health data. This Privacy & Security Policy explains how we collect, use, store, and protect information in accordance with:

- **Privacy Act 1988** (Commonwealth of Australia)
- **Australian Privacy Principles (APPs)**
- **Aged Care Quality Standards**
- **My Health Records Act 2012**
- **Notifiable Data Breaches (NDB) scheme**

### Our Commitment

We understand that aged care providers handle highly sensitive client information. SCRBL 2.0 is designed with privacy and security at its core to ensure:

- Complete confidentiality of client health information
- Secure data storage within Australia
- Strict access controls and data isolation
- Full compliance with Australian privacy laws
- Transparent data handling practices

---

## Information We Collect

### User Account Information

When you register for SCRBL 2.0, we collect:

- **Personal Details**: First name, last name, email address
- **Organization Information**: Company name, organization identifier
- **Professional Details**: Phone number, professional credentials
- **Authentication Data**: Encrypted passwords (using bcrypt hashing)
- **Two-Factor Authentication Data**: Optional TOTP secrets (encrypted, base32 encoded) stored securely when 2FA is enabled
- **Session Data**: Login times, IP addresses for security monitoring

### Care Plan Data

When you use SCRBL to generate care plans, we collect:

- **Client Information**: Names, ages, addresses, contact details
- **Health Information**: Medical conditions, medications, allergies, equipment needs
- **Assessment Data**: Transcript notes from client assessments
- **Support Networks**: Family contacts, healthcare providers (GPs, pharmacies)
- **Care Preferences**: Service delivery preferences, cultural considerations
- **Risk Assessments**: Identified risks and safety concerns

### Client Documents

When you upload documents through the Document Manager:

- **File Metadata**: File names, upload dates, file sizes, file types
- **File Content**: PDFs, images, and other document types you upload
- **Organization Links**: Which client folders documents belong to

### Usage Information

We automatically collect:

- **System Logs**: API requests, error logs, performance metrics
- **Audit Trails**: User actions, document access, plan generation events
- **Analytics**: Feature usage, generation times, plan counts (aggregated and anonymized)

---

## How We Use Your Information

### Primary Purposes

We use your information to:

1. **Provide Core Services**
   - Generate AI-powered care plans from assessment transcripts
   - Store and retrieve saved care plans
   - Export care plans to Word format
   - Manage client documents and folders

2. **Ensure Quality and Compliance**
   - Verify care plans meet regulatory standards
   - Maintain audit trails for quality assurance
   - Support compliance with Aged Care Quality Standards

3. **Improve Services**
   - Analyze system performance and reliability
   - Identify and fix technical issues
   - Enhance AI accuracy and care plan quality

4. **Support Your Team**
   - Enable multi-user access within your organization
   - Provide user impersonation for technical support (admin only)
   - Facilitate collaboration on care planning

### AI Processing

Your assessment transcripts are processed by:

- **OpenAI GPT-4** (primary): For intelligent fact extraction and care plan generation
- **Offline Processing** (fallback): Rule-based processing when AI is unavailable

**Important**: When using OpenAI's API:
- Data is transmitted securely via HTTPS
- OpenAI does not use your data to train models (per our API agreement)
- Data is processed in accordance with OpenAI's data privacy commitments
- We recommend reviewing OpenAI's privacy policy at https://openai.com/privacy

---

## Data Security

### Technical Security Measures

SCRBL 2.0 implements industry-standard security practices:

#### Encryption
- **Data in Transit**: All data transmitted over HTTPS/TLS 1.3
- **Data at Rest**: Database encryption using PostgreSQL encryption
- **Password Storage**: Bcrypt hashing with 10 rounds (industry standard)
- **Session Security**: Encrypted session cookies with secure flags

#### Access Controls
- **Authentication**: Email/password authentication with secure session management
- **Two-Factor Authentication (2FA)**: Optional TOTP-based 2FA using standard authenticator apps (Google Authenticator, Microsoft Authenticator, Authy)
  - Session-based verification to prevent privilege escalation
  - 30-second time window with clock drift tolerance
  - Password required to disable 2FA
  - Secrets stored encrypted in database
- **Authorization**: Role-based access control (Super Admin, Admin, User)
- **Session Management**: Automatic session expiration, secure cookie settings

#### Database Security
- **Isolation**: Complete data separation between organizations
- **Backups**: Automated daily backups with point-in-time recovery
- **Audit Logging**: All database operations logged for compliance
- **Connection Security**: Encrypted database connections, connection pooling

#### Application Security
- **Input Validation**: All user inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Protection**: HTML escaping in all outputs
- **CSRF Protection**: Session-based CSRF tokens
- **Rate Limiting**: API request throttling to prevent abuse

### Organizational Security Measures

- **Access Policies**: Strict internal access controls and logging
- **Employee Training**: Regular security and privacy training for staff
- **Incident Response**: Documented procedures for security incidents
- **Vendor Management**: Security assessments of third-party services
- **Regular Audits**: Periodic security reviews and penetration testing

---

## Data Storage and Residency

### Australian Data Hosting

All SCRBL 2.0 data is stored exclusively in Australia:

- **Production Database**: AWS RDS PostgreSQL in Sydney (ap-southeast-2)
- **Object Storage**: AWS S3 in Sydney region (for document uploads)
- **Application Servers**: Hosted in Australian data centers
- **Backup Storage**: Redundant backups within Australian regions

### Why Australian Hosting Matters

Storing data in Australia ensures:
- Compliance with Australian Privacy Act requirements
- Protection under Australian data sovereignty laws
- Faster access and better performance for Australian users
- Subject to Australian legal jurisdiction only

### Data Transfers

- **AI Processing**: Assessment transcripts are sent to OpenAI's API (US-based) for processing
- **User Consent**: By using SCRBL, you consent to this limited international data transfer
- **Mitigation**: Only necessary data is sent; client identifiers are not included in AI requests
- **Alternatives**: Offline processing mode available if you prefer no external data transfer

---

## Data Sharing and Disclosure

### We Do Not Sell Your Data

SCRBL does not sell, rent, or trade your personal information or client data to third parties for marketing purposes.

### Limited Sharing

We only share data in these specific circumstances:

1. **Service Providers**
   - OpenAI (for AI-powered care plan generation)
   - AWS (for cloud hosting and infrastructure)
   - These providers are bound by strict confidentiality agreements

2. **Legal Requirements**
   - When required by Australian law or court order
   - To protect our legal rights or prevent harm
   - In response to lawful requests from regulatory authorities

3. **With Your Consent**
   - When you explicitly authorize data sharing
   - For specific support requests you initiate

4. **Business Transfers**
   - In the event of a merger, acquisition, or sale of assets
   - You will be notified and given options regarding your data

### Within Your Organization

- Data is shared among users within your organization
- All users in your organization can access care plans and documents created by your team
- Administrators can manage users and access organization-wide reports

---

## Your Privacy Rights

Under the Australian Privacy Act 1988, you have the following rights:

### Right to Access

You have the right to:
- Request access to your personal information
- Obtain copies of care plans and documents you've created
- Export all your organization's data

**How to Exercise**: Contact us at privacy@scrbl.com.au with your request

### Right to Correction

You have the right to:
- Request correction of inaccurate or incomplete information
- Update your profile information directly in Settings
- Modify or delete saved care plans

**How to Exercise**: Update via Settings page or contact support for assistance

### Right to Erasure

You have the right to:
- Request deletion of your personal information
- Request deletion of specific care plans or documents
- Close your account and remove all associated data

**How to Exercise**: Contact us at privacy@scrbl.com.au with your deletion request

**Note**: We may retain some information for legal compliance purposes (e.g., audit logs)

### Right to Object

You have the right to:
- Object to processing of your data for specific purposes
- Opt out of analytics and non-essential data collection
- Request human review of AI-generated care plans

**How to Exercise**: Contact us with your objection details

### Right to Data Portability

You have the right to:
- Export care plans in Word format
- Request your data in machine-readable format (JSON)
- Transfer your data to another service provider

**How to Exercise**: Use the export features in the app or contact support for bulk exports

### Response Times

We will respond to privacy rights requests within:
- **30 days** for standard requests
- **14 days** for urgent requests
- **60 days** for complex requests (with notification)

---

## Multi-Tenant Security

### Organization Isolation

SCRBL 2.0 uses a multi-tenant architecture with strict data isolation:

- **Database-Level Isolation**: All queries are scoped to your organization ID
- **Fail-Closed Security**: If organization context is missing, requests are denied
- **No Cross-Organization Access**: Users cannot access data from other organizations
- **Separate Storage**: Each organization's documents are stored in isolated folders

### User Roles and Permissions

#### User (Standard Role)
- Create and save care plans
- Upload and manage documents
- Export care plans to Word
- View organization's saved plans

#### Admin
- All User permissions, plus:
- Manage organization users (create, edit, delete)
- View organization statistics
- Access user management dashboard

#### Super Admin (SCRBL Staff Only)
- System-wide access for support purposes
- User impersonation capability (with full audit logging)
- Access to all organizations (for support only)
- Cannot be assigned to regular users

### Audit Logging

All sensitive operations are logged:
- User authentication and authorization events
- Care plan creation, modification, and deletion
- Document uploads and downloads
- User impersonation sessions (admin support)
- Failed access attempts

Logs include:
- Timestamp
- User ID and email
- Action performed
- IP address
- Organization ID
- Result (success/failure)

---

## Data Retention

### Active Data

While your account is active:
- **Care Plans**: Retained indefinitely until you delete them
- **Documents**: Retained until you delete them
- **User Profiles**: Retained while your account exists
- **Session Data**: Retained for 30 days after logout

### Deleted Data

When you delete data:
- **Soft Delete**: Data is marked as deleted but retained for 30 days
- **Hard Delete**: After 30 days, data is permanently removed
- **Backup Retention**: Deleted data may persist in backups for up to 90 days
- **Audit Logs**: Deletion events are logged permanently for compliance

### Account Closure

When you close your account:
- **Personal Data**: Deleted within 30 days
- **Care Plans**: Deleted within 30 days (unless required for legal compliance)
- **Audit Logs**: Retained for 7 years for compliance purposes
- **Anonymized Analytics**: May be retained indefinitely (no personal identifiers)

### Legal Holds

Data may be retained longer when:
- Required by law or regulation
- Subject to ongoing legal proceedings
- Necessary for dispute resolution
- Required for compliance audits

---

## Compliance Framework

### Australian Privacy Principles (APPs)

SCRBL 2.0 complies with all 13 APPs, including:

- **APP 1**: Open and transparent management of personal information
- **APP 5**: Notification of collection of personal information
- **APP 6**: Use or disclosure of personal information
- **APP 8**: Cross-border disclosure of personal information
- **APP 11**: Security of personal information
- **APP 12**: Access to personal information
- **APP 13**: Correction of personal information

### Aged Care Quality Standards

Our security and privacy practices support compliance with:

- **Standard 1**: Consumer dignity and choice
- **Standard 2**: Ongoing assessment and planning
- **Standard 3**: Personal care and clinical care
- **Standard 8**: Organizational governance (privacy and security)

### Notifiable Data Breaches (NDB)

In the event of a data breach, we will:

1. **Assess**: Determine if the breach is likely to result in serious harm
2. **Contain**: Take immediate steps to contain and remediate the breach
3. **Notify**: Within 72 hours, notify:
   - Affected individuals
   - Office of the Australian Information Commissioner (OAIC)
   - Aged Care Quality and Safety Commission (if applicable)
4. **Remediate**: Implement measures to prevent future breaches
5. **Document**: Maintain records of all breaches and responses

### Regular Compliance Reviews

We conduct:
- **Annual privacy audits** by external auditors
- **Quarterly security assessments** and penetration testing
- **Monthly access reviews** for privileged accounts
- **Continuous monitoring** of security logs and alerts

---

## Contact Information

### Privacy Officer

For privacy-related inquiries, complaints, or requests:

**Email**: privacy@scrbl.com.au  
**Response Time**: Within 5 business days

### Security Team

For security concerns or to report vulnerabilities:

**Email**: security@scrbl.com.au  
**Response Time**: Within 24 hours for critical issues

### General Support

For general questions or technical support:

**Email**: support@scrbl.com.au  
**Support Hours**: Monday-Friday, 9:00 AM - 5:00 PM AEST

### Regulatory Authorities

If you have concerns about our privacy practices, you may also contact:

**Office of the Australian Information Commissioner (OAIC)**  
Website: www.oaic.gov.au  
Phone: 1300 363 992  
Email: enquiries@oaic.gov.au

**Aged Care Quality and Safety Commission**  
Website: www.agedcarequality.gov.au  
Phone: 1800 951 822

---

## Updates to This Policy

We may update this Privacy & Security Policy from time to time to reflect:
- Changes in legal or regulatory requirements
- New features or services
- Enhanced security measures
- User feedback and best practices

### Notification of Changes

When we make material changes:
- We will update the "Last Updated" date at the top of this policy
- We will notify users via email and in-app notification
- We will provide a summary of significant changes
- For material changes, we may require renewed consent

### Your Continued Use

Your continued use of SCRBL after policy updates constitutes acceptance of the revised terms. If you do not agree with changes, please contact us to close your account.

---

## Acknowledgment

By using SCRBL 2.0, you acknowledge that you have read, understood, and agree to this Privacy & Security Policy.

**Last Updated**: November 2025  
**Version**: 2.0

---

*This policy is designed to be transparent and user-friendly. If you have questions or need clarification on any section, please contact our Privacy Officer at privacy@scrbl.com.au.*
