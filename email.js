const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendOTP(to, otp) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("SMTP credentials not configured in .env");
    }

    try {
        await transporter.sendMail({
            from: `"Skovio" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: "Verification Code",
            text: `Your code is: ${otp}. Valid for 10 minutes.`,
            html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                <h2 style="color: #333; margin-bottom: 20px;">Verify your email</h2>
                <p style="color: #666; font-size: 16px;">Here is your verification code:</p>
                <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111;">${otp}</span>
                </div>
                <p style="color: #888; font-size: 14px;">This code will expire in 10 minutes.</p>
            </div>`
        });
        return true;
    } catch (err) {
        console.error('SMTP Error:', err);
        throw err;
    }
}

module.exports = { sendOTP };
