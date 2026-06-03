Admissions Hub

Dashboard analitik interaktif untuk melacak probabilitas konversi funnel penerimaan calon mahasiswa baru. Proyek ini dibangun menggunakan HTML, CSS, JavaScript (Vanilla), dan terintegrasi dengan backend API.

1. Cara Instalasi
Aplikasi ini tidak memerlukan instalasi package/library tambahan via Node.js atau NPM karena menggunakan teknologi vanilla dan CDN.
1. Buka terminal atau command prompt.
2. Clone repository ini dengan perintah:
   `git clone https://github.com/sybiezz/Edufunnel.git`
3. Buka folder proyek di code editor pilihan Anda (contoh: VS Code).

2. Cara Menjalankan Aplikasi
Aplikasi dapat dijalankan langsung di komputer (lokal) tanpa konfigurasi server yang rumit:
Opsi A (Rekomendasi): Gunakan ekstensi Live Server di VS Code. Buka file `dashboard.html` atau `login.html`, lalu klik "Go Live".
Opsi B (Manual): Cukup klik dua kali (buka) file `.html` mana saja menggunakan aplikasi browser (Chrome, Safari, Edge, Mozilla, Brave).

3. Struktur Folder & File Utama
Proyek ini mengadopsi struktur flat untuk memudahkan integrasi deployment:
- `.html` : File antarmuka utama (`dashboard.html`, `login.html`, `listdata.html`, `profile.html`).
- `.css` : File styling halaman (`dashboard.css`, `login.css`, `signup.css`, `profile.css`, `liastdata.css`).
- `.js` : File logika utama yang berisi penarikan data dan rendering grafik Chart.js (`dashboard.js`, `login.js`, `signup.js`, `profile.js`, `liastdata.js`).
- `.otf` : File font kustom (SF Pro Display) untuk konsistensi tipografi UI.
- `data_funnel.json` : Dokumentasi skema dan struktur kalkulasi data mentah.
- `vercel.json` : Konfigurasi rewrites untuk deployment di server Vercel.

4. Daftar API & Integrasi Data
Proyek ini memanfaatkan dua sumber data utama:
1. Supabase PostgreSQL API (Back-End): Digunakan sebagai database real-time untuk manajemen user authentication (Login/Signup) dan penarikan data mentah calon mahasiswa baru menggunakan Anon Key.
2. CDN Chart.js: Pemanggilan library pembuat grafik antarmuka.
