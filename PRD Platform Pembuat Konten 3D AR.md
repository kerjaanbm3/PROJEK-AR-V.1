# PRD: Platform Pembuat Konten 3D/AR

Oct 19, 2026 · @eret

## 1. Ringkasan dan latar belakang

Aplikasi web internal kantor untuk membuat, membagikan, dan melihat konten 3D/AR lewat drag and drop tanpa coding. Aplikasi dikelola oleh satu akun admin (pemilik), tanpa pendaftaran publik dan tanpa paket komersial; penonton cukup membuka link proyek.

**Visi.** Pengelola bisa membuat proyek AR dalam kurang dari 5 menit dan membagikannya lewat satu link.

**Tujuan**

- Editor 3D/AR berbasis web yang bisa dipakai pemula tanpa pelatihan
- Satu link untuk membagikan dan melihat proyek di browser dan ponsel
- Dibangun dengan Next.js, Prisma, dan MySQL agar mudah dirawat
- Berjalan di server kantor atau VPS kecil

**Bukan tujuan**

- Pendaftaran publik, langganan, pembayaran, dan paket berbayar
- Marketplace, Discover, dan aplikasi mobile native
- Pemodelan 3D dari nol (sculpting, rigging)
- Kolaborasi real-time banyak pengguna

**Catatan penting.** Fitur dan alur kerja terinspirasi dari kategori produk pembuat AR yang sudah ada, tetapi nama, logo, desain visual, pustaka aset, dan kode produk lain tidak boleh disalin. Semua aset 3D harus buatan sendiri atau berlisensi.

## 2. Pengguna dan hak akses

Pengguna dibatasi pada pengelola dan penonton internal; tidak ada pendaftaran publik.

| Peran | Siapa | Kemampuan |
| --- | --- | --- |
| Admin | Pemilik akun, pengelola aplikasi | Mengelola semua proyek, aset, marker, dan akun; mengatur pengaturan sistem |
| Editor (opsional) | Staf yang diberi akun oleh admin | Membuat dan mengubah proyek miliknya sendiri |
| Penonton | Rekan kantor, tamu, atau klien yang menerima link | Membuka dan melihat proyek lewat link, tanpa login |

**Catatan:** MVP cukup memakai satu akun admin; peran Editor dibuat hanya jika kantor membutuhkannya.

## 3. Lingkup MVP dan prioritas fitur

MVP fokus pada alur inti: login admin, buat proyek di editor, bagikan, lalu lihat. P0 wajib ada di rilis pertama, P1 menyusul, P2 hanya dikerjakan jika dibutuhkan.

| Modul | Fitur | Prioritas |
| --- | --- | --- |
| Akun | Login admin (akun dari seed), logout, ganti kata sandi | P0 |
| Dashboard proyek | Daftar, buat, ubah nama, hapus, duplikat proyek | P0 |
| Editor | Tambah objek 2D/3D, teks, gambar | P0 |
| Editor | Move, rotate, scale, duplicate, delete, panel transform | P0 |
| Editor | Warna background, multi-select, undo/redo, simpan otomatis | P0 |
| Super Simple Editor | Alur 3 langkah: marker, objek, ukuran | P0 |
| Library aset | Upload dan kelola model GLB/glTF dan gambar | P0 |
| Viewer | Web viewer 3D dan share link tanpa login | P0 |
| AR | Marker AR dan QR marker, tampilan AR di ponsel | P1 |
| Editor | Video, audio, anotasi, multi-scene | P1 |
| Editor | Animasi dan interaksi sederhana (misalnya kuis) | P1 |
| Template | Template proyek internal | P1 |
| Berbagi | Link privat (token atau kata sandi), embed iframe | P1 |
| Marker | Upload dan kelola marker sendiri | P1 |
| Akun | Akun editor tambahan yang dibuat admin | P2 |
| Integrasi | Embed ke intranet atau website kantor | P2 |

## 4. Kebutuhan fungsional per modul

**4.1 Akun dan akses**

- Login dengan email dan kata sandi; akun admin dibuat lewat seed Prisma, tanpa halaman daftar
- Sesi aman (cookie httpOnly), logout, dan ganti kata sandi
- Admin dapat menambah akun editor secara manual (P2)
- Penonton tidak perlu login untuk membuka link proyek

**4.2 Dashboard proyek**

- Daftar proyek dengan thumbnail, nama, tanggal ubah
- Aksi: buat, buka, ganti nama, duplikat, hapus, salin link
- Pilihan saat membuat: Super Simple Editor, Default Editor, atau dari template
- Penanda status: draft, publik (link), privat (token)

**4.3 Editor (Default)**

- Kanvas 3D dengan kamera orbit, zoom, dan pan
- Panel objek: objek 3D/2D, teks 3D, teks/anotasi, gambar, video, audio
- Transform: move, rotate, scale, mirror, duplicate, delete, dengan input angka di panel transform
- Multi-select, undo/redo, ganti warna background, pengaturan tampilan
- Multi-scene: tambah, urutkan, salin objek antar-scene
- Animasi objek dan interaksi dasar (tap untuk memutar animasi, pindah scene, kuis)
- Simpan otomatis; posisi dan properti objek disimpan sebagai JSON di MySQL

**4.4 Super Simple Editor**

- Tiga langkah berurutan: pilih marker, pilih objek 3D, atur ukuran
- Hasil langsung bisa dibagikan, dan bisa dibuka di Default Editor untuk disunting lanjut

**4.5 AR marker**

- **Jenis Marker:**
  - **QR Marker:** Kode QR bawaan platform yang langsung membuka dan memicu proyek AR.
  - **Custom AR Marker:** Gambar kustom apa pun (logo, poster, kartu nama, kemasan produk).
  - **Markerless Mode:** Pelacakan lingkungan tanpa marker.
- **Alur Setup Custom Marker (5 Langkah):**
  1. Klik *Add Custom Marker*
  2. Pilih file gambar marker (PNG/JPG dengan kontras tinggi)
  3. Beri nama marker dan pilih proyek yang dipasangkan (*projectId*)
  4. Penilaian otomatis kualitas gambar (*qualityScore* dengan status Excellent/Good/Poor)
  5. Pilih orientasi: **Horizontal** (objek berdiri di atas marker) atau **Vertical** (objek muncul di depan marker dinding/poster)
- **Atribut Model Marker:**
  - `name`: Nama marker
  - `projectId`: Proyek yang dipasangkan
  - `orientation`: HORIZONTAL atau VERTICAL
  - `qualityScore`: Hasil penilaian kualitas gambar (0-100)
  - `imagePath` / `imageUrl`: Lokasi file gambar di folder aset
- **Integrasi Editor & Viewer:**
  - Marker dapat dipilih dan dipasang langsung dari dalam 3D Editor maupun Dashboard Markers.
  - Di Viewer AR, penonton diarahkan mengarahkan kamera ke target visual marker untuk memunculkan konten visual 3D/Foto/GIF.
  - Opsi unduh dan cetak lembar target fisik A4 untuk pengujian langsung.

**4.6 Library aset dan upload**

- Daftar aset (model 3D, gambar, audio, video) dengan pencarian dan filter tipe
- Upload model GLB/glTF, gambar, dan audio dengan validasi format dan ukuran
- File disimpan di folder server atau MinIO; MySQL hanya menyimpan path dan metadata
- Hapus aset hanya jika tidak dipakai proyek, atau dengan peringatan

**4.7 Viewer dan berbagi**

- Web viewer yang bisa dibuka tanpa login
- Mode 3D (orbit) dan mode AR (kamera ponsel)
- Link publik, link privat dengan token atau kata sandi, dan kode embed iframe
- Kode QR otomatis untuk tiap proyek

**4.8 Pengaturan sistem (admin)**

- Batas ukuran upload dan format aset yang diizinkan
- Pengelolaan akun editor, bila dipakai
- Informasi pemakaian storage dan status backup

## 5. User flow utama

Empat alur inti; pengguna baru sebaiknya mencapai proyek pertama yang bisa dibagikan dalam kurang dari 5 menit.

**A. Onboarding**

1. Buka landing page, klik Daftar
2. Isi email dan kata sandi (atau login Google)
3. Verifikasi email lewat tautan
4. Masuk ke dashboard proyek kosong dengan ajakan Buat proyek pertama

**B. Proyek cepat (Super Simple Editor)**

1. Klik Proyek baru, lalu pilih Super Simple
2. Pilih AR marker
3. Pilih objek 3D dari library
4. Atur ukuran objek
5. Simpan, lalu salin link atau pindai QR untuk melihat di ponsel

**C. Proyek lengkap (Default Editor)**

1. Klik Proyek baru, lalu pilih Default atau mulai dari template
2. Tambahkan objek, teks, gambar, video, dan audio ke kanvas
3. Atur posisi, rotasi, dan skala dengan transform tools
4. Tambah scene dan animasi atau interaksi bila perlu
5. Pratinjau, lalu Publikasikan (publik atau privat)
6. Bagikan link, QR, atau kode embed

**D. Penerima melihat proyek**

1. Buka link di browser tanpa login
2. Lihat dalam mode 3D (putar dan zoom)
3. Pilih Lihat dalam AR, izinkan kamera, arahkan ke marker

**Cabang penting:** pengguna Free yang melewati batas storage, slot marker, atau memakai aset Pro diarahkan ke halaman upgrade tanpa kehilangan proyek yang sedang dikerjakan.

## 6. Kebutuhan non-fungsional

Target berikut adalah usulan awal dan perlu divalidasi dengan uji pada perangkat nyata.

| Aspek | Target |
| --- | --- |
| Performa viewer | Proyek standar termuat dalam 5 detik pada 4G; 30 fps di ponsel kelas menengah |
| Performa editor | Interaksi kanvas tetap 60 fps hingga 100 objek |
| Kompatibilitas | Chrome, Safari, Edge, Firefox terbaru; iOS 15+ dan Android 10+ untuk AR |
| Ukuran aset | Batas upload per model (misalnya 25 MB) dan kompresi otomatis tekstur |
| Keamanan | HTTPS, kata sandi di-hash, validasi file upload, scan malware, rate limiting |
| Privasi | Persetujuan akses kamera, kebijakan data pengguna, kepatuhan UU PDP |
| Ketersediaan | Uptime 99,5%, backup harian untuk proyek dan aset |
| Skalabilitas | Aset disajikan lewat CDN; render di sisi klien agar biaya server rendah |
| Aksesibilitas | Navigasi keyboard dasar, kontras teks memadai, dukungan bahasa Indonesia dan Inggris |

## 7. Arsitektur, tech stack, dan skema data

Editor dan viewer berjalan sepenuhnya di klien (browser), sehingga backend cukup mengelola akun, data proyek, dan aset.

&#91;embedded content: arsitektur sistem · 3 lapisan\]

Viewer memuat model 3D langsung dari CDN; backend hanya menerbitkan izin upload dan menyimpan metadata.

**Tech stack yang disarankan**

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Editor dan viewer 3D | React, TypeScript, Three.js / React Three Fiber | Render 3D di browser, ekosistem besar |
| AR berbasis marker | AR.js atau MindAR di web; AR native untuk P2 | Dukungan WebXR di iOS Safari terbatas, perlu diuji pada perangkat nyata |
| Backend | Node.js + TypeScript, REST API | Satu bahasa dengan frontend |
| Database | PostgreSQL | Data relasional: user, proyek, scene, objek |
| Aset | Penyimpanan S3-compatible + CDN | Model besar disajikan cepat dan murah |
| Format 3D | GLB/glTF, kompresi Draco dan KTX2 | Standar terbuka, ukuran kecil |
| Pembayaran | Midtrans atau Xendit (lokal), Stripe (global) | Mendukung e-wallet dan kartu |

**Skema data utama**

| Tabel | Kolom penting |
| --- | --- |
| users | id, email, password\_hash, verified\_at, plan\_id |
| plans | id, name, storage\_mb, marker\_slots, pro\_assets, private\_share |
| projects | id, user\_id, title, status (draft/publik/privat), mode (simple/default), share\_slug, updated\_at |
| scenes | id, project\_id, order, background\_color |
| objects | id, scene\_id, asset\_id, type, transform (posisi, rotasi, skala), props (JSON: teks, warna, animasi) |
| assets | id, owner\_id (kosong untuk aset bawaan), type (3d/gambar/audio/video), file\_url, size\_bytes, tier (free/pro) |
| markers | id, user_id, name, projectId, orientation (HORIZONTAL/VERTICAL), qualityScore (0-100), imagePath / imageUrl |
| subscriptions | id, user\_id, plan\_id, status, period\_end |

## 8. Model bisnis dan plan langganan

Model freemium: Free untuk akuisisi, plan berbayar untuk storage, aset Pro, dan privasi. Angka di bawah adalah usulan awal yang perlu diuji; harga final disesuaikan per negara.

| Fitur | Free | Basic | Pro |
| --- | --- | --- | --- |
| Storage model 3D sendiri | 10 MB | 300 MB | 2 GB |
| Aset dan template | Free | Free + Pro | Free + Pro |
| Pustaka audio dan font 3D Pro | Tidak | Ya | Ya |
| Upload audio sendiri | Tidak | Ya | Ya |
| Custom marker | 1 | 5 | 25 |
| Share proyek privat | Tidak | Ya | Ya |
| Bebas iklan / tanpa watermark | Tidak | Ya | Ya |
| Harga bulanan (usulan) | 0 | sekitar USD 5-10 | sekitar USD 15-25 |

**Sumber pendapatan tambahan:** pembelian marker tambahan, komisi marketplace (P2), dan paket institusi untuk sekolah atau perusahaan.

## 9. Roadmap, metrik, risiko, dan pertanyaan terbuka

Roadmap terdiri dari tiga fase dan dua gerbang keputusan; durasi adalah usulan awal yang perlu disesuaikan dengan ukuran tim.

&#91;embedded content: roadmap · 3 fase, 2 gerbang\]

Fase berikutnya dimulai hanya jika kriteria gerbang terpenuhi.

**Metrik keberhasilan**

| Metrik | Cara ukur | Target |
| --- | --- | --- |
| Waktu ke proyek pertama | Median dari daftar sampai link pertama dibagikan | Kurang dari 5 menit |
| Aktivasi | Persentase pengguna baru yang membagikan proyek dalam 7 hari | Ditetapkan setelah beta |
| Retensi | Persentase pengguna aktif kembali pada minggu ke-4 | Ditetapkan setelah beta |
| Konversi berbayar | Persentase pengguna Free yang berlangganan | Ditetapkan setelah beta |
| Kinerja viewer | Waktu muat dan fps median | Sesuai bagian 6 |

**Risiko utama**

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Pelacakan AR berbeda antar perangkat, terutama iOS | Pengalaman AR tidak konsisten | Uji pada matriks perangkat sejak fase 1; sediakan mode 3D sebagai cadangan |
| Pelanggaran hak cipta (meniru produk atau memakai aset tanpa lisensi) | Gugatan dan pencabutan layanan | Desain dan aset orisinal, lisensi jelas tiap aset, moderasi upload |
| Biaya storage dan CDN membengkak | Margin turun | Kompresi otomatis, batas ukuran per plan |
| Upload berbahaya atau konten melanggar | Risiko keamanan dan reputasi | Validasi dan scan file, fitur lapor konten |
| Editor lambat di perangkat lemah | Pengguna berhenti memakai | Batas kompleksitas scene, level of detail |

**Pertanyaan terbuka**

- Target pasar pertama: pendidikan, pemasaran, atau umum?
- Aset 3D bawaan: dibuat sendiri, dilisensi, atau hanya upload pengguna?
- Perlu aplikasi native sejak awal, atau cukup web?
- Mata uang dan metode pembayaran utama?
