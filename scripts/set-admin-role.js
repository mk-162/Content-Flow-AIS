/**
 * Script to set a user's role to SYSTEM_ADMIN
 *
 * Usage: node scripts/set-admin-role.js <user-email>
 * Example: node scripts/set-admin-role.js admin@example.com
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function setAdminRole(email) {
  try {
    console.log(`Looking up user with email: ${email}`);

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid}`);

    // Update Firestore document
    await db.collection('users').doc(userRecord.uid).set({
      globalRole: 'SYSTEM_ADMIN'
    }, { merge: true });

    console.log('✓ Successfully updated user role to SYSTEM_ADMIN');
    console.log(`User ${email} (${userRecord.uid}) is now a SYSTEM_ADMIN`);

    // Verify the update
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();
    console.log('\nVerified user data:', {
      email: userData.email,
      displayName: userData.displayName,
      globalRole: userData.globalRole
    });

  } catch (error) {
    console.error('Error setting admin role:', error);
    process.exit(1);
  }

  process.exit(0);
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/set-admin-role.js <user-email>');
  process.exit(1);
}

setAdminRole(email);
