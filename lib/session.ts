import { adminAuth } from "./firebase-admin";
import { NextRequest } from "next/server";

/**
 * Call this at the top of any API route that requires authentication.
 * Returns the decoded token (contains uid, email, etc.) or throws.
 *
 * Usage:
 *   const token = await verifySession(request);
 *   const uid = token.uid;
 */
export async function verifySession(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const idToken = authHeader.split("Bearer ")[1];
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded;
}

/**
 * Client-side helper: attach the current user's ID token to fetch requests.
 *
 * Usage:
 *   const res = await authedFetch("/api/some-route", { method: "POST", body: ... });
 */
export async function authedFetch(url: string, options: RequestInit = {}) {
  const { getAuth } = await import("firebase/auth");
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const token = await user.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}