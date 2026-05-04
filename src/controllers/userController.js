import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '../db/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

export const register = async (req, res) => {
  const { email, password, displayName } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await sql`
      INSERT INTO users (email, password_hash, display_name)
      VALUES (${email}, ${hashedPassword}, ${displayName})
      RETURNING id, email, display_name
    `;
    res.status(201).json({ success: true, user: result[0] });
  } catch (err) {
    res.status(400).json({ error: "Email already exists or invalid data" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (user.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user[0].password_hash);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user[0].id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { 
      displayName: user[0].display_name, 
      profileType: user[0].profile_type,
      isDarkTheme: user[0].is_dark_theme 
    }});
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
};