require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});
// Tes Koneksi Database
db.connect((err) => {
    if (err) {
        console.error('Gagal terhubung ke database:', err);
        return;
    }
    console.log('Berhasil terhubung ke database MySQL db_tracker_harian!');
});

// Route dasar (Pintu masuk pertama)
// Endpoint 1: Ambil semua data latihan (GET)
app.get('/api/latihan', (req, res) => {
    const sql = 'SELECT * FROM latihan ORDER BY tanggal DESC, id DESC';
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Endpoint 2: Tambah data latihan baru (POST)
app.post('/api/latihan', (req, res) => {
    const { tanggal, kategori, nama_gerakan, set_latihan, repetisi, beban_kg, durasi_menit, catatan } = req.body;
    
    const sql = `INSERT INTO latihan (tanggal, kategori, nama_gerakan, set_latihan, repetisi, beban_kg, durasi_menit, catatan) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                 
    const values = [tanggal, kategori, nama_gerakan, set_latihan || null, repetisi || null, beban_kg || null, durasi_menit || null, catatan || null];

    db.query(sql, values, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Data latihan berhasil disimpan!', id: result.insertId });
    });
});

// Menyalakan Server
app.listen(port, () => {
    console.log(`Server sedang berjalan di http://localhost:${port}`);
});

// --- ENDPOINT ASUPAN ---
app.get('/api/asupan', (req, res) => {
    const sql = 'SELECT * FROM asupan ORDER BY tanggal DESC, id DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/asupan', (req, res) => {
    const { tanggal, waktu_konsumsi, nama_item, catatan } = req.body;
    const sql = 'INSERT INTO asupan (tanggal, waktu_konsumsi, nama_item, catatan) VALUES (?, ?, ?, ?)';
    db.query(sql, [tanggal, waktu_konsumsi, nama_item, catatan || null], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Asupan berhasil disimpan!', id: result.insertId });
    });
});

// --- ENDPOINT KEGIATAN ---
app.get('/api/kegiatan', (req, res) => {
    const sql = 'SELECT * FROM kegiatan ORDER BY tanggal DESC, id DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/kegiatan', (req, res) => {
    const { tanggal, nama_kegiatan, waktu_mulai, waktu_selesai, catatan } = req.body;
    const sql = 'INSERT INTO kegiatan (tanggal, nama_kegiatan, waktu_mulai, waktu_selesai, catatan) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [tanggal, nama_kegiatan, waktu_mulai || null, waktu_selesai || null, catatan || null], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Kegiatan berhasil disimpan!', id: result.insertId });
    });
});

// --- ENDPOINT HAPUS DATA (Generic DELETE) ---
app.delete('/api/:tabel/:id', (req, res) => {
    const { tabel, id } = req.params;
    // Validasi nama tabel agar aman dari SQL Injection
    if (!['latihan', 'asupan', 'kegiatan'].includes(tabel)) {
        return res.status(400).json({ error: 'Tabel tidak valid' });
    }
    const sql = `DELETE FROM ${tabel} WHERE id = ?`;
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Data berhasil dihapus!' });
    });
});