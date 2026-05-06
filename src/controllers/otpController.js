import bcrypt from 'bcryptjs';
import { sql } from '../db/db.js';
import { sendOTPEmail } from '../services/emailService.js';

export const requestOTP = async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 Mins

  try {
    // 1. Check for spamming: Has this email requested an OTP in the last 5 minutes?
    const existing = await sql`
      SELECT created_at FROM otp_verifications 
      WHERE email = ${email} AND created_at > NOW() - INTERVAL '5 minutes'
    `;

    if (existing.length > 0) {
      return res.status(429).json({ 
        error: "RATE_LIMIT_EXCEEDED", 
        message: "Please wait 5 minutes before requesting a new code." 
      });
    }

    // 2. Hash and Save
    const otpHash = await bcrypt.hash(otp, 10);
    await sql`DELETE FROM otp_verifications WHERE email = ${email}`; // Clean old ones
    await sql`INSERT INTO otp_verifications (email, otp_hash, expires_at) VALUES (${email}, ${otpHash}, ${expiresAt})`;

    // 3. Send Email
    await sendOTPEmail(email, otp);
    res.status(200).json({ success: true, message: "Verification code sent." });

  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const record = await sql`
      SELECT * FROM otp_verifications WHERE email = ${email} AND expires_at > NOW()
    `;

    if (record.length === 0) {
      return res.status(400).json({ error: "OTP_EXPIRED", message: "Code has expired or does not exist." });
    }

    const isValid = await bcrypt.compare(otp, record[0].otp_hash);
    if (!isValid) {
      return res.status(401).json({ error: "INVALID_OTP", message: "The code you entered is incorrect." });
    }

    // Success: Delete so it can't be used twice
    await sql`DELETE FROM otp_verifications WHERE email = ${email}`;
    res.status(200).json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};