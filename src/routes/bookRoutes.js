const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const bookController = require('../controllers/bookController');

// Cari buku dari internet via Open Library API
router.get('/search', authenticateToken, bookController.searchExternalBook);

// UPDATE PROGRESS: Mengubah posisi halaman membaca terakhir
router.put('/:bookId/progress', authenticateToken, bookController.updateReadingProgress);

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
    const { title, author, startPage, endPage } = req.body;

    if (!title || !author) {
        return res.status(400).json({ message: "Judul dan penulis wajib diisi!" });
    }

    try {
        const newBook = await prisma.book.create({
            data: {
                title,
                author,
                startPage: startPage || 0,
                endPage: endPage || 0,
                currentPage: startPage || 0, 
                status: startPage > 0 ? "reading" : "unread",
                userId: req.user.userId // Otomatis terisi dari ID user yang didekripsi oleh satpam
            }
        });
        res.status(201).json(newBook);
    } catch (error) {
        res.status(500).json({ error: "Gagal menyimpan buku baru" });
    }
});

// Menghapus buku tertentu berdasarkan ID (Dilindungi Satpam JWT)
router.delete('/:bookId', authenticateToken, async (req, res) => {
    const { bookId } = req.params;

    try {
        // Cari buku terlebih dahulu untuk memastikan kepemilikan data
        const book = await prisma.book.findUnique({
            where: { id: parseInt(bookId) }
        });

        // Validasi: Jika buku tidak ada atau bukan milik user yang login, tolak akses!
        if (!book || book.userId !== req.user.userId) {
            return res.status(404).json({ message: "Buku tidak ditemukan atau Anda tidak memiliki akses!" });
        }

        // Eksekusi penghapusan di PostgreSQL via Prisma
        await prisma.book.delete({
            where: { id: parseInt(bookId) }
        });

        res.json({ message: `Buku "${book.title}" berhasil dihapus dari library Anda!` });
    } catch (error) {
        res.status(500).json({ error: "Gagal menghapus data buku" });
    }
});

module.exports = router;


