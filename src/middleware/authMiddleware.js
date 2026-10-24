const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
    // mengambil token dari header HTTP 'Authorization'
    const authHeader = req.header('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({message: "Akses ditolak! Token tidak ditemukan."});
    }

    // Pecah string dan ambil token asli di indeks ke-1 (setelah spasi)
    const token = authHeader.split(' ')[1];

    try {
        // verifikasi keaslian token
        const verified = jwt.verify(token, JWT_SECRET);
        
        req.user = verified;

        next();
    } catch (error) {
        console.log("Error Verifikasi JWT:", error.message);
        res.status(403).json({message: "Token tidak valid atau telah kedaluwarsa!"});
    }
};

module.exports = authenticateToken;
