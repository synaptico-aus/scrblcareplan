# SCRBL 2.0 Security & Compliance Documentation

**For Australian Home Care Providers**

**Version**: 2.0  
**Last Updated**: November 2025  
**Document Type**: Security & Compliance Overview

---

## Executive Summary

SCRBL 2.0 is a secure, compliant care plan generation platform designed specifically for Australian aged care providers. We understand that home care organizations handle sensitive personal and health information requiring the highest standards of data protection and regulatory compliance.

**Key Security Commitments:**
- 100% Australian data residency (AWS Sydney region)
- Full compliance with Privacy Act 1988
- Alignment with Aged Care Quality Standards 1-8
- Enterprise-grade security infrastructure
- Multi-tenant data isolation
- Industry-standard encryption and access controls

---

## 1. Australian Data Residency

### 1.1 Data Storage Location

**All data is stored exclusively in Australia:**
- **Production Database**: AWS RDS PostgreSQL in Sydney region (ap-southeast-2)
- **Development Database**: Neon PostgreSQL (Sydney data center)
- **Application Servers**: Hosted in Australian data centers
- **No offshore data transfers**: Your data never leaves Australian jurisdiction

### 1.2 Why This Matters

For Australian aged care providers, keeping data in Australia means:
- Full compliance with Privacy Act 1988 requirements
- Protection under Australian privacy laws
- No exposure to foreign government data access requests
- Faster access times and better performance for Australian users
- Alignment with Aged Care Quality Standard 8 (Organizational Governance)

### 1.3 Data Sovereignty Guarantee

**We guarantee:**
- No data replication to overseas servers
- No backup storage outside Australia
- No use of overseas AI services for processing Australian client data
- All processing occurs within Australian infrastructure

---

## 2. Privacy Act 1988 Compliance

### 2.1 Australian Privacy Principles (APPs)

SCRBL 2.0 is designed to comply with all 13 Australian Privacy Principles:

**APP 1 - Open and transparent management of personal information**
- Clear privacy policies and documentation
- Transparent data handling practices
- Security documentation available to clients

**APP 3 - Collection of solicited personal information**
- Only collect information necessary for care plan generation
- Clear purpose for all data collection
- Appropriate collection methods

**APP 5 - Notification of the collection of personal information**
- Users informed about data collection
- Clear notification of purposes
- Information about data handling practices

**APP 6 - Use or disclosure of personal information**
- Data used only for intended purposes
- No disclosure to third parties without consent
- Strict organizational data isolation

**APP 8 - Cross-border disclosure of personal information**
- **No cross-border transfers** - all data stays in Australia
- No overseas service providers with data access
- Complete Australian data sovereignty

**APP 11 - Security of personal information**
- Industry-standard encryption (TLS 1.3)
- Secure authentication and access controls
- Regular security updates and monitoring
- Protection against unauthorized access, modification, and disclosure

**APP 12 - Access to personal information**
- Users can access their own data
- Admins can manage organizational data
- Export capabilities for data portability

**APP 13 - Correction of personal information**
- Users can update their profiles
- Care plans can be edited and corrected
- Audit trails for data modifications

### 2.2 Health Information Handling

While SCRBL 2.0 processes health-related information in care plans:
- Data is de-identified where possible
- Information is encrypted both in transit and at rest
- Access is restricted to authorized personnel only
- Multi-tenant isolation ensures no cross-organization data access
- Role-based access control limits who can view sensitive information

---

## 3. Aged Care Quality Standards Compliance

### 3.1 Alignment with Quality Standards

SCRBL 2.0 supports compliance with all 8 Aged Care Quality Standards:

**Standard 1: Consumer dignity and choice**
- Care plans written in first-person narrative
- Focus on client goals and preferences
- Respect for cultural values and beliefs

**Standard 2: Ongoing assessment and planning with consumers**
- Structured assessment capture
- Regular review capabilities
- Client-centered planning tools

**Standard 3: Personal care and clinical care**
- Clinical care documentation
- Medical information tracking
- Risk assessment capabilities

**Standard 4: Services and supports for daily living**
- Service planning and budgeting
- Activity scheduling
- Support network documentation

**Standard 5: Organisation's service environment**
- Documented organizational structure
- Clear service provider information
- Professional accountability

**Standard 6: Feedback and complaints**
- Clear provider contact information
- Documentation of client preferences
- Communication preferences captured

**Standard 7: Human resources**
- User authentication and accountability
- Role-based access controls
- Audit trails for all actions

**Standard 8: Organisational governance**
- Secure data management
- Privacy protection
- Risk management
- Quality assurance processes

### 3.2 Support at Home Program Ready

SCRBL 2.0 is designed for the Support at Home Program (July 2025):
- Classification Level 1-8 support
- SMARTA goal formatting
- Budget and service breakdown
- Compliance with new program requirements

---

## 4. Security Infrastructure

### 4.1 Encryption

**Data in Transit:**
- TLS 1.3 encryption for all communications
- HTTPS enforced for all connections
- Secure API endpoints
- Encrypted database connections

**Data at Rest:**
- PostgreSQL database with encryption
- Encrypted password storage (bcrypt with 10 rounds)
- Secure session management
- Encrypted backup storage

### 4.2 Authentication & Access Control

**User Authentication:**
- Secure password-based authentication
- Minimum password requirements (8+ characters, uppercase, lowercase, numbers)
- Session-based authentication with secure cookies
- Automatic session expiration
- Profile completion requirements for care plan generation

**Role-Based Access Control (RBAC):**
- Three role levels: Super Admin, Admin, User
- Granular permissions per role
- Email domain filtering for admin user management
- Principle of least privilege

**Access Restrictions:**
- Admins can only manage users in their organization
- Email domain-based user visibility for admins
- Super admins have cross-organization visibility for support purposes
- User impersonation with full audit logging (super admin only)

### 4.3 Multi-Tenant Data Isolation

**Complete Organizational Separation:**
- Every organization has isolated data space
- Database-level organization scoping on all queries
- No cross-organization data access
- Separate service rate configurations per organization
- Independent user management per organization

**Technical Implementation:**
- All data tables include `organization_id` foreign key
- Storage layer enforces organization filtering
- Middleware validates organization access
- Fail-closed security model (deny by default)

### 4.4 Application Security

**Security Measures:**
- Input validation on all API endpoints
- SQL injection prevention (parameterized queries via Drizzle ORM)
- XSS protection through content sanitization
- CSRF protection on state-changing operations
- Rate limiting on API endpoints
- Secure session management
- Regular dependency updates

**Code Security:**
- Type-safe database operations (TypeScript + Drizzle ORM)
- Schema validation (Zod)
- Structured error handling
- Secure credential management (no secrets in code)

---

## 5. Data Protection & Privacy

### 5.1 Data Collection

**What We Collect:**
- User account information (name, email, phone, company)
- Care plan assessment transcripts
- Generated care plan content
- Client information entered by users
- Document uploads (assessments, reports)
- Usage metadata (login times, plan generation counts)

**What We Don't Collect:**
- Payment information (no billing system)
- Browsing history outside the application
- Location data
- Device information beyond standard web logs
- Social media data

### 5.2 Data Usage

**Your data is used exclusively for:**
- Generating care plans for your organization
- Providing the care planning service
- Improving AI-generated content quality
- System performance monitoring
- Support and troubleshooting

**Your data is NEVER:**
- Sold to third parties
- Shared across organizations
- Used for marketing purposes
- Transferred overseas
- Used to train public AI models

### 5.3 Data Retention

**Active Data:**
- Care plans: Retained indefinitely while organization is active
- User accounts: Active until deactivated by admin
- Assessment transcripts: Stored with care plans
- Client documents: Retained until deleted by user

**Deleted Data:**
- Soft deletion with recovery window (where applicable)
- Permanent deletion on request
- Backup retention policies follow industry standards

### 5.4 Data Backup & Disaster Recovery

**Backup Procedures:**
- Automated daily database backups
- Point-in-time recovery capability
- Encrypted backup storage in Australia
- Regular backup testing and validation

**Disaster Recovery:**
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 1 hour
- Documented disaster recovery procedures
- Regular DR testing and updates

**Business Continuity:**
- Redundant infrastructure
- Database connection pooling for reliability
- Graceful degradation (offline mode available)
- Status monitoring and alerting

---

## 6. AI Processing & Data Privacy

### 6.1 AI Service Provider

**OpenAI Integration:**
- Used for intelligent care plan generation
- GPT-4 model for transcript analysis
- API-based processing (data not used for model training)
- Secure API communication

### 6.2 AI Data Handling

**Important Clarifications:**
- AI processing does NOT send data outside Australia permanently
- Transcripts are sent to OpenAI API for processing only
- OpenAI's enterprise API does not use your data for training
- Processed results return to Australian servers
- No long-term storage of data by AI provider

**Alternative Processing:**
- Offline mode available (no AI processing)
- Rule-based care plan generation option
- Client can choose processing method
- Full functionality without AI if preferred

### 6.3 AI Security Measures

- Encrypted API communications
- No personally identifiable information in AI prompts where avoidable
- Structured data extraction minimizes sensitive data exposure
- API keys securely managed
- Regular security reviews of AI integrations

---

## 7. User Privacy & Consent

### 7.1 User Rights

**As a SCRBL 2.0 user, you have the right to:**
- Access all your organization's data
- Export care plans and documents
- Correct inaccurate information
- Delete care plans and documents
- Request account deactivation
- Understand how your data is used

### 7.2 Organizational Controls

**Organization administrators can:**
- Manage user accounts
- Control access permissions
- Set monthly plan generation limits
- Configure service rates
- Export organizational data
- Manage client documents and folders

### 7.3 Client Consent

**For care recipients:**
- Care plans should only be created with client consent
- Clients have the right to review their care plans
- Care plans can be exported and shared with clients
- Clients can request corrections to their information
- Organizations are responsible for obtaining proper consent

---

## 8. Compliance & Certifications

### 8.1 Current Compliance Status

**Compliant With:**
- Privacy Act 1988 (Australian Privacy Principles)
- Aged Care Quality Standards 1-8
- Support at Home Program requirements (2025)
- Australian data residency requirements

**Industry Best Practices:**
- OWASP security guidelines
- Secure software development lifecycle
- Regular security updates
- Vulnerability monitoring and patching

### 8.2 Security Auditing

**Internal Measures:**
- Regular code security reviews
- Dependency vulnerability scanning
- Access log monitoring
- Unusual activity detection

**Audit Trails:**
- User authentication events logged
- Care plan generation tracked
- User management actions logged
- Admin actions auditable
- Impersonation fully logged with audit trail

### 8.3 Third-Party Services

**Limited Dependencies:**
- AWS (database hosting - Sydney region)
- OpenAI (optional AI processing)
- Neon (development database - Australian servers)
- All services comply with data residency requirements

---

## 9. Incident Response

### 9.1 Security Incident Management

**In the event of a security incident:**
1. Immediate containment and assessment
2. Investigation and root cause analysis
3. Remediation and security enhancements
4. Notification of affected organizations (if applicable)
5. Post-incident review and improvements

### 9.2 Data Breach Notification

**Compliance with Notifiable Data Breaches (NDB) scheme:**
- Assessment within 30 days of awareness
- Notification to affected individuals if required
- Notification to OAIC (Office of the Australian Information Commissioner) if required
- Remediation steps communicated
- Prevention measures implemented

### 9.3 Support & Response Times

**Issue Response:**
- Security issues: Immediate response (24/7 monitoring)
- Data privacy concerns: Within 24 hours
- General support: Within 2 business days
- Feature requests: Reviewed monthly

---

## 10. Client Guarantees & Commitments

### 10.1 Data Security Commitments

**We guarantee:**
- 100% Australian data storage and processing
- Industry-standard encryption and security
- Multi-tenant data isolation
- No unauthorized data sharing
- Regular security updates and monitoring
- Transparent security practices

### 10.2 Privacy Commitments

**We promise:**
- Full Privacy Act 1988 compliance
- No selling of client data
- No cross-organization data sharing
- Clear and transparent privacy policies
- User control over data
- Right to data export and deletion

### 10.3 Service Commitments

**We commit to:**
- 99.5% uptime target
- Regular feature updates
- Security patch management
- Responsive support
- Clear communication
- Continuous improvement

### 10.4 Transparency

**We provide:**
- Clear security documentation (this document)
- Privacy policy and terms of service
- Regular security updates
- Incident notifications
- Open communication channels
- User guide and training resources

---

## 11. Getting Started Securely

### 11.1 Organization Setup

**Best Practices for New Organizations:**
1. **Use strong passwords**: Minimum 8 characters, mixed case, numbers
2. **Limit admin access**: Only assign admin role to trusted personnel
3. **Complete user profiles**: All required fields filled for accountability
4. **Review service rates**: Configure accurate pricing for your organization
5. **Train staff**: Ensure users understand privacy and security requirements

### 11.2 User Management

**Security Recommendations:**
1. **Regular access reviews**: Remove inactive users
2. **Role-based access**: Assign minimum necessary permissions
3. **Email domain filtering**: Admins only see users from their domain
4. **Monitor plan usage**: Track monthly generation limits
5. **Document procedures**: Internal policies for data handling

### 11.3 Data Management

**Operational Security:**
1. **Obtain client consent**: Before creating care plans
2. **Verify information**: Ensure accuracy of client data
3. **Secure exports**: Handle exported documents securely
4. **Regular backups**: Export important plans periodically
5. **Document retention**: Follow organizational policies

---

## 12. Contact & Support

### 12.1 Security Inquiries

For security-related questions or concerns:
- **Email**: [Your security contact email]
- **Response Time**: Within 24 hours
- **Escalation**: Direct to senior management

### 12.2 Privacy Questions

For privacy and data handling questions:
- **Email**: [Your privacy contact email]
- **Response Time**: Within 48 hours
- **Privacy Policy**: [Link to privacy policy]

### 12.3 Technical Support

For general support and assistance:
- **In-app help**: Settings & Help page
- **User guide**: Comprehensive documentation available
- **Email support**: [Your support email]
- **Response Time**: Within 2 business days

### 12.4 Emergency Contact

For urgent security incidents:
- **24/7 Emergency**: [Your emergency contact]
- **Incident Reporting**: [Your incident email]
- **Immediate Response**: Critical security issues addressed immediately

---

## 13. Regulatory References

### 13.1 Australian Legislation

**Privacy Act 1988**
- Governs handling of personal information
- Includes Australian Privacy Principles (APPs)
- Requires compliance with privacy standards
- [Link: OAIC Privacy Act](https://www.oaic.gov.au/privacy/privacy-legislation/the-privacy-act)

**Notifiable Data Breaches (NDB) Scheme**
- Part of Privacy Act 1988
- Requires notification of eligible data breaches
- Assessment and notification timeframes
- [Link: OAIC NDB Scheme](https://www.oaic.gov.au/privacy/notifiable-data-breaches)

**Aged Care Act 1997**
- Governs aged care service provision
- Requires compliance with Quality Standards
- Regulates care planning and documentation
- [Link: Aged Care Quality and Safety Commission](https://www.agedcarequality.gov.au/)

### 13.2 Aged Care Quality Standards

**Quality Standards 1-8**
- Consumer dignity and choice
- Ongoing assessment and planning
- Personal and clinical care
- Services and supports for daily living
- Service environment
- Feedback and complaints
- Human resources
- Organisational governance

**Support at Home Program (July 2025)**
- New funding model for home care
- Classification levels 1-8
- Enhanced reporting requirements
- Client-centered planning emphasis

---

## 14. Document Version Control

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Nov 2024 | Initial security documentation | SCRBL Team |
| 2.0 | Nov 2025 | Updated for Support at Home Program, added email domain filtering, enhanced multi-tenant documentation | SCRBL Team |

---

## Appendix A: Technical Security Specifications

### Database Security
- **Platform**: PostgreSQL 15+
- **Hosting**: AWS RDS (Sydney, ap-southeast-2)
- **Encryption**: AES-256 encryption at rest
- **Backups**: Automated daily with 30-day retention
- **Access**: VPC-isolated, no public access
- **Connection**: Encrypted SSL/TLS connections only

### Application Security
- **Runtime**: Node.js (LTS version)
- **Framework**: Express.js with security middleware
- **ORM**: Drizzle ORM (SQL injection prevention)
- **Validation**: Zod schema validation
- **Authentication**: Passport.js with bcrypt
- **Session**: PostgreSQL-backed sessions (connect-pg-simple)

### Network Security
- **Protocol**: HTTPS only (TLS 1.3)
- **Firewall**: Application-level firewall
- **Rate Limiting**: Express rate limiter
- **CORS**: Configured for same-origin only
- **Headers**: Security headers (HSTS, CSP)

### Monitoring & Logging
- **Application logs**: Structured JSON logging
- **Access logs**: Request/response logging
- **Error tracking**: Centralized error monitoring
- **Audit logs**: User actions and admin operations
- **Alerts**: Automated security incident alerts

---

## Appendix B: Data Flow Diagram

```
User Browser (Australia)
    ↓ (HTTPS/TLS 1.3)
Application Server (Australia)
    ↓ (Encrypted Connection)
PostgreSQL Database (AWS Sydney)
    ↓ (Optional, API call)
OpenAI API (Processing only)
    ↓ (Results return)
PostgreSQL Database (AWS Sydney)
    ↓ (Encrypted Connection)
Application Server (Australia)
    ↓ (HTTPS/TLS 1.3)
User Browser (Australia)
```

**Key Points:**
- All permanent data storage in Australia
- No data replication outside Australia
- AI processing is stateless (no data retention by OpenAI)
- End-to-end encryption

---

## Appendix C: Glossary

**APPs (Australian Privacy Principles)**: 13 principles in Privacy Act 1988 governing personal information handling

**AWS RDS**: Amazon Web Services Relational Database Service

**Bcrypt**: Cryptographic hash function for password storage

**Multi-tenant**: Architecture where multiple organizations share infrastructure but data is isolated

**NDB (Notifiable Data Breaches)**: Scheme requiring notification of serious data breaches

**OAIC**: Office of the Australian Information Commissioner

**RBAC (Role-Based Access Control)**: Security approach restricting access based on user roles

**TLS (Transport Layer Security)**: Cryptographic protocol for secure communications

**Data Residency**: Requirement that data be stored in specific geographic location

**SMARTA Goals**: Specific, Measurable, Achievable, Relevant, Time-bound, Action-oriented

---

**END OF DOCUMENT**

*This security documentation is provided for informational purposes and represents SCRBL 2.0's current security posture as of November 2025. Security measures are continuously reviewed and enhanced. For the most current information, please contact our security team.*

*© 2025 SCRBL 2.0. All rights reserved.*
