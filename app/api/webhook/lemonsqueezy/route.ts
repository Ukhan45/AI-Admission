import { adminDb } from '@/lib/firebase-admin';
import { headers } from 'next/headers';
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function findAndUpdateUser(email: string, updates: Record<string, unknown>) {
  const snap = await adminDb.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) {
    // Also try case-insensitive by lowercasing
    const snapLower = await adminDb.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (snapLower.empty) {
      console.warn(`⚠️ No user found for email: ${email}`);
      return false;
    }
    await snapLower.docs[0].ref.update(updates);
    console.log(`✅ Updated user ${snapLower.docs[0].id}:`, updates);
    return true;
  }
  await snap.docs[0].ref.update(updates);
  console.log(`✅ Updated user ${snap.docs[0].id}:`, updates);
  return true;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headersList = await headers();
    const signature = headersList.get('x-signature') ?? '';
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? '';

    // ── Verify signature ──
    if (secret && signature) {
      const isValid = verifySignature(rawBody, signature, secret);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventName: string = event?.meta?.event_name ?? '';
    const attrs = event?.data?.attributes ?? {};

    // ── Extract email from all possible locations ──
    const email: string =
      attrs.user_email ||
      attrs.customer_email ||
      event?.meta?.custom_data?.email ||
      '';

    console.log(`🔔 Webhook: ${eventName} | email: ${email}`);

    if (!email) {
      console.error('❌ No email in payload. Keys:', Object.keys(attrs));
      return new Response('No email', { status: 200 });
    }

    // ══════════════════════════════════════════
    // UPGRADE TO PRO
    // ══════════════════════════════════════════
    const upgradeEvents = [
      'order_created',
      'subscription_created',
      'subscription_resumed',
      'subscription_unpaused',
    ];

    if (upgradeEvents.includes(eventName)) {
      const updated = await findAndUpdateUser(email, {
        plan: 'pro',
        credits_limit: 999999,
        pro_since: new Date().toISOString(),
        cancelled_at: null,
      });
      if (updated) console.log(`⚡ UPGRADED to Pro: ${email}`);
    }

    // ══════════════════════════════════════════
    // DOWNGRADE TO FREE
    // ══════════════════════════════════════════
    const downgradeEvents = [
      'subscription_cancelled',   // fired immediately when user cancels
      'subscription_expired',     // fired when billing period ends after cancel
      'subscription_paused',      // fired when paused
      'order_refunded',           // fired on refund
    ];

    if (downgradeEvents.includes(eventName)) {
      const updated = await findAndUpdateUser(email, {
        plan: 'free',
        credits_limit: 10,
        sop_used: 0,        // reset usage on downgrade
        analyzer_used: 0,
        chat_used: 0,
        cancelled_at: new Date().toISOString(),
      });
      if (updated) console.log(`⬇️ DOWNGRADED to Free: ${email}`);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('💥 Webhook error:', error);
    return new Response('Error', { status: 200 }); // 200 so LS doesn't retry
  }
}