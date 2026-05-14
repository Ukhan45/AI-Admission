import { adminDb } from '@/lib/firebase-admin';
import { headers } from 'next/headers';
import crypto from 'crypto';

// Verify webhook signature from Lemon Squeezy
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headersList = await headers();
    const signature = headersList.get('x-signature') ?? '';
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? '';

    // Verify signature if secret is set
    if (secret && signature) {
      const isValid = verifySignature(rawBody, signature, secret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventName = event?.meta?.event_name;
    const customerEmail = event?.data?.attributes?.user_email;

    console.log('Lemon Squeezy webhook:', eventName, customerEmail);

    if (!customerEmail) {
      return new Response('No email found', { status: 400 });
    }

    // Query Firebase for user by email
    const userSnapshot = await adminDb.collection('users')
      .where('email', '==', customerEmail)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      console.warn(`User not found for email: ${customerEmail}`);
      return new Response('User not found', { status: 404 });
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    // Handle subscription activated / order created → upgrade to pro
    if (
      eventName === 'subscription_created' ||
      eventName === 'subscription_resumed' ||
      eventName === 'order_created'
    ) {
      await adminDb.collection('users').doc(userId).update({
        plan: 'pro',
        credits_limit: 999999,
      });

      console.log(`✅ Upgraded ${customerEmail} to Pro`);
    }

    // Handle subscription cancelled / expired → revert to free
    if (
      eventName === 'subscription_cancelled' ||
      eventName === 'subscription_expired' ||
      eventName === 'subscription_paused'
    ) {
      await adminDb.collection('users').doc(userId).update({
        plan: 'free',
        credits_limit: 10,
      });

      console.log(`⬇️ Downgraded ${customerEmail} to Free`);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook failed', { status: 500 });
  }
}