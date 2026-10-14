const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'laporan.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Pastikan folder uploads tersedia
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Konfigurasi Multer untuk upload foto barang
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `item-${uniqueSuffix}-${safeName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5 MB
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (allowedMime.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung! Hanya diperbolehkan JPG, PNG, WEBP, atau GIF.'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Membaca file laporan.json
function getLaporanData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    console.error('Error membaca laporan.json:', error);
    return [];
  }
}

// Helper: Menyimpan data ke file laporan.json
function saveLaporanData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error menulis laporan.json:', error);
    return false;
  }
}

// Helper: Format tanggal ID (e.g. LF-20261008-XXXX)
function generateId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LF-${year}${month}${day}-${random}`;
}

// --- API ENDPOINTS ---

// 1. GET /api/laporan/stats - Statistik ringkasan
app.get('/api/laporan/stats', (req, res) => {
  const data = getLaporanData();
  const stats = {
    total: data.length,
    kehilangan: data.filter(item => item.tipe === 'kehilangan').length,
    ditemukan: data.filter(item => item.tipe === 'ditemukan').length,
    aktif: data.filter(item => item.status === 'aktif').length,
    selesai: data.filter(item => item.status === 'selesai').length
  };
  res.json({ success: true, data: stats });
});

// 2. GET /api/laporan - Mengambil semua laporan dengan filter & pencarian
app.get('/api/laporan', (req, res) => {
  let data = getLaporanData();
  const { search, tipe, kategori, status, sort } = req.query;

  // Filter Tipe (kehilangan / ditemukan)
  if (tipe && tipe !== 'semua') {
    data = data.filter(item => item.tipe.toLowerCase() === tipe.toLowerCase());
  }

  // Filter Kategori
  if (kategori && kategori !== 'semua') {
    data = data.filter(item => item.kategori.toLowerCase() === kategori.toLowerCase());
  }

  // Filter Status (aktif / selesai)
  if (status && status !== 'semua') {
    data = data.filter(item => item.status.toLowerCase() === status.toLowerCase());
  }

  // Search keyword (judul, deskripsi, lokasi, namaPelapor, identitasPelapor)
  if (search && search.trim() !== '') {
    const keyword = search.trim().toLowerCase();
    data = data.filter(item => {
      const judul = (item.judul || '').toLowerCase();
      const deskripsi = (item.deskripsi || '').toLowerCase();
      const lokasi = (item.lokasi || '').toLowerCase();
      const nama = (item.namaPelapor || '').toLowerCase();
      const identitas = (item.identitasPelapor || '').toLowerCase();
      return (
        judul.includes(keyword) ||
        deskripsi.includes(keyword) ||
        lokasi.includes(keyword) ||
        nama.includes(keyword) ||
        identitas.includes(keyword)
      );
    });
  }

  // Pengurutan (sort)
  if (sort === 'terlama') {
    data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else {
    // Default terbaru
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  res.json({ success: true, count: data.length, data });
});

// 3. GET /api/laporan/:id - Detail 1 laporan
app.get('/api/laporan/:id', (req, res) => {
  const data = getLaporanData();
  const item = data.find(l => l.id === req.params.id);

  if (!item) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
  }

  res.json({ success: true, data: item });
});

// 4. POST /api/laporan - Tambah laporan baru (dengan upload foto)
app.post('/api/laporan', (req, res) => {
  upload.single('foto')(req, res, err => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const {
      tipe,
      judul,
      kategori,
      lokasi,
      tanggalKejadian,
      waktuKejadian,
      deskripsi,
      namaPelapor,
      identitasPelapor,
      kontakPelapor
    } = req.body;

    // Validasi field wajib
    if (!tipe || !judul || !kategori || !lokasi || !tanggalKejadian || !deskripsi || !namaPelapor || !kontakPelapor) {
      // Hapus file yang terupload jika validasi gagal
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({
        success: false,
        message: 'Mohon lengkapi semua kolom wajib!'
      });
    }

    // Validasi No. WhatsApp hanya boleh angka (integer)
    const kontakClean = (kontakPelapor || '').trim();
    if (!/^\d+$/.test(kontakClean)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: 'Nomor WhatsApp / HP hanya boleh berupa angka (integer)!'
      });
    }

    // Validasi NIM / Identitas hanya boleh angka jika diisi
    const identitasClean = (identitasPelapor || '').trim();
    if (identitasClean && !/^\d+$/.test(identitasClean)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: 'NIM / NIP / ID Kampus hanya boleh berupa angka (integer)!'
      });
    }

    // Validasi Perkiraan Jam hanya boleh angka 0 - 23 jika diisi
    let jamClean = (waktuKejadian || '').toString().trim();
    if (jamClean && jamClean !== '-') {
      if (!/^\d+$/.test(jamClean) || parseInt(jamClean, 10) < 0 || parseInt(jamClean, 10) > 23) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          success: false,
          message: 'Perkiraan jam harus berupa angka (integer) antara 0 sampai 23!'
        });
      }
      jamClean = String(parseInt(jamClean, 10));
    } else {
      jamClean = '-';
    }

    const data = getLaporanData();
    const newLaporan = {
      id: generateId(),
      tipe: tipe.toLowerCase(), // 'kehilangan' atau 'ditemukan'
      judul: judul.trim(),
      kategori: kategori.trim(),
      lokasi: lokasi.trim(),
      tanggalKejadian,
      waktuKejadian: jamClean,
      deskripsi: deskripsi.trim(),
      namaPelapor: namaPelapor.trim(),
      identitasPelapor: identitasClean,
      kontakPelapor: kontakClean,
      foto: req.file ? `/uploads/${req.file.filename}` : null,
      status: 'aktif', // 'aktif' atau 'selesai'
      catatanKlaim: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.unshift(newLaporan);
    if (!saveLaporanData(data)) {
      return res.status(500).json({ success: false, message: 'Gagal menyimpan data ke laporan.json' });
    }

    res.status(201).json({
      success: true,
      message: 'Laporan berhasil dipublikasikan!',
      data: newLaporan
    });
  });
});

// 5. PUT /api/laporan/:id - Edit / Update data laporan
app.put('/api/laporan/:id', (req, res) => {
  upload.single('foto')(req, res, err => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const data = getLaporanData();
    const index = data.findIndex(item => item.id === req.params.id);

    if (index === -1) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
    }

    const {
      tipe,
      judul,
      kategori,
      lokasi,
      tanggalKejadian,
      waktuKejadian,
      deskripsi,
      namaPelapor,
      identitasPelapor,
      kontakPelapor,
      hapusFoto
    } = req.body;

    // Validasi field wajib
    if (!tipe || !judul || !kategori || !lokasi || !tanggalKejadian || !deskripsi || !namaPelapor || !kontakPelapor) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({
        success: false,
        message: 'Mohon lengkapi semua kolom wajib!'
      });
    }

    // Validasi No. WhatsApp hanya boleh angka (integer)
    const kontakClean = (kontakPelapor || '').trim();
    if (!/^\d+$/.test(kontakClean)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: 'Nomor WhatsApp / HP hanya boleh berupa angka (integer)!'
      });
    }

    // Validasi NIM / Identitas hanya boleh angka jika diisi
    const identitasClean = (identitasPelapor || '').trim();
    if (identitasClean && !/^\d+$/.test(identitasClean)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: 'NIM / NIP / ID Kampus hanya boleh berupa angka (integer)!'
      });
    }

    // Validasi Perkiraan Jam hanya boleh angka 0 - 23 jika diisi
    let jamClean = (waktuKejadian || '').toString().trim();
    if (jamClean && jamClean !== '-') {
      if (!/^\d+$/.test(jamClean) || parseInt(jamClean, 10) < 0 || parseInt(jamClean, 10) > 23) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          success: false,
          message: 'Perkiraan jam harus berupa angka (integer) antara 0 sampai 23!'
        });
      }
      jamClean = String(parseInt(jamClean, 10));
    } else {
      jamClean = '-';
    }

    const item = data[index];

    // Jika upload foto baru
    if (req.file) {
      if (item.foto) {
        const oldPhotoPath = path.join(__dirname, 'public', item.foto.replace(/^\//, ''));
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlink(oldPhotoPath, () => {});
        }
      }
      item.foto = `/uploads/${req.file.filename}`;
    } else if (hapusFoto === 'true') {
      if (item.foto) {
        const oldPhotoPath = path.join(__dirname, 'public', item.foto.replace(/^\//, ''));
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlink(oldPhotoPath, () => {});
        }
      }
      item.foto = null;
    }

    // Perbarui data teks
    item.tipe = tipe.toLowerCase();
    item.judul = judul.trim();
    item.kategori = kategori.trim();
    item.lokasi = lokasi.trim();
    item.tanggalKejadian = tanggalKejadian;
    item.waktuKejadian = jamClean;
    item.deskripsi = deskripsi.trim();
    item.namaPelapor = namaPelapor.trim();
    item.identitasPelapor = identitasClean;
    item.kontakPelapor = kontakClean;
    item.updatedAt = new Date().toISOString();

    if (!saveLaporanData(data)) {
      return res.status(500).json({ success: false, message: 'Gagal memperbarui file laporan.json' });
    }

    res.json({
      success: true,
      message: 'Laporan berhasil diperbarui!',
      data: item
    });
  });
});

// 6. PATCH /api/laporan/:id/status - Update status laporan (klaim/selesai)
app.patch('/api/laporan/:id/status', (req, res) => {
  const { status, catatanKlaim } = req.body;
  if (!status || !['aktif', 'selesai'].includes(status.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Status tidak valid! Harus "aktif" atau "selesai".' });
  }

  const data = getLaporanData();
  const index = data.findIndex(item => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
  }

  data[index].status = status.toLowerCase();
  if (catatanKlaim !== undefined) {
    data[index].catatanKlaim = catatanKlaim.trim();
  }
  data[index].updatedAt = new Date().toISOString();

  if (!saveLaporanData(data)) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui file laporan.json' });
  }

  res.json({
    success: true,
    message: `Status laporan berhasil diubah menjadi ${status}!`,
    data: data[index]
  });
});

// 6. DELETE /api/laporan/:id - Hapus laporan
app.delete('/api/laporan/:id', (req, res) => {
  const data = getLaporanData();
  const index = data.findIndex(item => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
  }

  const removedItem = data[index];

  // Hapus foto terkait jika ada
  if (removedItem.foto) {
    const photoPath = path.join(__dirname, 'public', removedItem.foto.replace(/^\//, ''));
    if (fs.existsSync(photoPath)) {
      fs.unlink(photoPath, err => {
        if (err) console.error('Gagal menghapus file foto:', err);
      });
    }
  }

  data.splice(index, 1);
  if (!saveLaporanData(data)) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus data dari laporan.json' });
  }

  res.json({ success: true, message: 'Laporan berhasil dihapus!', id: req.params.id });
});

// Fallback jika akses selain API -> kirim index.html (kompatibel Express 4 & 5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const os = require('os');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Jalankan server pada semua antarmuka jaringan (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`======================================================`);
  console.log(`Portal Lost & Found Kampus Aktif Berjalan!`);
  console.log(`Akses Lokal (Laptop ini): http://localhost:${PORT}`);
  console.log(`Akses WiFi Kampus (HP/Teman): http://${localIp}:${PORT}`);
  console.log(`File Database: ${DATA_FILE}`);
  console.log(`======================================================`);
});
