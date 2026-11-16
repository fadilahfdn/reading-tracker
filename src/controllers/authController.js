const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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

module.exports = { register, login, googleLogin };
