const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// endpoint GET /health check
app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

// READ: Mengambil semua data buku langsung dari PostgreSQL
app.get('/books', async (req, res) => {
    try {
        const books = await prisma.book.findMany();
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: "Gagal mengambil data buku" });
    }
});

// CREATE: Menambahkan buku baru ke dalam PostgreSQL
app.post('/books', async (req, res) => {
    const { title, author, status } = req.body;

    if (!title || !author) {
        return res.status(400).json({ message: "Judul dan penulis wajib diisi!" });
    }

    try {
        const newBook = await prisma.book.create({
            data: {
                title,
                author,
                status: status || "unread"
            }
        });
        res.status(201).json(newBook);
    } catch (error) {
        res.status(500).json({ error: "Gagal menyimpan buku baru" });
    }
});

app.listen(PORT, () => {
    console.log(`[server]: Server berjalan di http://localhost:${PORT}`);
});
