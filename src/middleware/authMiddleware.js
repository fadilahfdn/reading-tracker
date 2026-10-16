const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

const authenticateToken = (req, res, next) => {
    // mengambil token dari header HTTP 'Authorization'
    const authHeader = req.header['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // format: "Bearer <TOKEN>"

    if (!token) {
        return res.status(401).json({message: "Akses ditolak! Token tidak ditemukan."});
    }

    try {
        // verifikasi keaslian token
        req.user = verified;

        next();
    } catch (error) {
        res.status(403).json({message: "Token tidak valid atau telah kedaluwarsa!"});
    }
};

module.exports = authenticateToken;
