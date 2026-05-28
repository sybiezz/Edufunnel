import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ==========================================
// 1. KONEKSI SUPABASE DATABASE
// ==========================================
// " Penghubung antara Front-End web dengan Back-End Supabase di cloud. Menggunakan URL endpoint dan Anon Key."
const supabaseUrl = 'https://afaocnqvmvhkxpomefct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYW9jbnF2bXZoa3hwb21lZmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjE3MDAsImV4cCI6MjA5NDEzNzcwMH0.0on2ooeQbsO2BfTkec3nCL7t-mKcyWd1Z9Xo9htbygg';
const supabase = createClient(supabaseUrl, supabaseKey);

let allRawData = [];
let funnelChartInstance = null;
let conversionChartInstance = null; 
let analysisChartInstance = null; 
let perfChart2024 = null;
let perfChart2025 = null;

// ==========================================
// 2. INITIALIZATION CONTROLLER
// ==========================================
//" Fungsi initDashboard ini otomatis jalan pertama kali web dibuka. Tugasnya mengecek sesi login, sinkronisasi foto profil, dan menarik semua data awal dari tabel admissions."
async function initDashboard() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { window.location.href = '/login'; return; }

  // Sync Data Profil User di Navbar
  const profileName = document.querySelector('.profile span');
  const profileImg = document.querySelector('.profile img');
  if (profileName && user.user_metadata?.full_name) profileName.innerText = user.user_metadata.full_name;
  if (profileImg && user.user_metadata?.avatar_url) profileImg.src = user.user_metadata.avatar_url;

  // Ambil Data Mentah dari Tabel Supabase
  const { data: admissions, error } = await supabase.from('admissions').select('*');
  if (error) { console.error("Gagal memuat data Supabase:", error); return; }

  allRawData = admissions;

  // Event Listeners pada Komponen Dropdown Filter Interaktif
  // " Ini adalah sensor. Kalau user mengubah dropdown filter tahun atau traffic, sistem akan mendeteksinya dan memanggil fungsi triggerFilterPipeline."
  const sourceFilter = document.getElementById('sourceFilter');
  const yearFilter = document.getElementById('yearFilter');
  
  if (sourceFilter) sourceFilter.addEventListener('change', triggerFilterPipeline);
  if (yearFilter) yearFilter.addEventListener('change', triggerFilterPipeline);

  // Jalankan pipeline penyaringan pertama kali halaman dibuka
  triggerFilterPipeline();
  
  // (DINONAKTIFKAN) - Karena sekarang growth dihitung dinamis, bukan ditarik statis.
  // loadDashboardStats();
}


  // FITUR EKSPOR DATA EXCEL (SINKRON DENGAN LIST DATA)
  // " Ini fitur untuk mengonversi data JSON dari database menjadi format file Excel (XLSX) menggunakan library SheetsJS, dengan fallback otomatis ke format CSV jika library gagal dimuat."
  const exportBtn = document.querySelector('.export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      // Pastikan ada data yang bisa diekspor
      if (!allRawData || allRawData.length === 0) {
        alert("Data mentah kosong, gagal mengekspor report!");
        return;
      }

      try {
        // Cek apakah library XLSX (SheetsJS) sudah ter-load di browser
        if (typeof XLSX !== 'undefined') {
          // Buat lembar kerja baru dari array data mentah database
          const worksheet = XLSX.utils.json_to_sheet(allRawData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Admissions Report");
          
          // Cetak dan download otomatis menjadi file excel
          XLSX.writeFile(workbook, "Admissions_Pro_Report.xlsx");
        } else {
          // Alternatif fallback jika tidak pakai library XLSX: Menggunakan format CSV standar
          let csvContent = "data:text/csv;charset=utf-8,";
          
          // Ambil header kolom otomatis dari data object Supabase
          const headers = Object.keys(allRawData[0]).join(",");
          csvContent += headers + "\r\n";
          
          // Loop data untuk mengisi baris Excel CSV
          allRawData.forEach(row => {
            const rowData = Object.values(row).map(val => `"${val}"`).join(",");
            csvContent += rowData + "\r\n";
          });
          
          // Trigger download link bayangan di DOM browser
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", "Admissions_Pro_Report.csv");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (err) {
        console.error("Gagal mengekspor file:", err);
        alert("Sistem error saat mencoba mendownload laporan.");
      }
    });
  }

// Pipeline utama penyaringan objek JSON sebelum dikirim ke kanvas grafik
// "Ini adalah fungsi filtering utama. Cara kerjanya menggunakan metode array .filter() dari JavaScript murni untuk menyaring data berdasarkan pilihan dropdown, lalu dikirim ke fungsi pembuat grafik."
function triggerFilterPipeline() {
  let filteredArray = [...allRawData];

  // Saring objek JSON berdasarkan Dropdown Tahun
  const yearVal = document.getElementById('yearFilter')?.value;
  if (yearVal) {
    filteredArray = filteredArray.filter(row => row.tahun == yearVal);
  }

  // Saring objek JSON berdasarkan Dropdown Sumber Trafik
  const sourceVal = document.getElementById('sourceFilter')?.value.toLowerCase();
  if (sourceVal && sourceVal !== "all") {
    if (sourceVal === "instagram") {
      filteredArray = filteredArray.filter(row => row.sumber_trafik === "Instagram Ads");
    } else if (sourceVal === "tiktok") {
      filteredArray = filteredArray.filter(row => row.sumber_trafik === "Tiktok Ads");
    }
  }

  updateChartsAndCards(filteredArray);
}

// ==========================================================
// 3. FUNGSI LOGIKA INTI: updateChart (TUGAS FRONT END & SE)
// ==========================================================
function updateChartsAndCards(filteredData) {
  // --- A. HITUNG METRICS UTAMA (CARDS) ---
  const totalVisitors = filteredData.length;
  const igRows = filteredData.filter(row => row.sumber_trafik === 'Instagram Ads');
  const tiktokRows = filteredData.filter(row => row.sumber_trafik === 'Tiktok Ads');

  document.getElementById('visitor-count').innerText = totalVisitors;
  document.getElementById('ig-visitors').innerText = igRows.length;
  document.getElementById('tiktok-visitors').innerText = tiktokRows.length;

  // ==========================================
  // LOGIKA BARU: HITUNG GROWTH DINAMIS BERDASARKAN TAHUN
  // ==========================================
  // 1. Saring data mentah berdasarkan dropdown trafik (Instagram/TikTok/All)
  let growthData = [...allRawData];
  const currentSource = document.getElementById('sourceFilter')?.value.toLowerCase();
  
  if (currentSource && currentSource !== "all") {
    if (currentSource === "instagram") {
      growthData = growthData.filter(r => r.sumber_trafik === "Instagram Ads");
    } else if (currentSource === "tiktok") {
      growthData = growthData.filter(r => r.sumber_trafik === "Tiktok Ads");
    }
  }

  // 2. Deteksi Tahun yang sedang dipilih di Dropdown
  const selectedYearStr = document.getElementById('yearFilter')?.value;
  let targetYear = 2025; // Default jika yang dipilih adalah "All" atau kosong
  
  if (selectedYearStr && selectedYearStr !== "all") {
    targetYear = parseInt(selectedYearStr); // Ubah teks dropdown "2024" atau "2025" jadi angka
  }

  // 3. Ambil total pengunjung tahun terpilih dan tahun sebelumnya
  const currentYearTotal = growthData.filter(row => row.tahun == targetYear).length;
  const prevYearTotal = growthData.filter(row => row.tahun == (targetYear - 1)).length;
  
  const growthBadge = document.getElementById('visitor-growth');

  if (growthBadge) {
    // Pastikan data tahun sebelumnya ada sebelum dibagi, biar nggak error (dibagi nol)
    if (prevYearTotal > 0) {
      // Rumus: ((Tahun Ini - Tahun Lalu) / Tahun Lalu) * 100
      const calcGrowth = (((currentYearTotal - prevYearTotal) / prevYearTotal) * 100).toFixed(1);
      
      if (calcGrowth >= 0) {
        growthBadge.innerText = `↗ ${calcGrowth}%`;
        growthBadge.style.setProperty('background-color', '#e6fbd9', 'important'); 
        growthBadge.style.setProperty('color', '#2d8a39', 'important');           
      } else {
        growthBadge.innerText = `↘ ${Math.abs(calcGrowth)}%`;
        growthBadge.style.setProperty('background-color', '#ffe5e5', 'important'); 
        growthBadge.style.setProperty('color', '#d32f2f', 'important');           
      }
    } else {
      // Kalau data tahun sebelumnya kosong di database (misal lu pilih 2024, tapi data 2023 ga ada)
      growthBadge.innerText = "-";
      growthBadge.style.setProperty('background-color', '#f5f0fa', 'important');
      growthBadge.style.setProperty('color', '#999', 'important');
    }
  }
  // ==========================================

  // --- B. TEKNIK MEMETAKAN DATA (MAPPING JSON TO STAGES) ---
  const stage1Count = filteredData.filter(r => r.pengunjung == 1).length;
  const stage2Count = filteredData.filter(r => r.ingin_daftar == 1).length;
  const stage3Count = filteredData.filter(r => r.interview == 1).length;
  const stage4Count = filteredData.filter(r => r.daftar_ulang == 1).length;
  const stage5Count = filteredData.filter(r => r.berkuliah == 1).length;

  const pctFunnel5 = stage1Count ? ((stage5Count / stage1Count) * 100).toFixed(1) : 0;
  document.getElementById('avg-conversion').innerText = `${pctFunnel5}%`;

  // Hitung Rasio Transisi untuk chart analisis kanan
  const trans1_2 = stage1Count ? ((stage2Count / stage1Count) * 100).toFixed(1) : 0;
  const trans2_3 = stage2Count ? ((stage3Count / stage2Count) * 100).toFixed(1) : 0;
  const trans3_4 = stage3Count ? ((stage4Count / stage3Count) * 100).toFixed(1) : 0;
  const trans4_5 = stage4Count ? ((stage5Count / stage4Count) * 100).toFixed(1) : 0;

  // --- C. RENDER DIAGRAM FUNNEL PREMIUM ---
  const ctxFunnel = document.getElementById('funnelChartCanvas');
  if (ctxFunnel) {
    if (funnelChartInstance) funnelChartInstance.destroy(); 

    const canvasContext = ctxFunnel.getContext('2d');
    const funnelGradient = canvasContext.createLinearGradient(0, 0, ctxFunnel.offsetWidth || 500, 0);
    funnelGradient.addColorStop(0, '#7048ff');  
    funnelGradient.addColorStop(1, '#cf3b84');  

    const p1 = "100%";
    const p2 = stage1Count ? ((stage2Count / stage1Count) * 100).toFixed(1) + "%" : "0%";
    const p3 = stage1Count ? ((stage3Count / stage1Count) * 100).toFixed(1) + "%" : "0%";
    const p4 = stage1Count ? ((stage4Count / stage1Count) * 100).toFixed(1) + "%" : "0%";
    const p5 = stage1Count ? ((stage5Count / stage1Count) * 100).toFixed(1) + "%" : "0%";

    const percentages = [p1, p2, p3, p4, p5];
    const rawCounts = [stage1Count, stage2Count, stage3Count, stage4Count, stage5Count];

    funnelChartInstance = new Chart(canvasContext, {
      type: 'bar',
      data: {
        labels: ["1. Iklan (Ads)", "2. Ingin Mendaftar", "3. Test/Interview", "4. Daftar Ulang", "5. Berkuliah"],
        datasets: [{
          label: 'Jumlah Calon Mahasiswa',
          data: rawCounts,
          backgroundColor: funnelGradient, 
          borderRadius: 12,        
          barThickness: 45,        
        }]
      },
      options: {
        indexAxis: 'y', 
        responsive: true,
        maintainAspectRatio: false,
        categoryPercentage: 0.85, 
        barPercentage: 0.9,
        layout: { padding: { right: 50 } },
        plugins: {
          legend: { display: false }, 
          tooltip: {
            enabled: true, 
            callbacks: {
              label: function(context) {
                return ` Total: ${context.raw} siswa (${percentages[context.dataIndex]})`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, beginAtZero: true },
          y: { grid: { display: false }, ticks: { font: { family: "'Poppins', sans-serif", size: 13, weight: '500' }, color: '#333' } }
        }
      },
      plugins: [{
        id: 'funnelDataLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.getDatasetMeta(0).data.forEach((bar, index) => {
            const countVal = rawCounts[index];
            const pctVal = percentages[index];
            const textString = `${countVal}  (${pctVal})`; 
            
            ctx.save();
            ctx.fillStyle = '#444444'; 
            ctx.font = "600 13px 'SF Pro Display'";
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(textString, bar.x + 12, bar.y);
            ctx.restore();
          });
        }
      }]
    });
  }

  // --- D. RENDER CANVAS KANAN (CONVERSION & ATTRITION ANALYSIS STACKED) ---
  const ctxAnalysis = document.getElementById('analysisBarChartCanvas');
  if (ctxAnalysis) {
    if (analysisChartInstance) analysisChartInstance.destroy(); 

    const canvasContext = ctxAnalysis.getContext('2d');

    const c1 = parseFloat(trans1_2);
    const c2 = parseFloat(trans2_3);
    const c3 = parseFloat(trans3_4);
    const c4 = parseFloat(trans4_5);

    const a1 = c1 ? (100 - c1).toFixed(1) : 0;
    const a2 = c2 ? (100 - c2).toFixed(1) : 0;
    const a3 = c3 ? (100 - c3).toFixed(1) : 0;
    const a4 = c4 ? (100 - c4).toFixed(1) : 0;

    const conversionData = [c1, c2, c3, c4];
    const attritionData = [parseFloat(a1), parseFloat(a2), parseFloat(a3), parseFloat(a4)];

    // ==========================================================
    // LOGIKA AUTO-DETECT WORST DROP-OFF PER STAGE
    // ==========================================================
    // " Algoritma khusus menggunakan perulangan (looping) untuk mencari indeks array dengan nilai attrition (kegagalan) tertinggi secara otomatis."
    const worstTextElement = document.getElementById('worst-dropoff-text');
    if (worstTextElement) {
      const stageNames = [
        "Pengunjung Iklan → Ingin Daftar",
        "Ingin Daftar → Test/Interview",
        "Test/Interview → Daftar Ulang",
        "Daftar Ulang → Berkuliah"
      ];

      // Cari indeks dengan nilai attrition (kehilangan calon mahasiswa) tertinggi
      let maxAttritionIndex = 0;
      let maxAttritionValue = attritionData[0];

      for (let i = 1; i < attritionData.length; i++) {
        if (attritionData[i] > maxAttritionValue) {
          maxAttritionValue = attritionData[i];
          maxAttritionIndex = i;
        }
      }

      // Jika ada data drop-off (tidak 0), tampilkan stage terburuk + nilai persentasenya
      if (maxAttritionValue > 0) {
        worstTextElement.innerText = `${stageNames[maxAttritionIndex]} (${maxAttritionValue}%)`;
      } else {
        worstTextElement.innerText = "Tidak ada drop-off terdeteksi";
      }
    }
    // ==========================================================

    const subLabels = [
      "(Iklan to Ingin Mendaftar)",
      "(Ingin Mendaftar to Interview)",
      "(Interview to Daftar Ulang)",
      "(Daftar Ulang to Berkuliah)"
    ];

    analysisChartInstance = new Chart(canvasContext, {
      type: 'bar',
      data: {
        labels: ["Stage 1 → 2", "Stage 2 → 3", "Stage 3 → 4", "Stage 4 → 5"],
        datasets: [
          {
            label: 'Conversion Rate',
            data: conversionData,
            backgroundColor: '#6f49d8', 
            borderRadius: { topLeft: 10, bottomLeft: 10 }, 
            borderSkipped: false,
            barThickness: 24
          },
          {
            label: 'Attrition Rate',
            data: attritionData,
            backgroundColor: '#b0307c', 
            borderRadius: { topRight: 10, bottomRight: 10 }, 
            borderSkipped: false,
            barThickness: 24
          }
        ]
      },
      options: {
        indexAxis: 'y', 
        responsive: true,
        maintainAspectRatio: false,
        categoryPercentage: 0.95,
        barPercentage: 0.9,
        layout: { padding: { top: 0, right: 10 } },
        scales: {
          x: { stacked: true, display: false, max: 100 },
          y: { stacked: true, display: false }
        },
        plugins: {
          legend: { display: false }, 
          tooltip: { enabled: false }
        }
      },
      plugins: [{
        id: 'analysisCustomLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          const rightBoundary = chart.chartArea.right; 

          chart.getDatasetMeta(0).data.forEach((bar, index) => {
            const yPos = bar.y;
            const mainLabel = chart.data.labels[index];
            const subLabel = subLabels[index];
            const convText = conversionData[index] + "%";
            const attrText = attritionData[index] + "%";

            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#6f49d8';
            ctx.font = "600 13px 'SF Pro Display'";
            ctx.fillText(mainLabel, bar.x - bar.width + 2, yPos - 16); 

            const mainLabelWidth = ctx.measureText(mainLabel).width;
            ctx.fillStyle = '#666666';
            ctx.font = "400 11px 'SF Pro Display'";
            ctx.fillText(" " + subLabel, bar.x - bar.width + 2 + mainLabelWidth, yPos - 17); 
            ctx.restore();

            ctx.save();
            ctx.fillStyle = '#6f49d8';
            ctx.font = "700 13px 'SF Pro Display'";
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(convText, rightBoundary - 55, yPos - 16);
            ctx.restore();

            ctx.save();
            ctx.fillStyle = '#cf3b84';
            ctx.font = "700 13px 'SF Pro Display'";
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(attrText, rightBoundary, yPos - 16);
            ctx.restore();
          });
        }
      }]
    });
  }

// --- E. RENDER DOUGHNUT CHART ---
  const ctxDonut = document.getElementById('contributionDonutChartCanvas');
  if (ctxDonut) {
    if (conversionChartInstance) conversionChartInstance.destroy();

    const canvasContext = ctxDonut.getContext('2d');

    const igSuccess = filteredData.filter(r => r.sumber_trafik === 'Instagram Ads' && r.berkuliah == 1).length;
    const ttSuccess = filteredData.filter(r => r.sumber_trafik === 'Tiktok Ads' && r.berkuliah == 1).length;

    const totalSuccess = igSuccess + ttSuccess;
    const igContribution = totalSuccess ? ((igSuccess / totalSuccess) * 100).toFixed(1) : "0.0";
    const ttContribution = totalSuccess ? ((ttSuccess / totalSuccess) * 100).toFixed(1) : "0.0";

    const donutGradIG = canvasContext.createLinearGradient(0, 0, 0, 200);
    donutGradIG.addColorStop(0, '#cf3b84'); 
    donutGradIG.addColorStop(1, '#ff6bb5'); 

    const donutGradTT = canvasContext.createLinearGradient(0, 0, 0, 200);
    donutGradTT.addColorStop(0, '#7048ff'); 
    donutGradTT.addColorStop(1, '#9e85ff'); 

    // DETEKSI LAYAR: Sinkron dengan CSS breakpoint 1100px
    const isMobileLayout = window.innerWidth <= 1100;

    conversionChartInstance = new Chart(canvasContext, {
      type: 'doughnut', 
      data: {
        labels: [`Instagram (${igContribution}%)`, `TikTok (${ttContribution}%)`],
        datasets: [{
          data: [igSuccess, ttSuccess],
          backgroundColor: [donutGradIG, donutGradTT],
          borderWidth: 2,
          borderColor: '#ffffff', 
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '50%',
        // Jika di HP, hapus padding kanan biar chart bisa lebih besar di tengah
        layout: { padding: { top: 10, bottom: 10, left: 10, right: isMobileLayout ? 10 : 100 } },
        plugins: {
          legend: {
            display: true,
            // Jika di HP teks pindah ke bawah, jika PC di kanan
            position: isMobileLayout ? 'bottom' : 'right',
            align: 'center',
            labels: {
              boxWidth: 12,
              padding: 12,
              font: { family: "'SF Pro Display', sans-serif", size: isMobileLayout ? 14 : 18, weight: '600' },
              color: '#333'
            }
          }
        }
      }
    });

    // --- RE-SINKRONISASI DATATABLE DI SEBELAH KIRI DONUT ---
    const igTotal = allRawData.filter(r => r.sumber_trafik === 'Instagram Ads' && r.pengunjung == 1).length;
    const igRate = igTotal ? ((igSuccess / igTotal) * 100).toFixed(2) : "0.00";

    const ttTotal = allRawData.filter(r => r.sumber_trafik === 'Tiktok Ads' && r.pengunjung == 1).length;
    const ttRate = ttTotal ? ((ttSuccess / ttTotal) * 100).toFixed(2) : "0.00";

    const tableBody = document.getElementById('table-body-stats');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr><td class="instagram">Instagram Ads</td><td>${igTotal}</td><td>${igSuccess}</td><td>${igRate}%</td><td>${(100-parseFloat(igRate)).toFixed(2)}%</td></tr>
        <tr><td class="tiktok">TikTok Ads</td><td>${ttTotal}</td><td>${ttSuccess}</td><td>${ttRate}%</td><td>${(100-parseFloat(ttRate)).toFixed(2)}%</td></tr>
        <tr class="total-row"><td>Total</td><td>${igTotal+ttTotal}</td><td>${igSuccess+ttSuccess}</td><td>${((igSuccess+ttSuccess)/(igTotal+ttTotal || 1)*100).toFixed(2)}%</td><td>${(100-((igSuccess+ttSuccess)/(igTotal+ttTotal || 1)*100)).toFixed(2)}%</td></tr>
      `;
    }
  }

  // --- F. RENDER CANVAS PERFORMANCE 2024 & 2025 ---
  const sharedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 25 } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Poppins', sans-serif", size: 13, weight: '600' }, color: '#555' }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f5f0fa' },
        ticks: { font: { family: "'Poppins', sans-serif", size: 11 }, color: '#aaa' }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function(context) { return ` ${context.label}: ${context.raw} calon mahasiswa`; }
        }
      }
    }
  };

  const labelInjectorPlugin = {
    id: 'inlineValueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets[0].data.forEach((dataValue, index) => {
        const meta = chart.getDatasetMeta(0).data[index];
        ctx.save();
        ctx.fillStyle = index === 0 ? '#6f49d8' : '#cf3b84';
        ctx.font = "700 14px 'SF Pro Display'";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(dataValue, meta.x, meta.y - 8);
        ctx.restore();
      });
    }
  };

  // ==========================================
  // LOGIKA BARU: PISAHKAN DATA BERDASARKAN TAHUN
  // ==========================================
  const data2024 = growthData.filter(r => r.tahun == 2024);
  const data2025 = growthData.filter(r => r.tahun == 2025);

  // 1. CHART TAHUN 2024
  const ctx2024 = document.getElementById('perfChartCanvas2024');
  if (ctx2024) {
    if (perfChart2024) perfChart2024.destroy();
    
    // Hitung dinamis dari data2024
    const success2024 = data2024.filter(r => r.berkuliah == 1).length;
    const failure2024 = data2024.length - success2024;

    perfChart2024 = new Chart(ctx2024.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ["Failure", "Success"],
        datasets: [{
          data: [failure2024, success2024], 
          backgroundColor: ['#6f49d8', '#cf3b84'],
          borderRadius: 8,
          barThickness: 100
        }]
      },
      options: sharedChartOptions,
      plugins: [labelInjectorPlugin]
    });
  }

  // 2. CHART TAHUN 2025
  const ctx2025 = document.getElementById('perfChartCanvas2025');
  if (ctx2025) {
    if (perfChart2025) perfChart2025.destroy();

    // Hitung dinamis dari data2025
    const success2025 = data2025.filter(r => r.berkuliah == 1).length;
    const failure2025 = data2025.length - success2025;

    perfChart2025 = new Chart(ctx2025.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ["Failure", "Success"],
        datasets: [{
          data: [failure2025, success2025],
          backgroundColor: ['#6f49d8', '#cf3b84'],
          borderRadius: 8,
          barThickness: 100
        }]
      },
      options: sharedChartOptions,
      plugins: [labelInjectorPlugin]
    });
  }
}

// Jalankan inisialisasi awal modul
initDashboard();
