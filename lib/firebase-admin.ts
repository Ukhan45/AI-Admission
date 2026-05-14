import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App;

function getPrivateKey(): string {
  let key = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").trim();

  // Remove surrounding quotes if the env var was stored as a quoted string.
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Convert escaped newline sequences to actual newlines.
  key = key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");

  return key;
}

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Support both JSON string (recommended for production) and individual env vars
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // Replace escaped newlines in the private key
        privateKey: getPrivateKey(),
      }),
    });
  }

  return adminApp;
}

export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());