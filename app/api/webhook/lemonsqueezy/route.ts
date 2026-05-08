import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Handle subscription activated / order created → upgrade to pro
    if (
      eventName === 'subscription_created' ||
      eventName === 'subscription_resumed' ||
      eventName === 'order_created'
    ) {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'pro',
          credits_limit: 999999,
        })
        .eq('email', customerEmail);

      if (error) {
        console.error('Supabase update error:', error);
        return new Response('DB error', { status: 500 });
      }

      console.log(`✅ Upgraded ${customerEmail} to Pro`);
    }

    // Handle subscription cancelled / expired → revert to free
    if (
      eventName === 'subscription_cancelled' ||
      eventName === 'subscription_expired' ||
      eventName === 'subscription_paused'
    ) {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'free',
          credits_limit: 10,
        })
        .eq('email', customerEmail);

      if (error) {
        console.error('Supabase update error:', error);
        return new Response('DB error', { status: 500 });
      }

      console.log(`⬇️ Downgraded ${customerEmail} to Free`);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook failed', { status: 500 });
  }
}