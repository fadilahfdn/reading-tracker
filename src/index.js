const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

// Menyambungkan seluruh rute autentikasi ke server utama
app.use('/auth', authRoutes);
app.use('/books', bookRoutes);

app.listen(PORT, () => {
    console.log(`[server]: Server berjalan rapi di http://localhost:${PORT}`);
});
