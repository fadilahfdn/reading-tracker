const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

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

module.exports = { register, login };
