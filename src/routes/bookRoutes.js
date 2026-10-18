const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const bookController = require('../controllers/bookController');

// Cari buku dari internet via Open Library API
router.get('/search', authenticateToken, bookController.searchExternalBook);

// Mengambil semua data buku HANYA milik user yang sedang login
router.get('/', authenticateToken, async (req, res) => {
    try {
        const books = await prisma.book.findMany({
            where: { userId: req.user.userId } // filter otomatis by Id user
        });
        res.json(books);
    } catch (error) {
         res.status(500).json({ error: "Gagal mengambil data buku" });
    }
});

// Menambahkan buku baru yang otomatis terikat dengan user yang login
router.post('/', authenticateToken, async (req, res) => {
    const { title, author, status } = req.body;

    if (!title || !author) {
        return res.status(400).json({ message: "Judul dan penulis wajib diisi!" });
    }

    try {
        const newBook = await prisma.book.create({
            data: {
                title,
                author,
                status: status || "unread",
                userId: req.user.userId // Otomatis terisi dari ID user yang didekripsi oleh satpam
            }
        });
        res.status(201).json(newBook);
    } catch (error) {
        res.status(500).json({ error: "Gagal menyimpan buku baru" });
    }
});

module.exports = router;


