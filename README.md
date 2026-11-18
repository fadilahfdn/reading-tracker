# Reading Tracker - REST API Backend

Layanan *backend* RESTful API untuk aplikasi **Reading Tracker** yang menangani autentikasi pengguna, integrasi Google OAuth, pemulihan kata sandi berbasis token kriptografis, serta pengelolaan data koleksi buku pada PostgreSQL.

> [!NOTE]
> **Status Proyek: Dalam Pengembangan Aktif (*Work in Progress*)**  
> Proyek ini masih terus dikembangkan secara bertahap. Struktur kode, skema database, maupun *endpoint* API dapat mengalami penyesuaian, perbaikan, atau penambahan fitur baru di masa mendatang.

- **Base URL Produksi:** `https://reading-tracker-api-8jpa.onrender.com`
- **Aplikasi Frontend:** [client-reading-tracker.vercel.app](https://client-reading-tracker.vercel.app)

---

## Fitur & Arsitektur Keamanan

- **Autentikasi Berbasis JWT:** Perlindungan rute koleksi buku menggunakan *JSON Web Token* dan *password hashing* dengan `bcrypt`.
- **Integrasi Google OAuth (`google-auth-library`):** Verifikasi *ID Token* dari Google di sisi server serta mekanisme *account linking* otomatis apabila email Google sudah terdaftar secara manual sebelumnya.
- **Pemulihan Kata Sandi Aman (`crypto` & `nodemailer`):**
  - Token acak 32-byte (`crypto.randomBytes`) dikirim ke email pengguna via SMTP Gmail, sementara database hanya menyimpan hasil *hash* **SHA-256**.
  - Masa berlaku token dibatasi **15 menit** dan otomatis dihapus setelah digunakan (*one-time use*).
  - Pencegahan *email enumeration* dengan respons generik pada endpoint permintaan reset.
- **Manajemen Data Relasional:** Relasi *one-to-many* antara `User` dan `Book` menggunakan Prisma ORM dan PostgreSQL (Neon) dengan *cascade delete*.

---

## Teknologi yang Digunakan

- **Runtime & Framework:** Node.js, Express v5
- **Database & ORM:** PostgreSQL (Neon), Prisma ORM
- **Keamanan & Autentikasi:** `bcrypt`, `jsonwebtoken`, `google-auth-library`, `crypto` (Node.js native)
- **Layanan Email:** Nodemailer (SMTP Gmail)
- **Deployment:** Render

---

## Skema Database

- **`User`:** `id`, `email` (unique), `username` (unique), `password` (opsional untuk akun OAuth), `googleId` (unique), `resetToken`, `resetTokenExpires`, `createdAt`, `updatedAt`.
- **`Book`:** `id`, `title`, `author`, `status` (`unread` / `reading` / `completed`), `coverUrl`, `startPage`, `endPage`, `currentPage`, `rating`, `review`, `startedAt`, `completedAt`, `userId`, `createdAt`, `updatedAt`.

---

## Daftar Endpoint Utama

### Autentikasi (`/auth`)

| Metode | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Mendaftarkan pengguna baru dengan email, username, dan password |
| `POST` | `/auth/login` | Autentikasi pengguna manual dan menerbitkan token JWT |
| `POST` | `/auth/google` | Verifikasi Google ID Token (*sign-in* / *sign-up* / *account linking*) |
| `POST` | `/auth/forgot-password` | Membuat token reset berbatas 15 menit dan mengirim tautan via email |
| `POST` | `/auth/reset-password/:token` | Memvalidasi token SHA-256 dan memperbarui password baru |

### Koleksi Buku (`/books`) — *Memerlukan Header `Authorization: Bearer <token>`*

| Metode | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/books` | Mengambil seluruh daftar buku milik pengguna yang sedang login |
| `POST` | `/books` | Menambahkan buku baru ke koleksi pengguna |
| `PUT` | `/books/:id` | Memperbarui data buku, status baca, progres halaman, rating, atau ulasan |
| `DELETE` | `/books/:id` | Menghapus buku dari koleksi pengguna |

---

## Menjalankan Proyek di Lokal

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/fadilahfdn/reading-tracker.git
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi variabel lingkungan:**
   Buat file `.env` di folder akar proyek:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   JWT_SECRET="rahasia_jwt_anda"
   GOOGLE_CLIENT_ID="your_google_oauth_client_id.apps.googleusercontent.com"
   EMAIL_USER="emailpengirim@gmail.com"
   EMAIL_PASS="16digitapppasswordgmail"
   FRONTEND_URL="http://localhost:5173"
   ```

4. **Sinkronisasi skema database Prisma:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Jalankan server:**
   ```bash
   npm run dev
   ```