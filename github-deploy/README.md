# SEBLAK POS - paket GitHub Pages

Folder ini berisi file web yang diperlukan untuk menjalankan SEBLAK POS di hosting statis. Tidak perlu proses build.

Pembaruan ini mencakup perbaikan lebar dua panel Penjualan pada tablet, Pembayaran pada layar sempit, pemilih merchant di Pesanan khusus owner/admin, pengaturan Printer dan Struk per perangkat, serta sinkronisasi Penjualan otomatis. APK versi 1.1.7 menyertakan halaman web ini di dalam paket. Jika aplikasi juga dipakai lewat browser biasa, unggah isi folder ini ke hosting agar browser memakai versi yang sama. APK yang sudah terpasang memuat halaman dari paketnya sendiri; perubahan situs tidak mengganti layout APK lama.

## Publikasi

1. Unggah **isi folder ini** ke root repository GitHub (bukan folder proyek induk).
2. Di GitHub, buka **Settings > Pages**. Pilih **Deploy from a branch**, branch `main`, folder `/(root)`, lalu simpan.
3. Buka alamat GitHub Pages yang ditampilkan setelah publikasi selesai.

Semua path CSS dan JavaScript relatif terhadap `index.html`, jadi aplikasi dapat berjalan pada alamat proyek seperti `https://nama-user.github.io/nama-repo/`.

## Sebelum dipakai operasional

- Database Supabase tidak ikut terpasang lewat GitHub Pages. Pastikan skema dan migrasi di folder `supabase/` pada proyek sumber telah diterapkan pada proyek Supabase yang benar.
- Koneksi Supabase dan anon key sudah ada di `app.js`. Jangan pernah menambahkan `service_role` key atau rahasia lain ke repository publik.
- Login username/PIN dan pemisahan merchant saat ini masih bergantung pada logika sisi klien. Ini belum menjadi batas keamanan antar merchant yang tidak saling dipercaya; perlu autentikasi server/Supabase Auth dan RLS per merchant sebelum dipakai secara publik untuk banyak merchant.
