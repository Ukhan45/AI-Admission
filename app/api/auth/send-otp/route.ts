import { adminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP in Firestore
    await adminDb.collection('otps').doc(email).set({
      otp,
      expiresAt,
      createdAt: Date.now(),
    });

    // Send email
    await transporter.sendMail({
      from: `"AI Admission" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your AI Admission OTP Code',
      text: `Your 4-digit OTP Code is ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
          <h2 style="color: #1e293b; margin-bottom: 8px;">Verify your email</h2>
          <p style="color: #64748b; margin-bottom: 24px;">Enter this code to complete your AI Admission signup.</p>
          <div style="background: #fff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #2563eb;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">This code expires in <strong>5 minutes</strong>. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Send OTP error:', error);
    return Response.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 });
  }
}