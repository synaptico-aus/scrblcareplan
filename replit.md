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
- **Session Management**: PostgreSQL-backed sessions with secure cookies
- **Authorization**: Role-based access control (admin/user roles)
- **Data Isolation**: Complete organization-level data scoping enforced at storage layer
- **Password Protection**: Removed from saved plans route - now relies on authentication system

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