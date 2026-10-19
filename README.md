# AR Studio BM3 - Platform Pembuat Konten 3D & AR

Platform web internal kantor untuk membuat, membagikan, dan melihat konten 3D dan Augmented Reality (AR) tanpa coding, dibangun sesuai dengan spesifikasi [PRD Platform Pembuat Konten 3D AR.md](file:///d:/1%20APPS/1%20KERJAAN%20BM3%20APPS/PROJEK%20AR%20V.1/PRD%20Platform%20Pembuat%20Konten%203D%20AR.md).

---

## 🚀 Fitur Utama

- **Super Simple Editor**: Wizard 3 langkah cepat untuk pemula: Pilih Marker &rarr; Pilih Objek 3D &rarr; Atur Ukuran. Selesai dalam &lt; 2 menit.
- **Default 3D Studio**: Editor 3D Three.js penuh dengan `TransformControls` (Move `W`, Rotate `E`, Scale `R`), hirarki objek scene, teks 3D, material PBR, pencahayaan, dan auto-save real-time.
- **Pustaka Aset & Media**: Upload dan kelola model 3D (`.glb`, `.gltf`), gambar banner/tekstur, dan audio.
- **AR Marker Manager**: Marker bawaan (Hiro Marker, Barcode, Target Circle) dan upload marker fisik custom.
- **Universal Web Viewer**: Dapat dibuka oleh siapa saja tanpa login lewat satu link publik atau scan QR code di browser ponsel, lengkap dengan mode **3D Orbit** dan mode **Kamera Web AR**.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **3D Engine**: [Three.js](https://threejs.org/)
- **Database & ORM**: [Prisma](https://www.prisma.io/) (SQLite untuk dev lokal cepat / MySQL untuk server produksi)
- **Styling**: Vanilla CSS modern dengan estetika dark nebula dan glassmorphism
- **Icons**: Lucide React
- **QR Code**: qrcode generator library

---

## 💻 Cara Menjalankan Proyek Secara Lokal

### 1. Inisialisasi Database & Seed Admin
```bash
# Push skema database ke SQLite dev
npx prisma db push

# Jalankan seeder akun admin, default marker, dan proyek demo
npm run db:seed
```

### 2. Jalankan Development Server
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🔑 Kredensial Admin Default

- **URL Login**: [http://localhost:3000/login](http://localhost:3000/login)
- **Email**: `admin@kantor.local`
- **Kata Sandi**: `admin12345`

---

## 📱 URL Pengujian Demo Publik

- **URL Proyek Demo**: [http://localhost:3000/view/demo-kantor-ar](http://localhost:3000/view/demo-kantor-ar)
- Berisi Crystal Neon Cube, teks 3D, pencahayaan sorot, dan tombol **"Lihat dalam AR"**.
