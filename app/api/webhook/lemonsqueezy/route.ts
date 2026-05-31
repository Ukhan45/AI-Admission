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
  // Try exact email match first
  let snap = await adminDb.collection('users').where('email', '==', email).limit(1).get();
  // Fallback: lowercase
  if (snap.empty) {
    snap = await adminDb.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
  }
  if (snap.empty) {
    console.warn(`⚠️ No user found for email: ${email}`);
    return false;
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

    // Verify signature
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
    const email: string = attrs.user_email || attrs.customer_email || event?.meta?.custom_data?.email || '';
    const status: string = attrs.status ?? '';       // e.g. "active", "cancelled", "expired"
    const cancelled: boolean = attrs.cancelled ?? false;

    console.log(`🔔 Event: ${eventName} | Status: ${status} | Cancelled: ${cancelled} | Email: ${email}`);

    if (!email) {
      console.error('❌ No email found in payload');
      return new Response('No email', { status: 200 });
    }

    // ── UPGRADE TO PRO ──
    // order_created, subscription_created, subscription_resumed, or
    // subscription_updated where status is active and NOT cancelled
    const isUpgrade =
      eventName === 'order_created' ||
      eventName === 'subscription_created' ||
      eventName === 'subscription_resumed' ||
      eventName === 'subscription_unpaused' ||
      (eventName === 'subscription_updated' && status === 'active' && !cancelled);

    if (isUpgrade) {
      await findAndUpdateUser(email, {
        plan: 'pro',
        credits_limit: 999999,
        pro_since: new Date().toISOString(),
        cancelled_at: null,
      });
      console.log(`⚡ UPGRADED to Pro: ${email}`);
    }

    // ── DOWNGRADE TO FREE ──
    // subscription_cancelled event OR
    // subscription_updated where status is "cancelled" OR cancelled flag is true OR
    // subscription_expired / paused / order_refunded
    const isDowngrade =
      eventName === 'subscription_cancelled' ||
      eventName === 'subscription_expired' ||
      eventName === 'subscription_paused' ||
      eventName === 'order_refunded' ||
      (eventName === 'subscription_updated' && (status === 'cancelled' || status === 'expired' || cancelled === true));

    if (isDowngrade) {
      await findAndUpdateUser(email, {
        plan: 'free',
        credits_limit: 10,
        sop_used: 0,
        analyzer_used: 0,
        chat_used: 0,
        cancelled_at: new Date().toISOString(),
      });
      console.log(`⬇️ DOWNGRADED to Free: ${email}`);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('💥 Webhook error:', error);
    return new Response('Error', { status: 200 });
  }
}