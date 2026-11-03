# DIMSUM MENTAI WALED PREMIUM

Aplikasi kasir dan operasional multi cabang berbasis Next.js 16, NextAuth, dan Supabase.

## Menjalankan secara lokal

```powershell
npm install
npm run dev
```

Buka http://localhost:3100/portal-karyawan. Skrip menjalankan Node.js 22 melalui npm karena Supabase SDK yang digunakan memerlukan runtime tersebut.

Untuk mode produksi lokal:

```powershell
npm run build
npm run start
```

Jangan menjalankan mode dev dan start bersamaan pada port yang sama.

## Akun dan cabang

- Akun admin lama tetap memakai username/password semula dan menjadi **admin utama**.
- `CABANG1`, `CABANG2`, `CABANG3` adalah akun **karyawan**, masing-masing terikat ke satu cabang.
- Password awal akun cabang disimpan dalam file lokal privat `backups/2026-11-03T02-49-41-577Z-supabase/AKUN-CABANG-RAHASIA.txt`.
- Seluruh data lama masuk Cabang 1. Cabang 2 dan Cabang 3 dimulai tanpa transaksi dan produk.
- Admin dapat menambah cabang, mengubah alamat/WhatsApp, mengatur status aktif, menambah akun, memindahkan penempatan karyawan, dan mereset password karyawan.

| Fitur | Admin utama | Karyawan |
| --- | --- | --- |
| Dashboard seluruh cabang | Ya | Cabang sendiri |
| Kasir dan riwayat transaksi | Cabang terpilih | Cabang sendiri |
| Melihat stok | Ya | Cabang sendiri |
| Menyesuaikan stok, produk, harga modal | Ya | Tidak |
| Mencatat pelanggan dan operasional | Ya | Cabang sendiri, selama shift aktif |
| Menghapus pelanggan atau operasional | Ya | Tidak |
| Laba, laporan cabang dan ekspor Excel | Ya | Tidak |
| Mengelola akun, cabang, pengaturan | Ya | Tidak |
| Absensi wajib sebelum kasir | Tidak | Ya |

Validasi sesi, status akun, dan cabang dilakukan kembali di server. Kunci server Supabase tidak dikirim ke browser. Tabel memakai RLS tanpa kebijakan publik; katalog mengambil hanya kolom produk yang aman melalui server. Checkout memakai transaksi PostgreSQL dan harga dari database, serta ID permintaan untuk mencegah pencatatan ganda.

## Tampilan khusus kasir

Akun `CABANG1`, `CABANG2`, `CABANG3`, dan akun karyawan lain memakai tampilan aplikasi HP secara otomatis: beranda harian, menu cepat, status shift, serta navigasi bawah Beranda, Stok, Kasir, Riwayat, dan Akun. Tampilan tetap berbentuk aplikasi saat dibuka dari laptop. Admin utama tetap memakai workspace dengan sidebar dan laporan seluruh cabang.

Beranda dan akun dapat dilihat sebelum mulai shift. Operasional kasir tetap memerlukan shift aktif. Keranjang kasir tampil di atas navigasi bawah, dan konfirmasi pembayaran memakai lembar pembayaran tersendiri.

## Laporan

Dashboard menyediakan pilihan bulan ini, tujuh hari, hari ini, sejak awal usaha, dan tanggal khusus. Tanggal laporan menggunakan WIB. Data lama memiliki transaksi Juni–September 2026; pilih **Sejak awal usaha** untuk melihat seluruh riwayat.

- Laba bersih = penjualan selesai − harga pokok barang terjual − biaya operasional.
- Arus kas = penjualan selesai − biaya operasional − pembelian stok.
- Pembelian stok ditampilkan terpisah agar tidak menjadi pengurang laba kedua setelah HPP.

## Database dan backup

Database aktif: `ysiuwdbycegoteyokjlx.supabase.co`. Kredensial lokal berada dalam `.env.local`, yang diabaikan Git.

```powershell
npm run backup:db
```

Backup baru berisi data JSON untuk semua tabel aplikasi, skema, manifest SHA-256, foto Storage, dan SQL pemulihan. Lokasi terakhir ada pada `backups/latest.txt`. Backup sebelum migrasi tetap tersedia melalui `backups/migration-source.txt`.

Ini merupakan backup data aplikasi dan Storage, bukan dump seluruh sistem Supabase (roles, Auth internal, extension, dan konfigurasi platform). Aplikasi menggunakan akun `app_users` dengan NextAuth.

Pemulihan database dilakukan dengan `restore-database.sql` ke database kosong. Untuk pindah ke URL proyek lain, set tujuan pada `.env.supabase-target.local`, lalu jalankan:

```powershell
node scripts/supabase-migration.cjs prepare "ABSOLUTE_BACKUP_DIRECTORY"
```

Perintah tersebut menyiapkan SQL dengan URL gambar yang diperbarui dan menyalin objek Storage, tanpa menimpa file berbeda. Jalankan SQL yang dihasilkan di proyek tujuan, lalu gunakan `verify` sebelum `cutover`. Jalankan migrasi saat tidak ada transaksi berjalan; ekspor REST memeriksa kestabilan baris, tetapi tidak menyediakan snapshot lintas tabel seperti pg_dump.

Backup lokal berisi data pribadi dan konfigurasi server. Arsip ZIP yang disediakan mengecualikan file `.env` dan daftar password akun. Simpan backup di tempat privat.

`supabase_schema.sql` adalah skema instalasi baru tanpa password default. Migrasi berversi ada pada `database/`. Jangan menjalankan ulang file impor awal ke database yang sudah berisi data.

## Pemeriksaan yang sudah dijalankan

```powershell
node scripts/test-finance.cjs
node scripts/test-branch-database.cjs
node scripts/test-live-access.cjs
npm run build
```

Uji database lokal memakai PGlite dalam folder validasi yang diabaikan Git. Jika folder validasi belum tersedia:

```powershell
npm install --prefix backups/validation --no-audit --no-fund --ignore-scripts @electric-sql/pglite
```

Uji HTTP memerlukan server lokal aktif dan backup migrasi awal. Pengujian tidak membuat transaksi atau mengubah stok produksi. Pengujian transaksi, rollback, dan aturan relasi dilakukan pada salinan PostgreSQL lokal.

## Domain produksi nanti

Domain produksi: `https://dimsumwaled.azzamcodex.dev`. Contoh konfigurasi tersedia di `.env.production.example`. Isi secret melalui pengaturan server hosting dan gunakan `NEXTAUTH_URL` domain produksi.

## Rilis aplikasi Android

Workflow `.github/workflows/build-apk.yml` membangun APK setiap ada perubahan pada `android/`, `native-web/`, atau `capacitor.config.json`. Setelah lolos verifikasi branding, APK dipublikasikan otomatis ke `public/app/dimsum-waled-premium.apk` dan metadata rilis (`versi`, ukuran, SHA-256, tanggal build) ditulis ke `lib/app-release.json`. Halaman `/download` membaca metadata tersebut, jadi tombol unduh selalu menunjuk ke build terbaru.

Naikkan `versionCode` dan `versionName` di `android/app/build.gradle` (serta `version`/`versionCode` di `lib/app-release.json`) setiap kali merilis update agar perangkat Android dapat memasang pembaruan di atas versi lama.

> Catatan: build saat ini memakai debug keystore yang dibuat ulang di setiap runner, sehingga tanda tangannya berbeda-beda. Untuk pembaruan berkelanjutan, siapkan keystore tetap (via secret CI) lalu gunakan untuk `assembleRelease`.
