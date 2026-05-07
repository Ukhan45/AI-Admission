import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set.');
  }

  return new Stripe(key);
}

export async function POST() {
  try {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Premium SOP Generator',
            },
            unit_amount: 500, // $5
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:3000',
      cancel_url: 'http://localhost:3000',
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return new Response('Stripe configuration error', { status: 500 });
  }
}