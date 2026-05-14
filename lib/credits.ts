import { adminDb } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function getUserCredits(userId: string): Promise<number> {
  const userRef = adminDb.collection("users").doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) return 0;
  return snap.data()?.credits ?? 0;
}

export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const userRef = adminDb.collection("users").doc(userId);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new Error("User not found");

      const current = snap.data()?.credits ?? 0;
      if (current < amount) throw new Error("Insufficient credits");

      tx.update(userRef, { credits: FieldValue.increment(-amount) });
    });
    return true;
  } catch {
    return false;
  }
}

export async function addCredits(userId: string, amount: number): Promise<void> {
  const userRef = adminDb.collection("users").doc(userId);
  await userRef.set(
    { credits: FieldValue.increment(amount) },
    { merge: true }
  );
}