const axios = require('axios');

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
            author: doc.author_name ? doc.author_name[0] : 'Unknown Author',
            isbn: doc.isbn ? doc.isbn[0] : null,
            first_publish_year: doc.first_publish_year || null
        }));

        res.json({
            message: "Pencarian berhasil!",
            results: books
        });
    } catch (error) {
        res.status(500).json({ error: "Gagal mengambil data dari Open Library API" });
    }
};

module.exports = { searchExternalBook };