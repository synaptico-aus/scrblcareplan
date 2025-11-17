/**
 * Check User Profile Script
 * 
 * This script checks if a user's profile data exists in the database.
 */

import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkUserProfile() {
  try {
    const email = process.argv[2] || 'carl@salveocare.com.au';
    
    console.log(`Checking profile for: ${email}`);
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('\n✅ User found:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  First Name: ${user.firstName || '(empty)'}`);
    console.log(`  Last Name: ${user.lastName || '(empty)'}`);
    console.log(`  Company: ${user.company || '(empty)'}`);
    console.log(`  Phone Number: ${user.phoneNumber || '(empty)'}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Organization ID: ${user.organizationId}`);
    
    const isComplete = !!(
      user.firstName &&
      user.lastName &&
      user.email &&
      user.company &&
      user.phoneNumber
    );
    
    console.log(`\n  Profile Complete: ${isComplete ? '✅ YES' : '❌ NO'}`);
    
    if (!isComplete) {
      const missing = [];
      if (!user.firstName) missing.push('First Name');
      if (!user.lastName) missing.push('Last Name');
      if (!user.email) missing.push('Email');
      if (!user.company) missing.push('Company');
      if (!user.phoneNumber) missing.push('Phone Number');
      console.log(`  Missing fields: ${missing.join(', ')}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking user profile:', error);
    process.exit(1);
  }
}

checkUserProfile();
