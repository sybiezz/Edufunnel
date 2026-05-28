import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ==========================================
// 1. KONEKSI SUPABASE
// ==========================================
// "Inisialisasi klien Supabase untuk menghubungkan halaman profil dengan sistem Autentikasi dan Database di cloud."
const supabaseUrl = 'https://afaocnqvmvhkxpomefct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYW9jbnF2bXZoa3hwb21lZmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjE3MDAsImV4cCI6MjA5NDEzNzcwMH0.0on2ooeQbsO2BfTkec3nCL7t-mKcyWd1Z9Xo9htbygg';
const supabase = createClient(supabaseUrl, supabaseKey);

// Wadah untuk menyimpan string foto yang sudah diconvert ke format tulisan (Base64)
let base64Avatar = ""; 

// ==========================================
// 2. FUNGSI LOAD PROFIL (TAMPILKAN DATA SAAT INI)
// ==========================================
// "Fungsi ini berjalan otomatis saat halaman dibuka. Tugasnya menarik data user dari sesi (session) Supabase Auth, lalu menempelkan nama, email, dan foto profilnya ke elemen-elemen HTML (DOM)."
async function loadProfile() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) { window.location.href = '../login.html'; return; }

  const fullName = user.user_metadata?.full_name || 'Admin';
  const avatarUrl = user.user_metadata?.avatar_url || 'https://i.pravatar.cc/150';
  const email = user.email;

  // Menempelkan data ke User Interface (UI)
  document.getElementById('nav-name').innerText = fullName;
  document.getElementById('nav-avatar').src = avatarUrl;
  document.getElementById('display-name').innerText = fullName;
  document.getElementById('display-email').innerText = email;
  document.getElementById('preview-avatar').src = avatarUrl;

  document.getElementById('edit-name').value = fullName;
}

// ==========================================
// 3. SENSOR GAMBAR & AUTO-CROP KOTAK 1:1 (FITUR ADVANCED)
// ==========================================
// "Ini adalah fitur pintar menggunakan HTML5 Canvas. Saat user upload foto, sistem tidak langsung menyimpannya. Sistem akan membaca resolusinya, memotongnya (crop) tepat di tengah menjadi kotak 1:1 (150x150px), lalu mengubah gambar tersebut menjadi teks (Base64) agar ringan dan aman disimpan langsung ke metadata akun tanpa butuh server penyimpanan gambar."
document.getElementById('file-upload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const SIZE = 150; // Ukuran target foto profil (150x150 pixel)
        
        // Logika Matematika untuk memotong (crop) gambar di bagian tengah
        const minSize = Math.min(img.width, img.height);
        const startX = (img.width - minSize) / 2;
        const startY = (img.height - minSize) / 2;

        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        // Gambar ulang fotonya di atas canvas dengan rasio 1:1
        ctx.drawImage(img, startX, startY, minSize, minSize, 0, 0, SIZE, SIZE);

        // Ubah gambar jadi string teks (Base64) dengan kualitas 80% (0.8) agar datanya tidak terlalu besar
        base64Avatar = canvas.toDataURL('image/jpeg', 0.8);
        document.getElementById('preview-avatar').src = base64Avatar;
      };
      img.src = event.target.result;
    }
    reader.readAsDataURL(file);
  }
});

// ==========================================
// 4. FUNGSI UPDATE DATA PROFIL (NAMA, FOTO, PASSWORD)
// ==========================================
// "Fungsi ini berjalan saat tombol Save diklik. Mengumpulkan inputan, melakukan validasi password ganda, lalu mengirimkan request update (updateUser) ke server Supabase."
document.getElementById('saveProfileBtn').addEventListener('click', async function() {
  const newName = document.getElementById('edit-name').value.trim();
  
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  const btn = this;
  btn.innerText = "Saving...";

  const { data: { user } } = await supabase.auth.getUser();

  // --- LOGIKA KEAMANAN: GANTI PASSWORD ---
  // "Untuk keamanan ekstra, jika user ingin mengganti password, sistem mewajibkan mereka memasukkan password lama. Lalu di belakang layar, sistem akan mencoba login ulang (signInWithPassword). Jika gagal, proses ganti password ditolak."
  if (newPassword !== "" || oldPassword !== "" || confirmPassword !== "") {
    if (newPassword !== confirmPassword) {
      alert("Password baru dan konfirmasi tidak cocok!");
      btn.innerText = "Save Changes";
      return;
    }
    if (oldPassword === "") {
      alert("Masukkan password lama Anda untuk keamanan.");
      btn.innerText = "Save Changes";
      return;
    }

    // Uji coba otentikasi ulang untuk memastikan itu benar-benar pemilik akun
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInError) {
      alert("Password lama salah! Gagal mengubah kredensial.");
      btn.innerText = "Save Changes";
      return;
    }
  }

  // --- PROSES PENGIRIMAN DATA (PAYLOAD) ---
  // Siapkan data (payload) yang mau diupdate
  let updates = { data: { full_name: newName } };
  
  // Jika ada foto baru, masukkan string Base64 ke dalam metadata
  if (base64Avatar !== "") updates.data.avatar_url = base64Avatar;
  // Jika validasi password di atas lolos, masukkan password baru ke payload
  if (newPassword !== "") updates.password = newPassword;

  // Eksekusi fungsi update ke server cloud Supabase
  const { error } = await supabase.auth.updateUser(updates);

  if (error) {
    alert("Gagal update profil: " + error.message);
  } else {
    alert("Profil berhasil diupdate!");
    location.reload(); // Refresh halaman agar UI menampilkan data terbaru
  }

  btn.innerText = "Save Changes";
});

// ==========================================
// 5. FUNGSI LOGOUT
// ==========================================
// "Menghapus sesi login secara aman dari perangkat user dengan memanggil supabase.auth.signOut(), lalu melempar user kembali ke halaman Login."
document.getElementById('logoutBtn').addEventListener('click', async function() {
  const yakin = confirm("Apakah Anda yakin ingin keluar dari sistem?");
  if (!yakin) return;
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert("Gagal logout: " + error.message);
  } else {
    window.location.href = '../login.html';
  }
});

// ==========================================
// 6. FITUR FRONT-END: LIHAT/SEMBUNYIKAN PASSWORD
// ==========================================
const toggleIcons = document.querySelectorAll('.toggle-pw');

toggleIcons.forEach(icon => {
  icon.addEventListener('click', function() {
    // Cari input password yang ada di sebelah ikon ini
    const input = this.previousElementSibling;
    
    // Kalau typenya password, ubah jadi text. Kalau text, balikin ke password
    if (input.type === 'password') {
      input.type = 'text';
      this.classList.remove('fa-eye-slash');
      this.classList.add('fa-eye'); // Ganti ikon jadi mata kebuka
    } else {
      input.type = 'password';
      this.classList.remove('fa-eye');
      this.classList.add('fa-eye-slash'); // Ganti ikon jadi mata kecoret
    }
  });
});

// Eksekusi fungsi load data saat script berhasil dibaca browser
loadProfile();
