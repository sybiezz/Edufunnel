import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// KONEKSI SUPABASE
const supabaseUrl = 'https://afaocnqvmvhkxpomefct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYW9jbnF2bXZoa3hwb21lZmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjE3MDAsImV4cCI6MjA5NDEzNzcwMH0.0on2ooeQbsO2BfTkec3nCL7t-mKcyWd1Z9Xo9htbygg';
const supabase = createClient(supabaseUrl, supabaseKey);

let base64Avatar = ""; 

async function loadProfile() {
  const { data: { user }, error } = await supabase.auth.getUser();
  // Perbaikan path ke /login
  if (!user || error) { window.location.href = '/login'; return; }

  const fullName = user.user_metadata?.full_name || 'Admin';
  const avatarUrl = user.user_metadata?.avatar_url || 'https://i.pravatar.cc/150';
  
  const email = user.email;

  document.getElementById('nav-name').innerText = fullName;
  document.getElementById('nav-avatar').src = avatarUrl;
  document.getElementById('display-name').innerText = fullName;
  document.getElementById('display-email').innerText = email;
  document.getElementById('preview-avatar').src = avatarUrl;

  document.getElementById('edit-name').value = fullName;
}

// SENSOR GAMBAR KOTAK 1:1
document.getElementById('file-upload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const SIZE = 150; 
        const minSize = Math.min(img.width, img.height);
        const startX = (img.width - minSize) / 2;
        const startY = (img.height - minSize) / 2;

        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, startX, startY, minSize, minSize, 0, 0, SIZE, SIZE);

        base64Avatar = canvas.toDataURL('image/jpeg', 0.8);
        document.getElementById('preview-avatar').src = base64Avatar;
      };
      img.src = event.target.result;
    }
    reader.readAsDataURL(file);
  }
});

// FUNGSI UPDATE DATA PROFIL
document.getElementById('saveProfileBtn').addEventListener('click', async function() {
  const newName = document.getElementById('edit-name').value.trim();
  
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  const btn = this;
  btn.innerText = "Saving...";

  const { data: { user } } = await supabase.auth.getUser();

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

  let updates = { data: { full_name: newName } };
  
  if (base64Avatar !== "") updates.data.avatar_url = base64Avatar;
  if (newPassword !== "") updates.password = newPassword;

  const { error } = await supabase.auth.updateUser(updates);

  if (error) {
    alert("Gagal update profil: " + error.message);
  } else {
    alert("Profil berhasil diupdate!");
    location.reload(); 
  }

  btn.innerText = "Save Changes";
});

// FUNGSI LOGOUT
document.getElementById('logoutBtn').addEventListener('click', async function() {
  const yakin = confirm("Apakah Anda yakin ingin keluar dari sistem?");
  if (!yakin) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert("Gagal logout: " + error.message);
  } else {
    // Perbaikan path ke /login
    window.location.href = '/login';
  }
});

// --- FITUR BARU: LIHAT/SEMBUNYIKAN PASSWORD ---
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

loadProfile();
