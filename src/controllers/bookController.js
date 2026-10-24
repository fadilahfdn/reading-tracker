const axios = require('axios');
const prisma = require('../config/db');

// fungsi untuk mencari buku dari Open Library API by query judul
const searchExternalBook = async (req, res) => {
    const { title } = req.query;

    if (!title) {
        return res.status(400).json({message: "Parameter query 'title' wajib diisi!" });
    }

    try {
        const response = await axios.get('https://openlibrary.org/search.json', {
            params: {
                q: title.trim(),
                limit: 5,
                fields: 'key,title,author_name,number_of_pages_median,cover_i'
            },
            timeout: 5000
        });

        const docs = response.data?.docs ?? [];

        const results = docs.map(doc => ({
            externalId: doc.key,
            title: doc.title || 'Untitled',
            author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : 'Unknown Author',
            totalPages: doc.number_of_pages_median ?? null,
            coverUrl: doc.cover_i
                ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                : null
        }));

        res.json({
            message: results.length ? 'Pencarian berhasil!' : 'Buku tidak ditemukan',
            results
        });
    } catch (error) {
        console.error('searchExternalBook error:', error.message);
        res.status(502).json({ message: 'Gagal mengambil data dari Open Library API' });
    }
};

// memperbarui progress halaman membaca
const updateReadingProgress = async (req, res) => {
    const bookIdParsed = parseInt(req.params.bookId, 10);
    const { currentPage } = req.body;

    if (currentPage === undefined || currentPage < 0) {
        return res.status(400).json({ message: "Halaman membaca saat ini wajib diisi dengan benar!" });
    }

    // Validasi jika konversi ID gagal / bukan angka
    if (isNaN(bookIdParsed)) {
        return res.status(400).json({ message: "ID Buku harus berupa angka yang valid!" });
    }

    try {
        // ambil data buku untuk memeriksa total halaman
        const book = await prisma.book.findUnique({
            where: { id: bookIdParsed }
        });

        // Validasi kepemilikan buku
        if (!book || book.userId !== req.user.userId) {
            return res.status(404).json({ message: "Buku tidak ditemukan atau Anda tidak memiliki akses!" });
        }

        if (currentPage > book.endPage) {
            return res.status(400).json({ message: `Halaman tidak boleh melebihi total halaman buku (${book.endPage} hal)!` });
        }

        let newStatus = "reading";
        if (currentPage === book.endPage && book.endPage > 0) {
            newStatus = "completed";
        } else if (currentPage === 0) {
            newStatus = "unread";
        }

        // Update data ke PostgreSQL
        const updatedBook = await prisma.book.update({
            where: { id: bookIdParsed },
            data: {
                currentPage: parseInt(currentPage, 10),
                status: newStatus
            }
        });

        return res.json({
            message: newStatus === "completed" ? "Selamat! Anda telah menyelesaikan buku ini!" : "Progress membaca berhasil diperbarui.",
            book: updatedBook
        });
    } catch (error) {
        res.status(500).json({ error: "Gagal memperbarui progress membaca" });
    }
};

module.exports = { searchExternalBook, updateReadingProgress };