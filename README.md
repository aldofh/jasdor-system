# KEWAS SYSTEM

Katalog pemesanan untuk satu toko, dengan checkout WhatsApp dan panel pengelolaan katalog.

## Menjalankan lokal

Pastikan Node.js dan npm tersedia, lalu dari folder proyek jalankan:

```bash
npm install
npm run dev
```

Buka alamat Vite yang ditampilkan di terminal, biasanya `http://localhost:5173`. Panel katalog ada di `http://localhost:5173/admin`. Perubahan katalog dan informasi toko disimpan oleh server lokal ke `server-data/catalog.json` dan digunakan halaman pelanggan. Data katalog lama otomatis dimigrasikan dengan mempertahankan menu toko yang sebelumnya ditampilkan ke pelanggan.

Untuk pemeriksaan production:

```bash
npm run build
npm start
```

Server melayani halaman hasil build dan API katalog pada port `3001` (dapat diubah dengan `PORT`). Simpan direktori `server-data` pada persistent disk saat hosting agar perubahan tidak hilang ketika server dimulai ulang. Admin belum menggunakan login; jangan publikasikan server sebelum akses admin dilindungi.
