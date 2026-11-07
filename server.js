const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Izinkan akses CORS & IP lokal
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// 1. Sajikan static file dari folder proyek
app.use(express.static(__dirname));

// 2. Rute utama
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('File index.html tidak ditemukan di folder proyek!');
    }
});

// Koneksi Database MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_traker_harian', // Sesuaikan jika nama databasemu db_traker_harian / db_tracker_harian
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});

// Helper 1: Ubah string kosong dari frontend menjadi NULL
const parseNull = (val) => (val === "" || val === undefined || val === null) ? null : val;

// Helper 2: Validasi tanggal murni YYYY-MM-DD (Bebas bias zona waktu)
const isFutureDate = (tanggalStr) => {
    if (!tanggalStr || !/^\d{4}-\d{2}-\d{2}$/.test(tanggalStr)) return true;
    
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    return tanggalStr > todayStr;
};

// Helper 3: Validasi ID angka positif
const isValidId = (id) => {
    const parsed = Number(id);
    return Number.isInteger(parsed) && parsed > 0;
};

// =========================================================================
// ROUTE CRUD LATIHAN
// =========================================================================
app.get('/api/latihan', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM latihan WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 40 DAY) ORDER BY tanggal DESC');
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/latihan', async (req, res) => {
    try {
        const { tanggal, kategori, nama_gerakan, set_latihan, repetisi, beban_kg, durasi_menit, catatan } = req.body;
        
        // Cek validasi sebelum INSERT ke database
        if (isFutureDate(tanggal)) {
            return res.status(400).json({ error: 'Tanggal tidak boleh di masa depan!' });
        }

        await db.promise().query(
            'INSERT INTO latihan (tanggal, kategori, nama_gerakan, set_latihan, repetisi, beban_kg, durasi_menit, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [tanggal, kategori, nama_gerakan, parseNull(set_latihan), parseNull(repetisi), parseNull(beban_kg), parseNull(durasi_menit), parseNull(catatan)]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/latihan/:id', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ error: 'ID tidak valid!' });
        const [result] = await db.promise().query('DELETE FROM latihan WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Data latihan tidak ditemukan.' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =========================================================================
// ROUTE CRUD ASUPAN
// =========================================================================
app.get('/api/asupan', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM asupan WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 40 DAY) ORDER BY tanggal DESC');
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/asupan', async (req, res) => {
    try {
        const { tanggal, waktu_konsumsi, nama_item, catatan } = req.body;

        if (isFutureDate(tanggal)) {
            return res.status(400).json({ error: 'Tanggal tidak boleh di masa depan!' });
        }

        await db.promise().query(
            'INSERT INTO asupan (tanggal, waktu_konsumsi, nama_item, catatan) VALUES (?, ?, ?, ?)',
            [tanggal, waktu_konsumsi, nama_item, parseNull(catatan)]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/asupan/:id', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ error: 'ID tidak valid!' });
        const [result] = await db.promise().query('DELETE FROM asupan WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Data asupan tidak ditemukan.' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =========================================================================
// ROUTE CRUD KEGIATAN
// =========================================================================
app.get('/api/kegiatan', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM kegiatan WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 40 DAY) ORDER BY tanggal DESC, waktu_mulai DESC');
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/kegiatan', async (req, res) => {
    try {
        const { tanggal, nama_kegiatan, waktu_mulai, waktu_selesai, catatan } = req.body;

        if (isFutureDate(tanggal)) {
            return res.status(400).json({ error: 'Tanggal tidak boleh di masa depan!' });
        }

        await db.promise().query(
            'INSERT INTO kegiatan (tanggal, nama_kegiatan, waktu_mulai, waktu_selesai, catatan) VALUES (?, ?, ?, ?, ?)',
            [tanggal, nama_kegiatan, waktu_mulai, waktu_selesai, parseNull(catatan)]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/kegiatan/:id', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ error: 'ID tidak valid!' });
        const [result] = await db.promise().query('DELETE FROM kegiatan WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Data kegiatan tidak ditemukan.' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =========================================================================
// LOGIKA UTAMA MAINTENANCE AUTOMATIC
// =========================================================================
async function jalankanMaintenanceLokal() {
    console.log('[MAINTENANCE] Memeriksa kelayakan pembersihan data (> 40 hari)...');
    const connection = await db.promise().getConnection();

    try {
        await connection.beginTransaction();

        const folderArsip = path.join(__dirname, 'archives');
        if (!fs.existsSync(folderArsip)) {
            fs.mkdirSync(folderArsip, { recursive: true });
        }

        const tabelList = ['latihan', 'asupan', 'kegiatan'];
        let totalFileDibuat = 0;
        let totalBarisDihapus = 0;

        const queryBatasMingguUtuh = `SELECT YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 40 DAY), 1) AS batas_minggu`;
        const [resBatas] = await connection.query(queryBatasMingguUtuh);
        const batasMingguVal = resBatas[0].batas_minggu;

        for (const tabel of tabelList) {
            const [mingguList] = await connection.query(`
                SELECT DISTINCT YEARWEEK(tanggal, 1) AS minggu_val 
                FROM ${tabel} 
                WHERE YEARWEEK(tanggal, 1) <= ?
            `, [batasMingguVal]);

            for (const row of mingguList) {
                const mingguVal = row.minggu_val;
                if (!mingguVal) continue;

                const tahun = String(mingguVal).substring(0, 4);
                const mingguKe = String(mingguVal).substring(4);

                const [rowsMentah] = await connection.query(`
                    SELECT * FROM ${tabel} 
                    WHERE YEARWEEK(tanggal, 1) = ?
                    ORDER BY tanggal ASC
                `, [mingguVal]);

                if (rowsMentah.length > 0) {
                    const namaFile = `${tabel}_${tahun}_W${mingguKe.padStart(2, '0')}.json`;
                    const lokasiFile = path.join(folderArsip, namaFile);

                    if (fs.existsSync(lokasiFile)) {
                        let dataLama = [];
                        try {
                            dataLama = JSON.parse(fs.readFileSync(lokasiFile, 'utf-8'));
                        } catch (parseError) {
                            const corruptName = `${lokasiFile}.corrupt-${Date.now()}`;
                            fs.renameSync(lokasiFile, corruptName);
                            console.warn(`[WARNING] File ${namaFile} corrupt! Di-backup ke ${path.basename(corruptName)}`);
                        }

                        const dataGabungan = dataLama.concat(rowsMentah);
                        dataGabungan.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
                        fs.writeFileSync(lokasiFile, JSON.stringify(dataGabungan, null, 2), 'utf-8');
                    } else {
                        fs.writeFileSync(lokasiFile, JSON.stringify(rowsMentah, null, 2), 'utf-8');
                    }

                    if (!fs.existsSync(lokasiFile) || fs.statSync(lokasiFile).size === 0) {
                        throw new Error(`Gagal memverifikasi keutuhan file arsip: ${namaFile}`);
                    }
                    totalFileDibuat++;
                }
            }
        }

        // Rekap Bulanan
        await connection.query(`
            INSERT INTO rekap_bulanan_latihan 
            (bulan_tahun, gym_total_sesi, gym_total_volume_kg, gym_total_reps, kardio_total_sesi, kardio_total_durasi_menit, peregangan_total_sesi)
            SELECT 
                DATE_FORMAT(tanggal, '%Y-%m') AS bulan_tahun,
                SUM(CASE WHEN kategori = 'Gym' THEN 1 ELSE 0 END) AS gym_total_sesi,
                IFNULL(SUM(CASE WHEN kategori = 'Gym' THEN (IFNULL(set_latihan,1) * IFNULL(repetisi,1) * IFNULL(beban_kg,0)) ELSE 0 END), 0) AS gym_total_volume_kg,
                IFNULL(SUM(CASE WHEN kategori = 'Gym' THEN (IFNULL(set_latihan,1) * IFNULL(repetisi,1)) ELSE 0 END), 0) AS gym_total_reps,
                SUM(CASE WHEN kategori = 'Kardio' THEN 1 ELSE 0 END) AS kardio_total_sesi,
                IFNULL(SUM(CASE WHEN kategori = 'Kardio' THEN IFNULL(durasi_menit,0) ELSE 0 END), 0) AS kardio_total_durasi_menit,
                SUM(CASE WHEN kategori = 'Peregangan' THEN 1 ELSE 0 END) AS peregangan_total_sesi
            FROM latihan
            WHERE YEARWEEK(tanggal, 1) <= ?
            GROUP BY DATE_FORMAT(tanggal, '%Y-%m')
            ON DUPLICATE KEY UPDATE 
                gym_total_sesi = VALUES(gym_total_sesi),
                gym_total_volume_kg = VALUES(gym_total_volume_kg),
                gym_total_reps = VALUES(gym_total_reps),
                kardio_total_sesi = VALUES(kardio_total_sesi),
                kardio_total_durasi_menit = VALUES(kardio_total_durasi_menit),
                peregangan_total_sesi = VALUES(peregangan_total_sesi);
        `, [batasMingguVal]);

        await connection.query(`
            INSERT INTO rekap_bulanan_asupan (bulan_tahun, jumlah_hari_puasa, total_makanan_utama)
            SELECT 
                DATE_FORMAT(tanggal, '%Y-%m') AS bulan_tahun,
                COUNT(DISTINCT CASE WHEN waktu_konsumsi IN ('Sahur', 'Buka Puasa', 'Puasa Full') THEN tanggal END) AS jumlah_hari_puasa,
                SUM(CASE WHEN waktu_konsumsi NOT IN ('Cemilan', 'Buka Puasa', 'Minuman') THEN 1 ELSE 0 END) AS total_makanan_utama
            FROM asupan
            WHERE YEARWEEK(tanggal, 1) <= ?
            GROUP BY DATE_FORMAT(tanggal, '%Y-%m')
            ON DUPLICATE KEY UPDATE 
                jumlah_hari_puasa = VALUES(jumlah_hari_puasa),
                total_makanan_utama = VALUES(total_makanan_utama);
        `, [batasMingguVal]);

        await connection.query(`
            INSERT INTO rekap_bulanan_kegiatan (bulan_tahun, total_kegiatan, total_jam_produktif)
            SELECT 
                DATE_FORMAT(tanggal, '%Y-%m') AS bulan_tahun,
                COUNT(*) AS total_kegiatan,
                IFNULL(SUM(
                    CASE 
                        WHEN waktu_selesai < waktu_mulai THEN (TIMESTAMPDIFF(MINUTE, waktu_mulai, waktu_selesai) + 1440) 
                        ELSE TIMESTAMPDIFF(MINUTE, waktu_mulai, waktu_selesai) 
                    END
                ) / 60.0, 0) AS total_jam_produktif
            FROM kegiatan
            WHERE YEARWEEK(tanggal, 1) <= ?
            GROUP BY DATE_FORMAT(tanggal, '%Y-%m')
            ON DUPLICATE KEY UPDATE 
                total_kegiatan = VALUES(total_kegiatan),
                total_jam_produktif = VALUES(total_jam_produktif);
        `, [batasMingguVal]);

        // Purge data mentah
        for (const tabel of tabelList) {
            const [resDelete] = await connection.query(`
                DELETE FROM ${tabel} 
                WHERE YEARWEEK(tanggal, 1) <= ?
            `, [batasMingguVal]);
            totalBarisDihapus += resDelete.affectedRows;
        }

        await connection.commit();

        if (totalBarisDihapus > 0) {
            console.log(`[MAINTENANCE SUKSES] ${totalFileDibuat} file arsip ditulis, ${totalBarisDihapus} baris tua dibersihkan.`);
        } else {
            console.log('[MAINTENANCE] Database masih bersih (belum ada minggu tua > 40 hari yang perlu dibersihkan).');
        }

        return { success: true, totalFileDibuat, totalBarisDihapus };
    } catch (err) {
        await connection.rollback();
        console.error('[MAINTENANCE ERROR]', err.message);
        throw err;
    } finally {
        connection.release();
    }
}

app.post('/api/maintenance/run', async (req, res) => {
    try {
        const hasil = await jalankanMaintenanceLokal();
        res.json({ success: true, message: 'Maintenance selesai', ...hasil });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint Rekap & Arsip Inspector
app.get('/api/rekap/latihan', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM rekap_bulanan_latihan ORDER BY bulan_tahun DESC');
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/rekap/asupan', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM rekap_bulanan_asupan ORDER BY bulan_tahun DESC');
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/rekap/kegiatan', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM rekap_bulanan_kegiatan ORDER BY bulan_tahun DESC');
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/archives/list', (req, res) => {
    const folderArsip = path.join(__dirname, 'archives');
    if (!fs.existsSync(folderArsip)) return res.json({ success: true, files: [] });
    const files = fs.readdirSync(folderArsip).filter(f => f.endsWith('.json'));
    res.json({ success: true, files });
});

app.get('/api/archives/read/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const lokasiFile = path.join(__dirname, 'archives', filename);
    if (!fs.existsSync(lokasiFile)) return res.status(404).json({ success: false, error: 'File arsip tidak ditemukan' });

    try {
        const content = fs.readFileSync(lokasiFile, 'utf-8');
        res.json({ success: true, filename, data: JSON.parse(content) });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Gagal membaca file arsip: ' + err.message });
    }
});

// Jalankan Server Tunggal
const PORT = 3000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server tracker harian berjalan di http://localhost:${PORT}`);
    try {
        await jalankanMaintenanceLokal();
    } catch (e) {}
});