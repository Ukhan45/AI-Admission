import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return Response.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const otpDoc = await adminDb.collection('otps').doc(email).get();

    if (!otpDoc.exists) {
      return Response.json({ error: 'OTP not found. Please request a new one.' }, { status: 400 });
    }

    const data = otpDoc.data()!;

    // Check expiry
    if (Date.now() > data.expiresAt) {
      await adminDb.collection('otps').doc(email).delete();
      return Response.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Check OTP match
    if (data.otp !== otp) {
      return Response.json({ error: 'Incorrect OTP. Please try again.' }, { status: 400 });
    }

    // OTP is valid — delete it so it can't be reused
    await adminDb.collection('otps').doc(email).delete();

    return Response.json({ success: true });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return Response.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}