import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://afaocnqvmvhkxpomefct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYW9jbnF2bXZoa3hwb21lZmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjE3MDAsImV4cCI6MjA5NDEzNzcwMH0.0on2ooeQbsO2BfTkec3nCL7t-mKcyWd1Z9Xo9htbygg';
const supabase = createClient(supabaseUrl, supabaseKey);

// Tambahkan 'async' dan parameter '(e)' untuk menangani event
document.getElementById("loginBtn").addEventListener("click", async function (e) {
  e.preventDefault(); // Mencegah browser me-refresh halaman otomatis saat tombol diklik

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  // VALIDASI INPUT
  if (username === "" || password === "") {
    alert("Username/Email dan Password wajib diisi!");
    return;
  }

  // TEMBAK API SUPABASE UNTUK LOGIN
  const { data, error } = await supabase.auth.signInWithPassword({
    email: username, // Supabase Auth butuh format email, jadi nilai 'username' lu masukin ke sini
    password: password,
  });

  // CEK HASIL LOGIN
  if (error) {
    // Kalau salah password atau akun tidak ditemukan
    alert("Login gagal: " + error.message);
  } else {
    // Kalau berhasil diverifikasi oleh database - Perbaikan path ke /dashboard
    alert("Login sukses! Mengalihkan...");
    window.location.href = "/dashboard";
  }

});

// --- FITUR LIHAT/SEMBUNYIKAN PASSWORD ---
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
