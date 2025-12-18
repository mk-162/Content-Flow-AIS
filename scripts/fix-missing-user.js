/**
 * Fix Missing User Document
 *
 * Run this script to create a Firestore document for a user that exists
 * in Firebase Auth but is missing from Firestore.
 *
 * Usage:
 *   1. Go to Firebase Console → Authentication → Users
 *   2. Find the user and copy their UID
 *   3. Update the USER_TO_FIX object below
 *   4. Run: node scripts/fix-missing-user.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (make sure you have serviceAccountKey.json)
// Download from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ============================================
// UPDATE THIS WITH THE MISSING USER'S DETAILS
// ============================================
const USER_TO_FIX = {
  // Get this UID from Firebase Console → Authentication → Users
  uid: 'PASTE_USER_UID_HERE',

  // User details
  email: 'david@electric-azimuth.co.uk',
  displayName: 'David',
  globalRole: 'USER', // Options: 'USER', 'ORG_OWNER', 'SYSTEM_ADMIN'
};

// Optional: Assign to an organization
const ASSIGN_TO_ORG = {
  enabled: false,
  organizationId: '', // e.g., 'org_1234567890_abc123'
  role: 'MEMBER', // Options: 'MEMBER', 'ADMIN', 'OWNER'
};
// ============================================

async function fixMissingUser() {
  try {
    console.log('Checking if user document already exists...');

    const userRef = db.collection('users').doc(USER_TO_FIX.uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      console.log('User document already exists!');
      console.log('Current data:', userDoc.data());
      return;
    }

    console.log('Creating user document...');

    const now = admin.firestore.Timestamp.now();

    await userRef.set({
      email: USER_TO_FIX.email,
      displayName: USER_TO_FIX.displayName,
      globalRole: USER_TO_FIX.globalRole,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    console.log('✅ User document created successfully!');

    // Add org membership if configured
    if (ASSIGN_TO_ORG.enabled && ASSIGN_TO_ORG.organizationId) {
      console.log('Adding organization membership...');

      const membershipId = `${ASSIGN_TO_ORG.organizationId}_${USER_TO_FIX.uid}`;
      await db.collection('organizationMembers').doc(membershipId).set({
        organizationId: ASSIGN_TO_ORG.organizationId,
        userId: USER_TO_FIX.uid,
        role: ASSIGN_TO_ORG.role,
        invitedBy: 'admin-fix-script',
        invitedAt: now,
        joinedAt: now,
      });

      console.log('✅ Organization membership added!');
    }

    console.log('\nUser should now appear in Admin → Users');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixMissingUser();
