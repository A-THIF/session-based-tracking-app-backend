import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (email, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Trace <onboarding@resend.dev>', // Note: Use your domain later if you verify one
      to: [email],
      subject: 'Verify your Trace Account',
      html: `
        <div style="font-family: sans-serif; background-color: #0d1b2a; padding: 40px; color: #fff; border-radius: 10px;">
          <h2 style="color: #00e676;">Verify your Email</h2>
          <p style="color: #7a9bc0;">Enter this code in the Trace app to verify your account. It will expire in 5 minutes.</p>
          <div style="background: #1e3a5f; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 10px; text-align: center; border-radius: 8px; color: #fff; margin: 20px 0;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #555;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("📧 Resend Failure:", err.message);
    throw new Error("SMTP_ERROR");
  }
};