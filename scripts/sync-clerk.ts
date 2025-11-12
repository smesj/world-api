#!/usr/bin/env ts-node

/**
 * Sync Clerk Users to Local Database
 *
 * This script manually syncs users from Clerk to your local development database.
 * Use this instead of webhooks during local development.
 *
 * Usage: npm run sync:clerk
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { clerkClient } from '@clerk/clerk-sdk-node';

// Load environment variables
config();

const prisma = new PrismaClient();

async function syncClerkUsers() {
  console.log('🔄 Starting Clerk user sync...\n');

  try {
    // Verify Clerk credentials are configured
    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error('CLERK_SECRET_KEY not found in environment variables');
    }

    console.log('📡 Fetching users from Clerk...');

    // Fetch all users from Clerk
    const clerkUsers = await clerkClient.users.getUserList({
      limit: 100, // Adjust if you have more than 100 test users
    });

    console.log(`✅ Found ${clerkUsers.length} users in Clerk\n`);

    if (clerkUsers.length === 0) {
      console.log('ℹ️  No users to sync. Create some test users in your Clerk dashboard first.');
      return;
    }

    let synced = 0;
    let updated = 0;
    let created = 0;

    // Sync each user to local database
    for (const clerkUser of clerkUsers) {
      const username = clerkUser.username;

      if (!username) {
        console.log(`⚠️  Skipping user ${clerkUser.id} - no username`);
        continue;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { id: clerkUser.id },
      });

      // Upsert user
      await prisma.user.upsert({
        where: { id: clerkUser.id },
        update: {
          username,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          lastSignInAt: clerkUser.lastSignInAt
            ? new Date(clerkUser.lastSignInAt)
            : null,
          updatedAt: new Date(),
        },
        create: {
          id: clerkUser.id,
          username,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          lastSignInAt: clerkUser.lastSignInAt
            ? new Date(clerkUser.lastSignInAt)
            : null,
        },
      });

      if (existingUser) {
        updated++;
        console.log(`♻️  Updated: ${username}`);
      } else {
        created++;
        console.log(`✨ Created: ${username}`);
      }

      synced++;
    }

    console.log('\n✅ Sync complete!');
    console.log(`   Total synced: ${synced}`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncClerkUsers();
