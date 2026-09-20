require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./database');
const { sendOTP } = require('./email');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-development-only';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const otpCode = generateOTP();
        const otpExpiry = Date.now() + 10 * 60 * 1000;

        db.run(
            `INSERT INTO users (email, password, otp_code, otp_expiry, is_verified) VALUES (?, ?, ?, ?, ?)`,
            [email, hashedPassword, otpCode, otpExpiry, 0],
            async function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }

                try {
                    await sendOTP(email, otpCode);
                    res.json({ message: 'Account created. Check your email for verification.' });
                } catch (emailErr) {
                    res.status(500).json({ error: 'Failed to dispatch email' });
                }
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/verify', (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });
        if (user.is_verified) return res.status(400).json({ error: 'Already verified' });
        if (user.otp_code !== otp) return res.status(400).json({ error: 'Invalid OTP code' });
        if (Date.now() > user.otp_expiry) return res.status(400).json({ error: 'OTP has expired' });

        db.run(`UPDATE users SET is_verified = 1, otp_code = NULL, otp_expiry = NULL WHERE id = ?`, [user.id], function(err) {
            if (err) return res.status(500).json({ error: 'Database update failed' });
            res.json({ message: 'Email verified successfully.' });
        });
    });
});

app.post('/api/resend-otp', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
         return res.status(400).json({ error: 'Email is required' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });
        if (user.is_verified) return res.status(400).json({ error: 'Already verified' });

        const otpCode = generateOTP();
        const otpExpiry = Date.now() + 10 * 60 * 1000;

        db.run(`UPDATE users SET otp_code = ?, otp_expiry = ? WHERE id = ?`, [otpCode, otpExpiry, user.id], async function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            try {
                await sendOTP(email, otpCode);
                res.json({ message: 'New OTP dispatched to your email.' });
            } catch (emailErr) {
                res.status(500).json({ error: 'Failed to dispatch email' });
            }
        });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        if (!user.is_verified) {
            return res.status(403).json({ error: 'Email not verified', requiresVerification: true });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    });
});

app.get('/api/me', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        db.get(`SELECT id, email, is_verified FROM users WHERE id = ?`, [decoded.id], (err, user) => {
            if (err || !user) return res.status(401).json({ error: 'User not found' });
            res.json({ user });
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
