const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const bookController = require('../controllers/bookController');

// menerapkan perlindungan JWT ke semua endpoint
router.use(authenticateToken);

// Cari buku dari internet via Open Library API
router.get('/search', authenticateToken, bookController.searchExternalBook);

// UPDATE PROGRESS: Mengubah posisi halaman membaca terakhir
router.put('/:bookId/progress', authenticateToken, bookController.updateReadingProgress);

// Mengambil semua data buku HANYA milik user yang sedang login
router.get('/', bookController.getAllBooks);

// Menambahkan buku baru yang otomatis terikat dengan user yang login
router.post('/', bookController.addBook);

// Menghapus buku tertentu berdasarkan ID
router.delete('/:bookId', bookController.deleteBook);

module.exports = router;


