// State Management
let currentLaporan = [];
let selectedLaporan = null;
let searchDebounceTimer = null;

const filterState = {
  search: '',
  tipe: 'semua',
  kategori: 'semua',
  status: 'semua',
  sort: 'terbaru'
};

// Category Icon & Color Mapping
const categoryMeta = {
  'Dokumen/Kartu': { icon: 'fa-id-card', color: 'text-amber-600', bg: 'bg-amber-100' },
  'Elektronik': { icon: 'fa-laptop', color: 'text-blue-600', bg: 'bg-blue-100' },
  'Kunci': { icon: 'fa-key', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  'Pakaian/Aksesoris': { icon: 'fa-shirt', color: 'text-rose-600', bg: 'bg-rose-100' },
  'Tas/Dompet': { icon: 'fa-wallet', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  'Alat Tulis/Buku': { icon: 'fa-book-open', color: 'text-violet-600', bg: 'bg-violet-100' },
  'Lainnya': { icon: 'fa-box', color: 'text-slate-600', bg: 'bg-slate-100' }
};

// Format Date Utility
function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const month = monthNames[parseInt(parts[1], 10) - 1];
      const day = parseInt(parts[2], 10);
      return `${day} ${month} ${year}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

// Format Phone for WhatsApp Link
function formatWaNumber(phone) {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
}

// Format Jam Utility
function formatWaktu(waktuStr) {
  if (!waktuStr || waktuStr === '-') return '';
  const clean = String(waktuStr).trim();
  if (/^\d{1,2}$/.test(clean)) {
    const pad = clean.padStart(2, '0');
    return `(Jam ${pad}:00 WIB)`;
  }
  return `(${clean})`;
}

// DOM Elements
const itemsGrid = document.getElementById('itemsGrid');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const labelItemCount = document.getElementById('labelItemCount');

const searchInput = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');
const filterKategori = document.getElementById('filterKategori');
const filterStatus = document.getElementById('filterStatus');
const filterSort = document.getElementById('filterSort');
const btnResetFilter = document.getElementById('btnResetFilter');
const filterTipeButtons = document.querySelectorAll('.filter-tipe-btn');

// Modal Elements
const modalLaporBaru = document.getElementById('modalLaporBaru');
const btnOpenModalLapor = document.getElementById('btnOpenModalLapor');
const btnCloseModalLapor = document.getElementById('btnCloseModalLapor');
const btnCancelModalLapor = document.getElementById('btnCancelModalLapor');
const formLaporBaru = document.getElementById('formLaporBaru');
const fotoInput = document.getElementById('fotoInput');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const btnRemoveImage = document.getElementById('btnRemoveImage');
const inputLokasi = document.getElementById('inputLokasi');
const inputTanggalKejadian = document.getElementById('inputTanggalKejadian');

// Modal Detail Elements
const modalDetail = document.getElementById('modalDetail');
const btnCloseModalDetail = document.getElementById('btnCloseModalDetail');
const btnHubungiWA = document.getElementById('btnHubungiWA');
const btnToggleStatus = document.getElementById('btnToggleStatus');
const btnToggleStatusText = document.getElementById('btnToggleStatusText');
const btnHapusLaporan = document.getElementById('btnHapusLaporan');
const btnEditLaporan = document.getElementById('btnEditLaporan');

// Modal Edit Elements
const modalEditLaporan = document.getElementById('modalEditLaporan');
const btnCloseModalEdit = document.getElementById('btnCloseModalEdit');
const btnCancelModalEdit = document.getElementById('btnCancelModalEdit');
const formEditLaporan = document.getElementById('formEditLaporan');
const editLabelId = document.getElementById('editLabelId');
const editTipeKehilangan = document.getElementById('editTipeKehilangan');
const editTipeDitemukan = document.getElementById('editTipeDitemukan');
const editInputJudul = document.getElementById('editInputJudul');
const editInputKategori = document.getElementById('editInputKategori');
const editInputLokasi = document.getElementById('editInputLokasi');
const editInputTanggalKejadian = document.getElementById('editInputTanggalKejadian');
const editInputWaktuKejadian = document.getElementById('editInputWaktuKejadian');
const editInputDeskripsi = document.getElementById('editInputDeskripsi');
const editInputNamaPelapor = document.getElementById('editInputNamaPelapor');
const editInputIdentitasPelapor = document.getElementById('editInputIdentitasPelapor');
const editInputKontakPelapor = document.getElementById('editInputKontakPelapor');
const editInputHapusFoto = document.getElementById('editInputHapusFoto');
const editFotoCurrentContainer = document.getElementById('editFotoCurrentContainer');
const editFotoCurrentImg = document.getElementById('editFotoCurrentImg');
const btnHapusFotoSaatIni = document.getElementById('btnHapusFotoSaatIni');
const editFotoInput = document.getElementById('editFotoInput');
const editUploadPlaceholder = document.getElementById('editUploadPlaceholder');
const editImagePreviewContainer = document.getElementById('editImagePreviewContainer');
const editImagePreview = document.getElementById('editImagePreview');
const btnRemoveEditImage = document.getElementById('btnRemoveEditImage');

// Modal Klaim Elements
const modalKlaim = document.getElementById('modalKlaim');
const btnBatalKlaim = document.getElementById('btnBatalKlaim');
const btnSimpanKlaim = document.getElementById('btnSimpanKlaim');
const inputCatatanKlaim = document.getElementById('inputCatatanKlaim');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Set default date input ke hari ini
  if (inputTanggalKejadian) {
    const today = new Date().toISOString().split('T')[0];
    inputTanggalKejadian.value = today;
  }

  // Load Data awal
  fetchStats();
  fetchLaporan();

  // Attach Event Listeners
  initEventListeners();
});

// Modal Helper Functions (Mengunci scroll background body saat modal aktif di HP)
function openModal(modal) {
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add('hidden');
  const anyModalOpen = [modalLaporBaru, modalDetail, modalKlaim, modalEditLaporan].some(m => m && !m.classList.contains('hidden'));
  if (!anyModalOpen) {
    document.body.classList.remove('overflow-hidden');
  }
}

// Event Listeners Initialization
function initEventListeners() {
  // Modal Lapor Open / Close
  btnOpenModalLapor.addEventListener('click', () => {
    formLaporBaru.reset();
    resetImagePreview();
    if (inputTanggalKejadian) {
      inputTanggalKejadian.value = new Date().toISOString().split('T')[0];
    }
    const scrollable = document.getElementById('scrollableFormBody');
    if (scrollable) scrollable.scrollTop = 0;
    openModal(modalLaporBaru);
  });

  btnCloseModalLapor.addEventListener('click', () => closeModal(modalLaporBaru));
  btnCancelModalLapor.addEventListener('click', () => closeModal(modalLaporBaru));

  // Quick Location buttons
  document.querySelectorAll('.btn-quick-lokasi').forEach(btn => {
    btn.addEventListener('click', () => {
      inputLokasi.value = btn.textContent.trim();
    });
  });

  // Image Upload Preview
  fotoInput.addEventListener('change', handleImageSelection);
  btnRemoveImage.addEventListener('click', resetImagePreview);

  // Form Submit
  formLaporBaru.addEventListener('submit', handleFormSubmit);

  // Modal Detail Close
  btnCloseModalDetail.addEventListener('click', () => closeModal(modalDetail));

  // Search Input with Debounce
  searchInput.addEventListener('input', (e) => {
    filterState.search = e.target.value.trim();
    if (filterState.search.length > 0) {
      btnClearSearch.classList.remove('hidden');
    } else {
      btnClearSearch.classList.add('hidden');
    }

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      fetchLaporan();
    }, 300);
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    filterState.search = '';
    btnClearSearch.classList.add('hidden');
    fetchLaporan();
  });

  // Tipe Filter Buttons
  filterTipeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterTipeButtons.forEach(b => {
        b.classList.remove('bg-white', 'shadow-sm', 'font-bold', 'text-slate-900');
        b.classList.add('text-slate-600');
      });
      btn.classList.add('bg-white', 'shadow-sm', 'font-bold', 'text-slate-900');
      btn.classList.remove('text-slate-600');

      filterState.tipe = btn.getAttribute('data-tipe');
      fetchLaporan();
    });
  });

  // Dropdown Filters
  filterKategori.addEventListener('change', (e) => {
    filterState.kategori = e.target.value;
    fetchLaporan();
  });

  filterStatus.addEventListener('change', (e) => {
    filterState.status = e.target.value;
    fetchLaporan();
  });

  filterSort.addEventListener('change', (e) => {
    filterState.sort = e.target.value;
    fetchLaporan();
  });

  // Reset Filter Button
  btnResetFilter.addEventListener('click', () => {
    filterState.search = '';
    filterState.tipe = 'semua';
    filterState.kategori = 'semua';
    filterState.status = 'semua';
    filterState.sort = 'terbaru';

    searchInput.value = '';
    btnClearSearch.classList.add('hidden');
    filterKategori.value = 'semua';
    filterStatus.value = 'semua';
    filterSort.value = 'terbaru';

    filterTipeButtons.forEach(b => {
      if (b.getAttribute('data-tipe') === 'semua') {
        b.classList.add('bg-white', 'shadow-sm', 'font-bold', 'text-slate-900');
        b.classList.remove('text-slate-600');
      } else {
        b.classList.remove('bg-white', 'shadow-sm', 'font-bold', 'text-slate-900');
        b.classList.add('text-slate-600');
      }
    });

    fetchLaporan();
  });

  // Detail Modal Actions
  btnToggleStatus.addEventListener('click', handleToggleStatusClick);
  btnHapusLaporan.addEventListener('click', handleDeleteLaporan);
  btnEditLaporan.addEventListener('click', openEditModal);

  // Modal Edit Handlers
  btnCloseModalEdit.addEventListener('click', () => closeModal(modalEditLaporan));
  btnCancelModalEdit.addEventListener('click', () => closeModal(modalEditLaporan));

  document.querySelectorAll('.btn-quick-lokasi-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      editInputLokasi.value = btn.textContent.trim();
    });
  });

  editFotoInput.addEventListener('change', handleEditImageSelection);
  btnRemoveEditImage.addEventListener('click', resetEditImageSelection);

  btnHapusFotoSaatIni.addEventListener('click', () => {
    editInputHapusFoto.value = 'true';
    editFotoCurrentContainer.classList.add('hidden');
    Swal.fire({
      icon: 'info',
      title: 'Foto Ditandai Dihapus',
      text: 'Foto lama akan dihapus ketika Anda menyimpan perubahan.',
      timer: 1600,
      showConfirmButton: false
    });
  });

  formEditLaporan.addEventListener('submit', handleEditFormSubmit);

  // Modal Klaim Buttons
  btnBatalKlaim.addEventListener('click', () => closeModal(modalKlaim));
  btnSimpanKlaim.addEventListener('click', handleSimpanKlaim);

  // Close modals on backdrop click
  [modalLaporBaru, modalDetail, modalKlaim, modalEditLaporan].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Auto-Sync Realtime: Sinkronisasi berkala setiap 8 detik
  // Memastikan jika ada pengguna lain yang menambah laporan atau mengubah status, halaman selalu up-to-date
  setInterval(() => {
    // Hanya sync jika modal form tidak sedang terbuka dan pengguna tidak sedang mengetik di kotak pencarian
    const isModalOpen = !modalLaporBaru.classList.contains('hidden') || 
                        !modalDetail.classList.contains('hidden') || 
                        !modalKlaim.classList.contains('hidden') || 
                        !modalEditLaporan.classList.contains('hidden');
    const isSearching = document.activeElement === searchInput;
    if (!isModalOpen && !isSearching) {
      fetchStats();
      fetchLaporan();
    }
  }, 8000);
}

// Handle Image Selection
function handleImageSelection(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    Swal.fire({
      icon: 'warning',
      title: 'Ukuran Terlalu Besar',
      text: 'Ukuran foto maksimal adalah 5MB!'
    });
    fotoInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    imagePreview.src = event.target.result;
    imagePreviewContainer.classList.remove('hidden');
    uploadPlaceholder.classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function resetImagePreview() {
  fotoInput.value = '';
  imagePreview.src = '';
  imagePreviewContainer.classList.add('hidden');
  uploadPlaceholder.classList.remove('hidden');
}

// Fetch Statistics
async function fetchStats() {
  try {
    const res = await fetch('/api/laporan/stats');
    const json = await res.json();
    if (json.success) {
      document.getElementById('statTotal').textContent = json.data.total;
      document.getElementById('statKehilangan').textContent = json.data.kehilangan;
      document.getElementById('statDitemukan').textContent = json.data.ditemukan;
      document.getElementById('statSelesai').textContent = json.data.selesai;
    }
  } catch (error) {
    console.error('Error memuat statistik:', error);
  }
}

// Fetch Laporan Items
async function fetchLaporan() {
  loadingState.classList.remove('hidden');
  itemsGrid.innerHTML = '';
  emptyState.classList.add('hidden');

  try {
    const params = new URLSearchParams();
    if (filterState.search) params.append('search', filterState.search);
    if (filterState.tipe !== 'semua') params.append('tipe', filterState.tipe);
    if (filterState.kategori !== 'semua') params.append('kategori', filterState.kategori);
    if (filterState.status !== 'semua') params.append('status', filterState.status);
    if (filterState.sort) params.append('sort', filterState.sort);

    const res = await fetch(`/api/laporan?${params.toString()}`);
    const json = await res.json();

    loadingState.classList.add('hidden');

    if (json.success) {
      currentLaporan = json.data;
      labelItemCount.textContent = `${json.data.length} barang`;

      if (json.data.length === 0) {
        emptyState.classList.remove('hidden');
      } else {
        renderCards(json.data);
      }
    }
  } catch (error) {
    loadingState.classList.add('hidden');
    console.error('Error memuat laporan:', error);
    Swal.fire({
      icon: 'error',
      title: 'Koneksi Terganggu',
      text: 'Gagal memuat data dari server. Pastikan server Node.js sedang berjalan.'
    });
  }
}

// Render Cards to Grid
function renderCards(items) {
  itemsGrid.innerHTML = '';

  items.forEach(item => {
    const isLost = item.tipe === 'kehilangan';
    const isDone = item.status === 'selesai';
    const cat = categoryMeta[item.kategori] || categoryMeta['Lainnya'];

    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm card-hover flex flex-col justify-between';

    // Image or Category Placeholder Header
    let photoHeader = '';
    if (item.foto) {
      photoHeader = `
        <div class="h-48 w-full bg-slate-100 overflow-hidden relative cursor-pointer group" onclick="openDetailModal('${item.id}')">
          <img src="${item.foto}" alt="${item.judul}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 text-white text-xs font-semibold">
            <span><i class="fa-solid fa-expand mr-1"></i> Klik untuk melihat detail</span>
          </div>
        </div>
      `;
    } else {
      photoHeader = `
        <div class="h-40 w-full ${cat.bg} flex flex-col items-center justify-center p-4 cursor-pointer relative group" onclick="openDetailModal('${item.id}')">
          <div class="w-16 h-16 rounded-2xl bg-white/70 shadow-sm flex items-center justify-center ${cat.color} text-3xl group-hover:scale-110 transition-transform">
            <i class="fa-solid ${cat.icon}"></i>
          </div>
          <span class="text-xs font-bold ${cat.color} mt-2 tracking-wide">${item.kategori}</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div>
        ${photoHeader}
        
        <div class="p-5">
          <!-- Badges Bar -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${
              isLost ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }">
              <i class="fa-solid ${isLost ? 'fa-magnifying-glass' : 'fa-hand-holding'} mr-1"></i>
              ${isLost ? 'Kehilangan' : 'Ditemukan'}
            </span>

            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isDone ? 'bg-slate-100 text-slate-600 border border-slate-300' : 'bg-amber-100 text-amber-800 border border-amber-200'
            }">
              ${isDone ? '<i class="fa-solid fa-check mr-1 text-emerald-600"></i>Selesai / Diklaim' : '<i class="fa-solid fa-clock mr-1"></i>Aktif'}
            </span>
          </div>

          <!-- Judul Barang -->
          <h3 class="text-sm sm:text-base font-extrabold text-slate-900 hover:text-[#7C2A8A] cursor-pointer line-clamp-2 transition-colors mb-2" onclick="openDetailModal('${item.id}')">
            ${item.judul}
          </h3>

          <!-- Lokasi & Tanggal -->
          <div class="space-y-1.5 text-xs text-slate-500 mb-3">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-location-dot text-rose-500 w-4 text-center shrink-0"></i>
              <span class="font-medium text-slate-700 line-clamp-1">${item.lokasi}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-calendar-days text-[#7C2A8A] w-4 text-center shrink-0"></i>
              <span class="truncate">${formatDateIndo(item.tanggalKejadian)} ${formatWaktu(item.waktuKejadian)}</span>
            </div>
          </div>

          <!-- Deskripsi Singkat -->
          <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            ${item.deskripsi}
          </p>
        </div>
      </div>

      <!-- Card Footer -->
      <div class="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <div class="text-[11px] text-slate-500 min-w-0">
          <span class="font-semibold text-slate-700 block truncate">${item.namaPelapor}</span>
          <span class="text-slate-400 font-mono text-[10px] sm:text-[11px] truncate block">${item.identitasPelapor ? 'NIM: ' + item.identitasPelapor : 'Civitas Kampus'}</span>
        </div>

        <button onclick="openDetailModal('${item.id}')" class="shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#7C2A8A] hover:bg-[#682074] active:bg-[#53185D] text-white rounded-xl text-xs font-bold transition-all shadow-sm">
          Detail & Kontak
        </button>
      </div>
    `;

    itemsGrid.appendChild(card);
  });
}

// Open Detail Modal
function openDetailModal(id) {
  const item = currentLaporan.find(l => l.id === id);
  if (!item) return;

  const scrollableDetail = document.getElementById('scrollableDetailBody');
  if (scrollableDetail) scrollableDetail.scrollTop = 0;

  selectedLaporan = item;
  const isLost = item.tipe === 'kehilangan';
  const isDone = item.status === 'selesai';

  // Badges
  const badgeTipe = document.getElementById('detailBadgeTipe');
  badgeTipe.textContent = isLost ? 'Kehilangan' : 'Ditemukan';
  badgeTipe.className = `px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
    isLost ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
  }`;

  const badgeStatus = document.getElementById('detailBadgeStatus');
  badgeStatus.textContent = isDone ? 'Selesai / Sudah Dikembalikan' : 'Sedang Aktif Dicari';
  badgeStatus.className = `px-3 py-1 rounded-full text-xs font-semibold ${
    isDone ? 'bg-slate-700 text-white' : 'bg-amber-400 text-slate-900'
  }`;

  // Foto
  const fotoContainer = document.getElementById('detailFotoContainer');
  const fotoImg = document.getElementById('detailFoto');
  if (item.foto) {
    fotoImg.src = item.foto;
    fotoContainer.classList.remove('hidden');
  } else {
    fotoContainer.classList.add('hidden');
  }

  // Info Text
  document.getElementById('detailId').textContent = item.id;
  document.getElementById('detailKategori').textContent = item.kategori;
  document.getElementById('detailJudul').textContent = item.judul;
  document.getElementById('detailLokasi').textContent = item.lokasi;
  document.getElementById('detailWaktu').textContent = `${formatDateIndo(item.tanggalKejadian)} ${formatWaktu(item.waktuKejadian) || '-'}`;
  document.getElementById('detailDeskripsi').textContent = item.deskripsi;

  // Catatan Klaim
  const containerKlaim = document.getElementById('detailContainerKlaim');
  const detailCatatanKlaim = document.getElementById('detailCatatanKlaim');
  if (isDone && item.catatanKlaim) {
    detailCatatanKlaim.textContent = item.catatanKlaim;
    containerKlaim.classList.remove('hidden');
  } else {
    containerKlaim.classList.add('hidden');
  }

  // Kontak Pelapor
  document.getElementById('detailNamaPelapor').textContent = item.namaPelapor;
  document.getElementById('detailIdentitasPelapor').textContent = item.identitasPelapor ? `NIM/NIP: ${item.identitasPelapor}` : '';

  // WhatsApp Link Builder
  const waNumber = formatWaNumber(item.kontakPelapor);
  let waMessage = '';
  if (isLost) {
    waMessage = `Halo ${item.namaPelapor}, saya melihat laporan Anda di Portal Lost & Found Kampus mengenai kehilangan: *${item.judul}* (ID: ${item.id}). Saya ingin berbagi informasi mengenai barang tersebut.`;
  } else {
    waMessage = `Halo ${item.namaPelapor}, saya melihat laporan temuan barang Anda di Portal Lost & Found Kampus mengenai: *${item.judul}* (ID: ${item.id}). Saya ingin mengonfirmasi terkait barang tersebut.`;
  }
  btnHubungiWA.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  // Tombol Toggle Status
  if (isDone) {
    btnToggleStatusText.textContent = 'Aktifkan Kembali';
    btnToggleStatus.className = 'w-full sm:w-auto justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm';
  } else {
    btnToggleStatusText.textContent = 'Tandai Selesai / Dikembalikan';
    btnToggleStatus.className = 'w-full sm:w-auto justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm';
  }

  openModal(modalDetail);
}

// Handle Form Submit
async function handleFormSubmit(e) {
  e.preventDefault();

  const formData = new FormData(formLaporBaru);

  // Validasi integer client-side
  const kontak = (formData.get('kontakPelapor') || '').trim();
  if (!/^\d+$/.test(kontak)) {
    Swal.fire({
      icon: 'warning',
      title: 'Nomor WhatsApp Tidak Valid',
      text: 'Nomor WhatsApp / HP hanya boleh berupa angka (integer)!'
    });
    return;
  }

  const nim = (formData.get('identitasPelapor') || '').trim();
  if (nim && !/^\d+$/.test(nim)) {
    Swal.fire({
      icon: 'warning',
      title: 'NIM Tidak Valid',
      text: 'NIM / NIP / ID Kampus hanya boleh berupa angka (integer)!'
    });
    return;
  }

  const jam = (formData.get('waktuKejadian') || '').trim();
  if (jam && jam !== '-') {
    const jamNum = parseInt(jam, 10);
    if (!/^\d+$/.test(jam) || isNaN(jamNum) || jamNum < 0 || jamNum > 23) {
      Swal.fire({
        icon: 'warning',
        title: 'Perkiraan Jam Tidak Valid',
        text: 'Perkiraan jam harus berupa angka bulat antara 0 sampai 23 (contoh: 14)!'
      });
      return;
    }
  }

  const btnSubmit = document.getElementById('btnSubmitLapor');
  const originalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...`;

  try {
    const res = await fetch('/api/laporan', {
      method: 'POST',
      body: formData
    });

    const json = await res.json();

    if (json.success) {
      closeModal(modalLaporBaru);
      formLaporBaru.reset();
      resetImagePreview();

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Dipublikasikan!',
        text: 'Laporan Anda telah tercatat dan tersimpan ke file laporan.json.',
        timer: 2000,
        showConfirmButton: false
      });

      fetchStats();
      fetchLaporan();
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: json.message || 'Terjadi kesalahan saat memproses laporan.'
      });
    }
  } catch (error) {
    console.error('Error submit form:', error);
    Swal.fire({
      icon: 'error',
      title: 'Kesalahan Server',
      text: 'Tidak dapat menghubungi server backend Node.js.'
    });
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = originalText;
  }
}

// Handle Toggle Status Click
function handleToggleStatusClick() {
  if (!selectedLaporan) return;

  if (selectedLaporan.status === 'aktif') {
    // Buka modal klaim untuk catatan serah terima
    inputCatatanKlaim.value = '';
    openModal(modalKlaim);
  } else {
    // Konfirmasi aktifkan kembali
    Swal.fire({
      title: 'Aktifkan Kembali Laporan?',
      text: 'Laporan ini akan kembali ditandai sebagai aktif dicari di portal.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7C2A8A',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Aktifkan Kembali',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await patchStatus(selectedLaporan.id, 'aktif', '');
      }
    });
  }
}

// Handle Simpan Klaim
async function handleSimpanKlaim() {
  if (!selectedLaporan) return;
  const catatan = inputCatatanKlaim.value.trim();
  closeModal(modalKlaim);
  await patchStatus(selectedLaporan.id, 'selesai', catatan || 'Barang telah berhasil diserahkan/diklaim oleh pemilik yang sah.');
}

// PATCH Status ke API
async function patchStatus(id, newStatus, catatanKlaim) {
  try {
    const res = await fetch(`/api/laporan/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, catatanKlaim })
    });

    const json = await res.json();
    if (json.success) {
      closeModal(modalDetail);

      Swal.fire({
        icon: 'success',
        title: 'Status Diperbarui',
        text: json.message,
        timer: 1500,
        showConfirmButton: false
      });

      fetchStats();
      fetchLaporan();
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: json.message
      });
    }
  } catch (error) {
    console.error('Error updating status:', error);
    Swal.fire({
      icon: 'error',
      title: 'Kesalahan Server',
      text: 'Gagal memperbarui status ke laporan.json'
    });
  }
}

// Handle Delete Laporan
function handleDeleteLaporan() {
  if (!selectedLaporan) return;

  Swal.fire({
    title: 'Hapus Laporan Ini?',
    text: `Laporan "${selectedLaporan.judul}" akan dihapus permanen dari file laporan.json!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus Sekarang',
    cancelButtonText: 'Batal'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/laporan/${selectedLaporan.id}`, {
          method: 'DELETE'
        });
        const json = await res.json();

        if (json.success) {
          closeModal(modalDetail);
          Swal.fire({
            icon: 'success',
            title: 'Terhapus',
            text: 'Laporan berhasil dihapus dari sistem.',
            timer: 1500,
            showConfirmButton: false
          });

          fetchStats();
          fetchLaporan();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus',
            text: json.message
          });
        }
      } catch (error) {
        console.error('Error delete:', error);
        Swal.fire({
          icon: 'error',
          title: 'Kesalahan Server',
          text: 'Gagal menghapus laporan.'
        });
      }
    }
  });
}

// Open Edit Modal
function openEditModal() {
  if (!selectedLaporan) return;

  editLabelId.textContent = selectedLaporan.id;
  if (selectedLaporan.tipe === 'kehilangan') {
    editTipeKehilangan.checked = true;
  } else {
    editTipeDitemukan.checked = true;
  }

  editInputJudul.value = selectedLaporan.judul;
  editInputKategori.value = selectedLaporan.kategori;
  editInputLokasi.value = selectedLaporan.lokasi;
  editInputTanggalKejadian.value = selectedLaporan.tanggalKejadian;
  editInputWaktuKejadian.value = selectedLaporan.waktuKejadian === '-' ? '' : String(selectedLaporan.waktuKejadian).replace(/\D/g, '').slice(0, 2);
  editInputDeskripsi.value = selectedLaporan.deskripsi;
  editInputNamaPelapor.value = selectedLaporan.namaPelapor;
  editInputIdentitasPelapor.value = (selectedLaporan.identitasPelapor || '').replace(/\D/g, '');
  editInputKontakPelapor.value = (selectedLaporan.kontakPelapor || '').replace(/\D/g, '');

  // Foto handling
  editInputHapusFoto.value = 'false';
  resetEditImageSelection();

  if (selectedLaporan.foto) {
    editFotoCurrentImg.src = selectedLaporan.foto;
    editFotoCurrentContainer.classList.remove('hidden');
  } else {
    editFotoCurrentContainer.classList.add('hidden');
  }

  closeModal(modalDetail);
  const scrollable = document.getElementById('scrollableEditBody');
  if (scrollable) scrollable.scrollTop = 0;
  openModal(modalEditLaporan);
}

function handleEditImageSelection(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    Swal.fire({
      icon: 'warning',
      title: 'Ukuran Terlalu Besar',
      text: 'Ukuran foto maksimal adalah 5MB!'
    });
    editFotoInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    editImagePreview.src = event.target.result;
    editImagePreviewContainer.classList.remove('hidden');
    editUploadPlaceholder.classList.add('hidden');
    editInputHapusFoto.value = 'false';
  };
  reader.readAsDataURL(file);
}

function resetEditImageSelection() {
  editFotoInput.value = '';
  editImagePreview.src = '';
  editImagePreviewContainer.classList.add('hidden');
  editUploadPlaceholder.classList.remove('hidden');
}

// Handle Edit Form Submit
async function handleEditFormSubmit(e) {
  e.preventDefault();
  if (!selectedLaporan) return;

  const formData = new FormData(formEditLaporan);

  // Validasi integer client-side
  const kontak = (formData.get('kontakPelapor') || '').trim();
  if (!/^\d+$/.test(kontak)) {
    Swal.fire({
      icon: 'warning',
      title: 'Nomor WhatsApp Tidak Valid',
      text: 'Nomor WhatsApp / HP hanya boleh berupa angka (integer)!'
    });
    return;
  }

  const nim = (formData.get('identitasPelapor') || '').trim();
  if (nim && !/^\d+$/.test(nim)) {
    Swal.fire({
      icon: 'warning',
      title: 'NIM Tidak Valid',
      text: 'NIM / NIP / ID Kampus hanya boleh berupa angka (integer)!'
    });
    return;
  }

  const jam = (formData.get('waktuKejadian') || '').trim();
  if (jam && jam !== '-') {
    const jamNum = parseInt(jam, 10);
    if (!/^\d+$/.test(jam) || isNaN(jamNum) || jamNum < 0 || jamNum > 23) {
      Swal.fire({
        icon: 'warning',
        title: 'Perkiraan Jam Tidak Valid',
        text: 'Perkiraan jam harus berupa angka bulat antara 0 sampai 23 (contoh: 14)!'
      });
      return;
    }
  }

  const btnSubmit = document.getElementById('btnSubmitEdit');
  const originalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...`;

  try {
    const res = await fetch(`/api/laporan/${selectedLaporan.id}`, {
      method: 'PUT',
      body: formData
    });

    const json = await res.json();

    if (json.success) {
      closeModal(modalEditLaporan);

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Diperbarui!',
        text: 'Perubahan data laporan berhasil disimpan ke laporan.json.',
        timer: 1800,
        showConfirmButton: false
      });

      // Update local state dan reload data
      await fetchStats();
      await fetchLaporan();

      // Buka kembali modal detail dengan data terupdate
      openDetailModal(selectedLaporan.id);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memperbarui',
        text: json.message || 'Terjadi kesalahan saat menyimpan perubahan.'
      });
    }
  } catch (error) {
    console.error('Error update laporan:', error);
    Swal.fire({
      icon: 'error',
      title: 'Kesalahan Server',
      text: 'Tidak dapat menghubungi server backend Node.js.'
    });
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = originalText;
  }
}

