import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ==========================================
// 1. KONEKSI SUPABASE DATABASE
// ==========================================
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
async function initDashboard() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { window.location.href = '../login/login.html'; return; }

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
  const sourceFilter = document.getElementById('sourceFilter');
  const yearFilter = document.getElementById('yearFilter');
  
  if (sourceFilter) sourceFilter.addEventListener('change', triggerFilterPipeline);
  if (yearFilter) yearFilter.addEventListener('change', triggerFilterPipeline);

  // Jalankan pipeline penyaringan pertama kali halaman dibuka
  triggerFilterPipeline();
  
  // Panggil fungsi badge statistik secara independen
  loadDashboardStats();
}


  // FITUR EKSPOR DATA EXCEL (SINKRON DENGAN LIST DATA)
  // ==========================================
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
          // Buat lembar kerja baru dari array data mentah database lo
          const worksheet = XLSX.utils.json_to_sheet(allRawData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Admissions Report");
          
          // Cetak dan download otomatis menjadi file excel
          XLSX.writeFile(workbook, "Admissions_Pro_Report.xlsx");
        } else {
          // Alternatif fallback jika tidak pakai library XLSX: Menggunakan format CSV standar
          let csvContent = "data:text/csv;charset=utf-8,";
          
          // Ambil header kolom otomatis dari data object Supabase lo
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
            ctx.font = "600 13px 'Poppins'";
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
            ctx.font = "600 13px 'Poppins'";
            ctx.fillText(mainLabel, bar.x - bar.width + 2, yPos - 16); 

            const mainLabelWidth = ctx.measureText(mainLabel).width;
            ctx.fillStyle = '#666666';
            ctx.font = "400 11px 'Poppins'";
            ctx.fillText(" " + subLabel, bar.x - bar.width + 2 + mainLabelWidth, yPos - 17); 
            ctx.restore();

            ctx.save();
            ctx.fillStyle = '#6f49d8';
            ctx.font = "700 13px 'Poppins'";
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(convText, rightBoundary - 55, yPos - 16);
            ctx.restore();

            ctx.save();
            ctx.fillStyle = '#cf3b84';
            ctx.font = "700 13px 'Poppins'";
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
        layout: { padding: { top: 10, bottom: 10, left: 10, right: 100 } },
        plugins: {
          legend: {
            display: true,
            position: 'right',
            align: 'center',
            labels: {
              boxWidth: 12,
              padding: 12,
              font: { family: "'Poppins', sans-serif", size: 18, weight: '500' },
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
        ctx.font = "700 14px 'Poppins'";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(dataValue, meta.x, meta.y - 8);
        ctx.restore();
      });
    }
  };

  // 1. CHART TAHUN 2024
  const ctx2024 = document.getElementById('perfChartCanvas2024');
  if (ctx2024) {
    if (perfChart2024) perfChart2024.destroy();
    perfChart2024 = new Chart(ctx2024.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ["Failure", "Success"],
        datasets: [{
          data: [48, 33], 
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

    const success2025 = filteredData.filter(r => r.berkuliah == 1).length;
    const failure2025 = filteredData.length - success2025;

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

// ==========================================
// 4. ASYNC STATISTIK BADGE DARI SUPABASE (SEPARATED & FIXED)
// ==========================================
function loadDashboardStats() {
  const growthBadge = document.getElementById('visitor-growth');
  if (!growthBadge) return;

  supabase.from('dashboard_stats').select('growth').eq('id', 1).single()
    .then(({ data, error }) => {
      if (error || !data) {
        console.error("Gagal memuat data growth:", error);
        growthBadge.innerText = "0.0%";
        growthBadge.style.setProperty('background-color', '#eee', 'important');
        growthBadge.style.setProperty('color', '#666', 'important');
        return;
      }

      const growthValue = parseFloat(data.growth);

      if (growthValue >= 0) {
        growthBadge.innerText = `↗ ${growthValue}%`;
        growthBadge.style.setProperty('background-color', '#e6fbd9', 'important'); 
        growthBadge.style.setProperty('color', '#2d8a39', 'important');           
      } else {
        growthBadge.innerText = `↘ ${Math.abs(growthValue)}%`;
        growthBadge.style.setProperty('background-color', '#ffe5e5', 'important'); 
        growthBadge.style.setProperty('color', '#d32f2f', 'important');           
      }
    })
    .catch(err => {
      console.error("System error badge:", err);
      growthBadge.innerText = "Error";
    });
}

// Jalankan inisialisasi awal modul
initDashboard();