import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ==========================================
// 1. KONEKSI SUPABASE
// ==========================================
// "Ini adalah konfigurasi awal untuk menyambungkan halaman Login dengan layanan Autentikasi Supabase di cloud."
const supabaseUrl = 'https://afaocnqvmvhkxpomefct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYW9jbnF2bXZoa3hwb21lZmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjE3MDAsImV4cCI6MjA5NDEzNzcwMH0.0on2ooeQbsO2BfTkec3nCL7t-mKcyWd1Z9Xo9htbygg';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. PROSES OTENTIKASI LOGIN
// ==========================================
// Tambahkan 'async' dan parameter '(e)' untuk menangani event
// "Blok ini adalah Event Listener. Saat user klik tombol Login, sistem akan menahan halamannya agar tidak reload, lalu membaca inputan dari kolom email dan password."
document.getElementById("loginBtn").addEventListener("click", async function (e) {
  e.preventDefault(); // Mencegah browser me-refresh halaman otomatis saat tombol diklik

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  // VALIDASI INPUT
  // "Ini adalah validasi Front-End sederhana. Kalau ada kolom yang dikosongin, sistem akan langsung menolak dan memunculkan peringatan sebelum mengirim data ke server."
  if (username === "" || password === "") {
    alert("Username/Email dan Password wajib diisi!");
    return;
  }

  // TEMBAK API SUPABASE UNTUK LOGIN
  // "Di sinilah letak keamanan backend-nya. Input pengguna dikirimkan ke server Supabase Auth menggunakan fungsi signInWithPassword untuk dicocokkan dengan database."
  const { data, error } = await supabase.auth.signInWithPassword({
    email: username, // Supabase Auth butuh format email, jadi nilai 'username' lu masukin ke sini
    password: password,
  });

  // CEK HASIL LOGIN
  // "Setelah server merespon, logika percabangan ini bekerja. Jika error, muncul notifikasi gagal. Jika sukses, user otomatis diarahkan ke halaman Dashboard utama."
  if (error) {
    // Kalau salah password atau akun tidak ditemukan
    alert("Login gagal: " + error.message);
  } else {
    // Kalau berhasil diverifikasi oleh database
    alert("Login sukses! Mengalihkan...");
    window.location.href = "../dashboard.html";
  }

});

// ==========================================
// 3. FITUR FRONT-END (UI/UX)
// ==========================================
// --- FITUR LIHAT/SEMBUNYIKAN PASSWORD ---
// "Ini adalah fitur tambahan untuk kenyamanan User Experience (UX). Script ini mendeteksi klik pada ikon mata, lalu mengubah tipe input dari 'password' (titik-titik) menjadi 'text' (terbaca), dan sebaliknya."
const toggleIcons = document.querySelectorAll('.toggle-pw');

toggleIcons.forEach(icon => {
  icon.addEventListener('click', function() {
    const input = this.previousElementSibling;
    
    if (input.type === 'password') {
      input.type = 'text';
      this.classList.remove('fa-eye-slash');
      this.classList.add('fa-eye');
    } else {
      input.type = 'password';
      this.classList.remove('fa-eye');
      this.classList.add('fa-eye-slash');
    }
  });
});
