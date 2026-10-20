const axios = require('axios');
const prisma = require('../config/db');

// fungsi untuk mencari buku dari Open Library API by query judul
const searchExternalBook = async (req, res) => {
    const { title } = req.query;

    if (!title) {
        return res.status(400).json({message: "Parameter query 'title' wajib diisi!" });
    }

    try {
        // Menembak Open Library API dengan batasan hasil maksimal 5 buku
        const response = await axios.get(`https://openlibrary.org{encodeURIComponent(title)}&limit=5`);

        // mapping hasil response agar format datanya rapi dan bersih
        const books = response.data.docs.map(doc => ({
            title: doc.title,
            author: doc.author_name ? doc.author_name.join(', ') : 'Unknown Author',
            endPage: doc.number_of_pages_median || doc.number_of_pages || 0
        }));

        res.json({
            message: "Pencarian berhasil!",
            results: books
        });
    } catch (error) {
        res.status(500).json({ error: "Gagal mengambil data dari Open Library API" });
    }
};

// memperbarui progress halaman membaca
const updateReadingProgress = async (req, res) => {
    const { bookId } = req.params;
    const { currentPage } = req.body;

    if (currentPage === undefined || currentPage < 0) {
        return res.status(400).json({ meesage: "Halaman membaca saat ini wajib diisi dengan benar!" });
    }

    try {
        // ambil data buku untuk memeriksa total halaman
        const book = await prisma.book.findUnique({
            where: { id: parseInt(bookId) }
        });

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
        const updateBook = await prisma.book.update({
            where: { id: parseInt(bookId) },
            data: {
                currentPage: currentPage,
                status: newStatus
            }
        });

        res.json({
            message: newStatus === "completed" ? "Selamat! Anda telah menyelesaikan buku ini!" : "Progress membaca berhasil diperbarui.",
            book: updatedBook
        });
    } catch (error) {
        res.status(500).json({ error: "Gagal memperbarui progress membaca" });
    }
};

module.exports = { searchExternalBook, updateReadingProgress };