
import nodemailer from "nodemailer";

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "****" : "NOT SET");

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendOTPEmail = async (to:string, otp:string) => {
    try {
        await transporter.sendMail({
            from: `"Mayramao App" <${process.env.EMAIL_USER}>`,
            to,
            subject:"Your OTP Code",
            html: `<h3>Your OTP is <b>${otp}</b></h3><p>It will expire in 10 minutes.</p>`,
        })
        console.log(`OTP sent to ${to}`);
    } catch (error) {
        console.error("Email sending failed:", error);
        // Don't throw - let registration proceed even if email fails
    }
}


