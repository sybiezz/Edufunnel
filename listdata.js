import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ==========================================
// 1. KONEKSI SUPABASE
// ==========================================
const supabaseUrl = 'https://afaocnqvmvhkxpomefct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYW9jbnF2bXZoa3hwb21lZmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjE3MDAsImV4cCI6MjA5NDEzNzcwMH0.0on2ooeQbsO2BfTkec3nCL7t-mKcyWd1Z9Xo9htbygg';
const supabase = createClient(supabaseUrl, supabaseKey);

// WADAH GLOBAL & PENGATURAN PAGINATION
let allData = [];
let currentFilteredData = [];
let currentPage = 1;
const rowsPerPage = 15;

// ==========================================
// 2. FITUR FRONT-END (UI/UX)
// ==========================================

document.querySelectorAll('.export-btn, .filter-select').forEach(button => {
  button.addEventListener('click', function () {
    this.style.transform = 'scale(0.95)';
    setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
  });
});

// ==========================================
// 3. FITUR BACK-END (SUPABASE, FILTER, SEARCH, PAGINATION)
// ==========================================

async function initListData() {
  // Cek Login
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { window.location.href = '../login/login.html'; return; }

  // --- UBAH PROFIL DINAMIS ---
  const profileName = document.querySelector('.profile span');
  const profileImg = document.querySelector('.profile img');
  
  if (profileName && user.user_metadata?.full_name) {
    profileName.innerText = user.user_metadata.full_name;
  }
  if (profileImg && user.user_metadata?.avatar_url) {
    profileImg.src = user.user_metadata.avatar_url;
  }
  // ---------------------------

  // Tarik data SEMUA mahasiswa
  const { data: admissions, error } = await supabase
    .from('admissions')
    .select('*')
    .order('id', { ascending: true }); 

  if (error) { console.error("Gagal narik data:", error); return; }

  allData = admissions;
  
  // Render awal & Setup Filter
  setupFilters(); 
  
  // Panggil event change di filter tahun biar langsung nampilin periode 2024 pas baru buka
  const yearFilter = document.getElementById('yearFilter');
  if (yearFilter) {
    const event = new Event('change');
    yearFilter.dispatchEvent(event);
  }
}

// FUNGSI MENGGAMBAR TABEL DENGAN TANGGAL OTOMATIS
function renderTable(dataToRender) {
  const tbody = document.getElementById('table-body'); 
  if (!tbody) return;
  tbody.innerHTML = ''; 

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = dataToRender.slice(startIndex, endIndex); 

  paginatedData.forEach((row) => {
    let statusText = "Iklan (Ads)";
    let statusClass = "stage-5";

    if (row.berkuliah == 1) { statusText = "Berkuliah"; statusClass = "stage-1"; }
    else if (row.daftar_ulang == 1) { statusText = "Daftar Ulang"; statusClass = "stage-4"; }
    else if (row.interview == 1) { statusText = "Test/Interview"; statusClass = "stage-3"; }
    else if (row.ingin_daftar == 1) { statusText = "Ingin Mendaftar"; statusClass = "stage-2"; }

    const sourceClass = row.sumber_trafik === "Instagram Ads" ? "instagram" : "tiktok";
    const sourceText = row.sumber_trafik === "Instagram Ads" ? "Instagram" : "TikTok";

    // --- LOGIKA TANGGAL OTOMATIS BERDASARKAN ID & TAHUN ---
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const day = (row.id % 28) + 1; 
    const month = months[row.id % 12];
    const dummyDate = `${day} ${month} ${row.tahun}`; 
    // ------------------------------------------------------

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#AD-${String(row.id).padStart(3, '0')}</td>
      <td class="name">${row.data_pengguna}</td>
      <td>mahasiswa${row.id}@gmail.com</td> 
      <td><span class="source-badge ${sourceClass}">${sourceText}</span></td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>${dummyDate}</td>
    `;
    tbody.appendChild(tr);
  });
}

// FUNGSI MENGGAMBAR PAGINATION
function renderPagination(dataToRender) {
  const totalRows = dataToRender.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  const showingText = document.querySelector('.pagination > span');
  if (showingText) {
    const startItem = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const endItem = Math.min(currentPage * rowsPerPage, totalRows);
    showingText.innerText = `Showing ${startItem} to ${endItem} of ${totalRows} entries`;
  }

  const pageNumbersContainer = document.querySelector('.page-numbers');
  if (!pageNumbersContainer) return;
  pageNumbersContainer.innerHTML = ''; 

  const prevBtn = document.createElement('button');
  prevBtn.className = 'prev';
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  if (currentPage === 1) prevBtn.style.opacity = '0.5'; 
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable(currentFilteredData);
      renderPagination(currentFilteredData);
    }
  };
  pageNumbersContainer.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.innerText = i;
    if (i === currentPage) pageBtn.classList.add('active'); 
    
    pageBtn.onclick = () => {
      currentPage = i;
      renderTable(currentFilteredData);
      renderPagination(currentFilteredData);
    };
    pageNumbersContainer.appendChild(pageBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'next';
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  if (currentPage === totalPages || totalPages === 0) nextBtn.style.opacity = '0.5';
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable(currentFilteredData);
      renderPagination(currentFilteredData);
    }
  };
  pageNumbersContainer.appendChild(nextBtn);
}

// FUNGSI MEMBACA FILTER & SEARCH - SUDAH DIPERBAIKI (TIDAK HILANG SAAT DI-KLIK "ALL")
function setupFilters() {
  const selects = document.querySelectorAll('.filter-select');
  
  // Karena struktur HTML baru:
  // selects[0] = Sumber Trafik (value: all, instagram, tiktok)
  // selects[1] = Status Funnel (value: all, iklan, ingin_daftar, interview, daftar_ulang, berkuliah)
  // yearFilter = Dropdown Tahun (pakai ID biar aman)
  
  const sourceFilter = selects[0];
  const statusFilter = selects[1]; 
  const yearFilter = document.getElementById('yearFilter'); 
  const searchInput = document.querySelector('.search-box input');

  function applyFilter() {
    let filteredData = [...allData]; 

    // 1. Filter Tahun
    if (yearFilter) {
      const selectedYear = yearFilter.value;
      filteredData = filteredData.filter(row => row.tahun == selectedYear);
    }

    // 2. Filter Trafik
    if (sourceFilter) {
      const sourceValue = sourceFilter.value; // ex: "instagram", "tiktok", "all"
      if (sourceValue === "instagram") {
        filteredData = filteredData.filter(row => row.sumber_trafik === "Instagram Ads");
      } else if (sourceValue === "tiktok") {
        filteredData = filteredData.filter(row => row.sumber_trafik === "Tiktok Ads");
      }
      // Jika "all", maka abaikan filter ini (semua data lolos)
    }

    // 3. Filter Status Funnel
    if (statusFilter) {
      const statusValue = statusFilter.value; // ex: "iklan", "berkuliah", "all"
      
      // Jika yang dipilih BUKAN "all", barulah kita menyaring data
      if (statusValue !== "all") {
        filteredData = filteredData.filter(row => {
          // Cari status paling mentok dari pendaftar tersebut
          let highestStatus = "iklan"; 
          if (row.berkuliah == 1) highestStatus = "berkuliah";
          else if (row.daftar_ulang == 1) highestStatus = "daftar_ulang";
          else if (row.interview == 1) highestStatus = "interview";
          else if (row.ingin_daftar == 1) highestStatus = "ingin_daftar";
          
          return highestStatus === statusValue;
        });
      }
    }

    // 4. Filter Search Text
    if (searchInput) {
      const keyword = searchInput.value.toLowerCase().trim();
      if (keyword !== "") {
        filteredData = filteredData.filter(row => {
          const formatId = `#AD-${String(row.id).padStart(3, '0')}`.toLowerCase();
          const namaLengkap = row.data_pengguna.toLowerCase();
          return formatId.includes(keyword) || namaLengkap.includes(keyword);
        });
      }
    }

    currentFilteredData = filteredData;
    currentPage = 1; 
    renderTable(currentFilteredData);
    renderPagination(currentFilteredData);
  }

  if (sourceFilter) sourceFilter.addEventListener('change', applyFilter);
  if (statusFilter) statusFilter.addEventListener('change', applyFilter);
  if (yearFilter) yearFilter.addEventListener('change', applyFilter);
  if (searchInput) searchInput.addEventListener('input', applyFilter); 
}

initListData();

// --- FITUR SINKRONISASI PROFIL DI NAVBAR ---
async function loadNavbarProfile() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (user && !error) {
    const fullName = user.user_metadata?.full_name || 'Admin';
    const avatarUrl = user.user_metadata?.avatar_url || 'https://i.pravatar.cc/150';
    
    const navName = document.getElementById('nav-name');
    const navAvatar = document.getElementById('nav-avatar');

    if (navName) navName.innerText = fullName;
    if (navAvatar) navAvatar.src = avatarUrl;
  }
}

loadNavbarProfile();

// --- FITUR EXPORT REPORT LIST DATA ---
const exportBtnListData = document.querySelector('.export-btn');

if (exportBtnListData) {
  exportBtnListData.addEventListener('click', function() {
    const table = document.querySelector('table'); 
    
    if (!table) {
      alert('Tabel data tidak ditemukan!');
      return;
    }

    let csvContent = "";
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(function(row) {
      const cols = row.querySelectorAll('th, td');
      const rowData = [];
      
      cols.forEach(function(col) {
        let data = col.innerText.replace(/(\r\n|\n|\r)/gm, "").trim();
        rowData.push('"' + data + '"');
      });
      
      csvContent += rowData.join(",") + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", "Data_Pendaftar_Admissions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}