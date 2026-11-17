const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://client-reading-tracker.vercel.app';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// konfigurasi pengirim email via SMTP Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const register = async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ message: "Email, username, dan password wajib diisi!" });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await prisma.user.create({
            data: { email, username, password: hashedPassword }
        });

        res.status(201).json({
            message: "User berhasil didaftarkan!",
            user: { id: newUser.id, email: newUser.email, username: newUser.username }
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "Email atau username sudah digunakan!" });
        }
        res.status(500).json({ error: "Gagal mendaftarkan user baru" });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username dan password wajib diisi!" });
    }

    try {
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Username atau password salah!" });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ message: "Login berhasil!", token });
    } catch (error) {
        res.status(500).json({ error: "Terjadi kesalahan pada sistem server" });
    }
};

const googleLogin = async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ message: "Token Google tidak ditemukan!" });
    }

    try {
        // Verifikasi tanda tangan kriptografis token ke server Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email } = payload;

        if (!email) {
            return res.status(400).json({ message: "Email tidak tersedia dari akun Google!" });
        }

        // Cek apakah email sudah pernah terdaftar di database
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Buat username unik otomatis untuk pengguna Google baru
            const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'user';
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const generatedUsername = `${baseUsername}_${randomSuffix}`;

            user = await prisma.user.create({
                data: {
                    email,
                    username: generatedUsername,
                    googleId
                }
            });
        } else if (!user.googleId) {
            // Account Linking: tautkan akun lama yang memakai email sama
            user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId }
            });
        }

        // Terbitkan JWT lokal yang identik dengan login biasa
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        return res.json({ message: "Login Google berhasil!", token });
    } catch (error) {
        console.error("Google OAuth Error:", error);
        return res.status(401).json({ message: "Verifikasi akun Google gagal!" });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Alamat email wajib diisi!"});
    }

    const genericSuccessMessage = "Jika email terdaftar di sistem kami, tautan reset password telah dikirim ke kotak masuk Anda.";

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        // Tetap kembalikan respons sukses agar tidak membocorkan email terdaftar (anti email enumeration)
        if (!user) {
            return res.json({ message: genericSuccessMessage });
        }

        // Buat token acak 32-byte untuk dikirim ke email pengguna
        const rawToken = crypto.randomBytes(32).toString('hex');

        // Hash token dengan SHA-256 sebelum disimpan ke database
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // Berlaku 15 menit

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: hashedToken,
                resetTokenExpires
            }
        });

        const resetUrl = `${FRONTEND_URL}/reset-password/${rawToken}`;

        try {
            await transporter.sendMail({
                from: `"My Reading Tracker" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: "Reset Password Akun Reading Tracker",
                html: `
                    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e0; border-radius: 12px; color: #2e2e32;">
                        <h2 style="margin-top: 0; color: #111113;">Permintaan Reset Password</h2>
                        <p>Halo <strong>${user.username}</strong>,</p>
                        <p>Kami menerima permintaan untuk mengatur ulang password akun Reading Tracker Anda. Klik tombol di bawah ini untuk membuat password baru:</p>
                        <div style="margin: 24px 0; text-align: center;">
                            <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        <p style="font-size: 13px; color: #6b6b73;">Tautan ini hanya berlaku selama <strong>15 menit</strong>. Jika Anda tidak merasa meminta reset password, abaikan saja email ini.</p>
                    </div>
                `
            });
        } catch (mailError) {
            // Bersihkan token jika email gagal terkirim
            await prisma.user.update({
                where: { id: user.id },
                data: { resetToken: null, resetTokenExpires: null }
            });
            console.error("Gagal mengirim email reset password:", mailError);
            return res.status(500).json({ message: "Gagal mengirim email reset password. Coba lagi nanti." });
        }

        return res.json({ message: genericSuccessMessage });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        return res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};

const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ message: "Password baru minimal harus terdiri dari 6 karakter!" });
    }

    try {
        // Hash token dari URL untuk dicocokkan dengan hash yang tersimpan di database
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                resetToken: hashedToken,
                resetTokenExpires: {
                    gt: new Date() // Pastikan waktu kedaluwarsa masih lebih besar dari waktu sekarang
                }
            }
        });

        if (!user) {
            return res.status(400).json({ message: "Tautan reset password tidak valid atau sudah kedaluwarsa." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpires: null
            }
        });

        return res.json({ message: "Password berhasil diperbarui! Silakan login dengan password baru Anda." });
    } catch (error) {
        console.error("Reset Password Error:", error);
        return res.status(500).json({ message: "Gagal mengatur ulang password." });
    }
};

module.exports = { register, login, googleLogin, forgotPassword, resetPassword };
