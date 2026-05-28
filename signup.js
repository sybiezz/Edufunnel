import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// KONEKSI SUPABASE
const supabaseUrl = 'https://afaocnqvmvhkxpomefct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYW9jbnF2bXZoa3hwb21lZmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjE3MDAsImV4cCI6MjA5NDEzNzcwMH0.0on2ooeQbsO2BfTkec3nCL7t-mKcyWd1Z9Xo9htbygg';
const supabase = createClient(supabaseUrl, supabaseKey);

document.getElementById("signupBtn").addEventListener("click", async function (e) {
  e.preventDefault();

  const fullname = document.getElementById("fullname").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (fullname === "" || email === "" || password === "") {
    alert("Semua data wajib diisi!");
    return;
  }

  // Tembak API Supabase buat Register, sekalian nyimpen Nama dan bikin Avatar!
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: fullname,
        // Bikin foto profil otomatis pakai inisial nama
        avatar_url: `https://ui-avatars.com/api/?name=${fullname}&background=random&color=fff`
      }
    }
  });

  if (error) {
    alert("Gagal mendaftar: " + error.message);
  } else {
    alert("Berhasil mendaftar! Silakan Sign In.");
    window.location.href = "../login/login.html"; // Balik ke halaman login
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