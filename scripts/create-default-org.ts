/**
 * Default Organization Setup Script
 * 
 * ⚠️ DEVELOPMENT/DEPLOYMENT TOOL ONLY ⚠️
 * 
 * This script creates the default organization and admin user for initial setup.
 * It should NOT be included in production builds or deployed to production servers.
 * 
 * Purpose:
 * - Create default "Salveo HomeCare" organization
 * - Create admin user (carl@salveocare.com.au)
 * - Migrate existing data to the default organization
 * 
 * Usage:
 * ADMIN_PASSWORD=your-secure-password tsx scripts/create-default-org.ts
 * 
 * Security Notice:
 * - Contains hardcoded email addresses and organization names
 * - Requires ADMIN_PASSWORD environment variable (never commit passwords)
 * - Only use for initial database setup or development environments
 * - For production, use the signup flow to create organizations
 */

import bcrypt from 'bcrypt';
import { db } from '../server/db.js';
import { organizations, users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function createDefaultOrganization() {
  try {
    if (!process.env.ADMIN_PASSWORD) {
      throw new Error('ADMIN_PASSWORD environment variable is required. Usage: ADMIN_PASSWORD=your-secure-password tsx scripts/create-default-org.ts');
    }

    // Check if Salveo HomeCare organization already exists
    const existing = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, 'Salveo HomeCare'))
      .limit(1);

    let orgId: string;

    if (existing.length > 0) {
      orgId = existing[0].id;
      console.log('Salveo HomeCare organization already exists:', orgId);
    } else {
      // Create Salveo HomeCare organization
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: 'Salveo HomeCare',
        })
        .returning();
      
      orgId = newOrg.id;
      console.log('Created Salveo HomeCare organization:', orgId);
    }

    // Check if admin user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'carl@salveocare.com.au'))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('Admin user already exists:', existingUser[0].email);
    } else {
      // Hash the password from environment variable
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

      // Create admin user
      const [newUser] = await db
        .insert(users)
        .values({
          email: 'carl@salveocare.com.au',
          passwordHash,
          firstName: 'Carl',
          lastName: 'Admin',
          organizationId: orgId,
          role: 'admin',
        })
        .returning();

      console.log('Created admin user:', newUser.email);
    }

    // Update all existing data to belong to Salveo HomeCare
    const updates = await Promise.all([
      db.execute(`UPDATE care_analyses SET organization_id = '${orgId}' WHERE organization_id IS NULL`),
      db.execute(`UPDATE saved_care_plans SET organization_id = '${orgId}' WHERE organization_id IS NULL`),
      db.execute(`UPDATE client_documents SET organization_id = '${orgId}' WHERE organization_id IS NULL`),
      db.execute(`UPDATE client_folder_aliases SET organization_id = '${orgId}' WHERE organization_id IS NULL`),
    ]);

    console.log('Migrated existing data to Salveo HomeCare organization');
    console.log('Setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating default organization:', error);
    process.exit(1);
  }
}

createDefaultOrganization();
