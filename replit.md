# Care Plan Generator Application

## Overview

This is a full-stack web application designed to assist care professionals in the Australian home care sector with generating comprehensive care plans. The application processes assessment transcripts between care partners and clients/families to create Gold Standard care plans that comply with:

- Aged Care Act (current)
- Support at Home Program (from July 2025)
- Aged Care Quality Standards (1-8)
- "Gold Standard" headings and format

The system uses AI to extract key facts from transcripts and generate properly formatted care plans in HTML format, following specific clinical documentation standards with first-person narrative style.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

The frontend follows a component-based architecture with reusable UI components. The main application consists of three primary panels: CarePlanForm (input), FactsPanel (AI-extracted information), and CarePlanPreview (generated output).

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for care plan generation
- **Processing Modes**: Dual-mode processing (AI-powered and offline fallback)
- **Data Storage**: In-memory storage with interface for future database integration

The backend implements a service-oriented architecture with separate services for OpenAI integration and offline care plan generation. The storage layer uses an interface pattern to allow easy switching between storage implementations.

### Data Storage Solutions
- **Production Database**: AWS RDS PostgreSQL in Sydney region (ap-southeast-2) for healthcare data compliance
- **Database Schema**: Drizzle ORM configured with the following tables:
  - **organizations**: Multi-tenant organization management
  - **users**: User accounts with email/password authentication, organization membership, and role-based access
  - **care_analyses**: Care plan transcripts and AI-generated analyses (organization-scoped)
  - **saved_care_plans**: Saved care plans with extracted facts and HTML (organization-scoped)
  - **client_documents**: Client file attachments stored in object storage (organization-scoped)
  - **client_folder_aliases**: Display name mappings for client folders (organization-scoped)
  - **sessions**: PostgreSQL-backed session storage for authentication

### Authentication and Authorization
- **Authentication System**: Multi-tenant Passport.js local strategy with bcrypt password hashing (10 rounds)
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA using otpauth and qrcode libraries
  - Works with standard authenticator apps (Google Authenticator, Microsoft Authenticator, Authy)
  - Session-based verification flow to prevent privilege escalation
  - 30-second TOTP window with 2-step tolerance for clock drift
  - Password confirmation required to disable 2FA
  - Database fields: `twoFactorSecret` (base32 encoded), `twoFactorEnabled` (string flag)
- **Session Management**: PostgreSQL-backed sessions with secure cookies
- **Authorization**: Role-based access control (super_admin/admin/user roles)
- **Data Isolation**: Complete organization-level data scoping enforced at storage layer
- **User Impersonation**: Super admins can impersonate any user for support purposes with full audit trail
- **Security Features**: Fail-closed middleware, structured JSON audit logging, session-based impersonation state

### Processing Architecture
- **AI Processing**: OpenAI GPT-5 integration for intelligent fact extraction and care plan generation
- **Offline Processing**: Rule-based keyword extraction and template-based care plan generation as fallback
- **Fact Extraction**: Structured data extraction including client details, medical information, support networks, risks, and preferences
- **Output Generation**: HTML-formatted care plans following specific clinical documentation standards

### Error Handling and Reliability
- **Graceful Degradation**: Offline mode available when AI services are unavailable
- **Error Boundaries**: Comprehensive error handling with user-friendly feedback
- **Validation**: Strong typing with Zod schemas for data validation
- **Logging**: Request/response logging for API endpoints

## External Dependencies

### AI Services
- **OpenAI API**: GPT-5 model for intelligent transcript analysis and care plan generation
- **Processing**: Natural language processing for extracting structured facts from unstructured assessment transcripts

### Database Integration
- **Neon Database**: Serverless PostgreSQL database (@neondatabase/serverless)
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect
- **Connection Pooling**: Built-in connection management for serverless environments

### UI Framework Dependencies
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Performant form handling with validation

### Development and Build Tools
- **Vite**: Fast build tool with hot module replacement
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Integration**: Development environment plugins for Replit compatibility

### Runtime Dependencies
- **Express.js**: Web application framework
- **CORS**: Cross-origin resource sharing configuration
- **Date-fns**: Date manipulation and formatting
- **Class Variance Authority**: Component variant management
- **CLSX**: Conditional className utility

The application is designed to be deployed on Replit with specific configuration for the development environment, including runtime error overlays and cartographer integration for enhanced debugging.

## Documentation

### User Guide Files

The application maintains two separate user guide files:

1. **USER_GUIDE_PUBLIC.md** (Public-facing)
   - Served via `/api/user-guide` endpoint
   - Displayed in Settings & Help page
   - User-focused documentation for care professionals and administrators
   - Contains: How to use the app, troubleshooting, admin features, compliance information
   - **Does NOT contain**: Technical implementation details, codebase information, API prompts, database schemas, or proprietary information

2. **USER_GUIDE.md** (Internal/Development)
   - Complete technical documentation (3,535 lines, 105KB)
   - For development team and AI agent training only
   - Contains: Detailed technical specifications, API references, database schemas, example prompts, codebase architecture
   - **NOT exposed** to end users or public-facing interfaces

This separation ensures that users get helpful documentation while protecting proprietary implementation details from being exposed.

## Recent Updates

### Two-Factor Authentication (November 2025)
- **Complete 2FA Implementation**: Added TOTP-based two-factor authentication using otpauth and qrcode libraries
  - Setup flow: QR code generation → scan with authenticator app → verify code → enable
  - Login flow: password authentication → session-based 2FA check → redirect to verification → complete login
  - Database schema: Added `twoFactorSecret` and `twoFactorEnabled` columns to users table
  - API endpoints: `/api/2fa/setup`, `/api/2fa/enable`, `/api/2fa/verify`, `/api/2fa/disable`
  - Security model: Session-based pendingUserId (no client-side storage), password required to disable
  - Settings UI: TwoFactorSettingsCard component with QR display, status badges, setup/disable flows
  - Verification page: Dedicated `/verify-2fa` route with 6-digit OTP input and auto-submit
- **Database Migration**: Created manual migration script (`scripts/apply-2fa-migration.ts`) to add 2FA columns
- **User Documentation**: Updated USER_GUIDE_PUBLIC.md with comprehensive 2FA setup and troubleshooting guide

### Pre-Deployment Cleanup (November 2025)
- **Code Audit**: Comprehensive pre-deployment security and code quality audit completed
  - Removed unused file: `server/replitAuth.ts` (170 lines of dead code for unused OAuth integration)
  - Verified all environment variables use proper security practices
  - Confirmed multi-tenant data isolation at database level
  - Validated no hardcoded secrets or test data in production paths
  - See `PRE_DEPLOYMENT_AUDIT.md` for complete audit report
- **Jotform AI Agent**: Added Jotform AI chat widget for user support
- **Word Export Formatting**: Updated to Calibri 10pt font with 0.3 inch margins for maximum content density

### Word Export Feature Unification (November 2025)
- **Shared Export Utility**: Created centralized Word export functionality in `client/src/lib/word-export.ts`
  - `escapeHtml()`: HTML escaping for XSS protection
  - `formatExtractedFactsForWord()`: Generates structured HTML tables for extracted facts
  - `exportToWord()`: Main export function with SCRBL branding
- **Extracted Facts in Word Export**: All Word exports now include a comprehensive extracted facts summary with:
  - Client details (name, language, interpreter requirements)
  - Medical information (GP, pharmacy, medications, allergies, equipment)
  - Support network (primary/secondary contacts, living arrangement)
  - Risk assessment (color-coded severity levels)
  - Preferences (worker, service delivery, cultural considerations)
- **API-Level Normalization**: extractedFacts from database (stored as JSONB) are normalized to parsed objects when loaded via API
- **Consistent Behavior**: Both new and saved care plans export identically with full extracted facts
- **Security**: All user-controlled fields HTML-escaped before Word export to prevent XSS vulnerabilities

## Deployment

### AWS RDS Migration
- **Migration Script**: `scripts/migrate-to-aws-rds.ts` handles data migration from development (Neon) to production (AWS RDS Sydney)
- **Schema Alignment**: Migration script updated (Oct 2025) to include all critical fields:
  - Organizations table (multi-tenant foundation)
  - Users table with password_hash, organization_id, role, and plan limiting fields
  - All data tables with organization_id for proper data isolation
- **Migration Process**: Export → Create Schema → Import → Verify
- **IMPORTANT**: Always test migration on staging data before production deployment