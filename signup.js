import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ==========================================
// 1. KONEKSI SUPABASE
// ==========================================
// "Sama seperti halaman login, ini adalah gerbang koneksi ke server database Supabase di cloud menggunakan URL dan Anon Key."
const supabaseUrl = 'https://afaocnqvmvhkxpomefct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYW9jbnF2bXZoa3hwb21lZmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjE3MDAsImV4cCI6MjA5NDEzNzcwMH0.0on2ooeQbsO2BfTkec3nCL7t-mKcyWd1Z9Xo9htbygg';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. PROSES REGISTRASI (SIGN UP)
// ==========================================
// "Event listener untuk menangani proses pendaftaran saat tombol diklik. Parameter 'e' dan 'e.preventDefault()' digunakan untuk menahan halaman agar tidak me-refresh secara otomatis saat form disubmit."
document.getElementById("signupBtn").addEventListener("click", async function (e) {
  e.preventDefault();

  const fullname = document.getElementById("fullname").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // VALIDASI INPUT KOSONG
  // "Ini adalah proteksi di sisi Front-End. Jika ada field yang kosong, fungsi akan langsung dihentikan (return) sebelum menyentuh server, sehingga menghemat beban lalu lintas data (bandwidth) ke database."
  if (fullname === "" || email === "" || password === "") {
    alert("Semua data wajib diisi!");
    return;
  }

  // TEMBAK API SUPABASE UNTUK REGISTER (DENGAN METADATA)
  // "Di sini bagian krusialnya. Saya tidak hanya mendaftarkan email dan password. Menggunakan fitur 'options.data', saya langsung menyisipkan Nama Lengkap ke dalam metadata Supabase Auth saat pendaftaran terjadi."
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: fullname,
        // Bikin foto profil otomatis pakai inisial nama
        // "Logika dinamis untuk men-generate foto profil default. Menggunakan API terbuka dari UI-Avatars, sistem otomatis membuatkan avatar berbasis inisial nama pendaftar dengan warna latar acak."
        avatar_url: `https://ui-avatars.com/api/?name=${fullname}&background=random&color=fff`
      }
    }
  });

  // CEK HASIL REGISTRASI
  // "Logika percabangan untuk menangkap respon dari server. Jika email sudah terdaftar atau password terlalu lemah, Supabase akan menolaknya dan pesan error bawaan (error.message) akan langsung ditampilkan ke user."
  if (error) {
    alert("Gagal mendaftar: " + error.message);
  } else {
    alert("Berhasil mendaftar! Silakan Sign In.");
    window.location.href = "login.html"; // Balik ke halaman login
  }
});

// ==========================================
// 3. FITUR FRONT-END: LIHAT/SEMBUNYIKAN PASSWORD
// ==========================================
// "Script interaktif murni (manipulasi DOM) untuk mengubah atribut 'type' pada inputan dari 'password' menjadi 'text', agar user bisa memastikan tidak ada *typo* pada password mereka sebelum mendaftar."
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
