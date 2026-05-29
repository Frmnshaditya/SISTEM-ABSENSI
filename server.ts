import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import qrCode from "qrcode";

// Define absolute path to local JSON database
const DB_PATH = path.resolve(process.cwd(), "db.json");

// Define interfaces for our database structure
interface User {
  id: string;
  nama: string;
  email: string;
  passwordHash: string;
  role: "guru";
}

interface Siswa {
  id: string;
  nama: string;
  kelas: string;
  nis: string;
  qrCodeData: string;
}

interface Absensi {
  id: string;
  siswaId: string;
  tanggal: string; // YYYY-MM-DD
  jam: string;     // HH:MM:SS
  status: "Hadir" | "Terlambat";
  mapel?: string;   // Mata Pelajaran
}

interface Mapel {
  nama: string;
  aktif: boolean;
}

interface Database {
  users: User[];
  siswa: Siswa[];
  absensi: Absensi[];
  kelas?: string[];
  mapel?: (string | Mapel)[]; // Daftar Mata Pelajaran (can be strings or Mapel objects initially)
  pengaturan: {
    jamMasuk: string; // "HH:MM", e.g. "07:15"
    namaSekolah: string;
  };
}

// Default Seed Data
const DEFAULT_DATABASE: Database = {
  users: [
    {
      id: "usr_1",
      nama: "Budi Utomo, S.Pd.",
      email: "guru@sekolah.sch.id",
      passwordHash: "password123", // Simple plain check for sandboxed ease-of-use
      role: "guru"
    },
    {
    "id": "usr_2",
    "nama": "Anshori, S.Pd.",
    "email": "guru@sekolah.co.id",
    "passwordHash": "password123",
    "role": "guru"
  }
  ],
  siswa: [
    { id: "sis_1", nama: "Ahmad Fauzi", kelas: "XII-IPA-1", nis: "10021", qrCodeData: "ABS-10021" },
    { id: "sis_2", nama: "Siti Aminah", kelas: "XII-IPA-1", nis: "10022", qrCodeData: "ABS-10022" },
    { id: "sis_3", nama: "Budi Santoso", kelas: "XII-IPA-2", nis: "10023", qrCodeData: "ABS-10023" },
    { id: "sis_4", nama: "Dewi Lestari", kelas: "XII-IPA-2", nis: "10024", qrCodeData: "ABS-10024" },
    { id: "sis_5", nama: "Rian Hidayat", kelas: "XI-IPS-1", nis: "10025", qrCodeData: "ABS-10025" },
    { id: "sis_6", nama: "Laney Wahyuni", kelas: "XI-IPS-1", nis: "10026", qrCodeData: "ABS-10026" },
    { id: "sis_7", nama: "Eko Prasetyo", kelas: "XI-IPS-2", nis: "10027", qrCodeData: "ABS-10027" },
    { id: "sis_8", nama: "Farida Utami", kelas: "XI-IPS-2", nis: "10028", qrCodeData: "ABS-10028" },
    { id: "sis_9", nama: "Guntur Wibowo", kelas: "X-MIPA-1", nis: "10029", qrCodeData: "ABS-10029" },
    { id: "sis_10", nama: "Hendra Wijaya", kelas: "X-MIPA-1", nis: "10030", qrCodeData: "ABS-10030" },
    { id: "sis_11", nama: "Indah Permata", kelas: "X-MIPA-2", nis: "10031", qrCodeData: "ABS-10031" },
    { id: "sis_12", nama: "Joko Susilo", kelas: "X-MIPA-2", nis: "10032", qrCodeData: "ABS-10032" },
    { id: "sis_13", nama: "Kartika Sari", kelas: "X-IPS-1", nis: "10033", qrCodeData: "ABS-10033" },
    { id: "sis_14", nama: "Lukman Hakim", kelas: "X-IPS-1", nis: "10034", qrCodeData: "ABS-10034" },
    { id: "sis_15", nama: "Megawati Putri", kelas: "X-IPS-2", nis: "10035", qrCodeData: "ABS-10035" },
  ],
  kelas: [
    "X-MIPA-1",
    "X-MIPA-2",
    "X-IPS-1",
    "X-IPS-2",
    "XI-MIPA-1",
    "XI-IPS-1",
    "XII-IPA-1",
    "XII-IPA-2"
  ],
  absensi: [
    // Seed some general historical scans for today to make charts fully interactive
    // Today's date will be generated dynamically on load in local format
  ],
  pengaturan: {
    jamMasuk: "07:15",
    namaSekolah: "SMA IT CORDOVA 174"
  }
};

// Helper: Read database from disk
function readDB(): Database {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Setup default database & populate today's initial logs
      const initialDb = { ...DEFAULT_DATABASE };
      // Inject some initial historical scans for "Today" so dashboard doesn't start completely barren
      const today = new Date().toISOString().split("T")[0];
      initialDb.absensi = [
        { id: "abs_1", siswaId: "sis_1", tanggal: today, jam: "07:02:15", status: "Hadir" },
        { id: "abs_2", siswaId: "sis_2", tanggal: today, jam: "07:05:43", status: "Hadir" },
        { id: "abs_3", siswaId: "sis_5", tanggal: today, jam: "07:23:12", status: "Terlambat" },
        { id: "abs_4", siswaId: "sis_6", tanggal: today, jam: "07:35:00", status: "Terlambat" },
        { id: "abs_5", siswaId: "sis_9", tanggal: today, jam: "06:58:32", status: "Hadir" },
      ];
      fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf-8");
      return initialDb;
    }
    const data = fs.readFileSync(DB_PATH, "utf-8");
    const db: Database = JSON.parse(data);
    if (!db.kelas) {
      const defaultClasses = ["X-MIPA-1", "X-MIPA-2", "X-IPS-1", "X-IPS-2", "XI-MIPA-1", "XI-IPS-1", "XII-IPA-1", "XII-IPA-2"];
      const existingClasses = Array.from(new Set(db.siswa.map(s => s.kelas))).filter(Boolean);
      db.kelas = Array.from(new Set([...defaultClasses, ...existingClasses])).sort();
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    }
    if (!db.mapel) {
      db.mapel = [
        "Matematika",
        "Bahasa Indonesia",
        "Bahasa Inggris",
        "Fisika",
        "Kimia",
        "Biologi",
        "Sejarah",
        "Pendidikan Agama",
        "Pendidikan Pancasila",
        "PJOK",
        "Seni Budaya",
        "Informatika"
      ].sort().map(nama => ({ nama, aktif: true }));
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    } else {
      let isChanged = false;
      const normalizedMapel: Mapel[] = db.mapel.map((item) => {
        if (typeof item === "string") {
          isChanged = true;
          return { nama: item, aktif: true };
        }
        return item;
      });
      if (isChanged) {
        db.mapel = normalizedMapel;
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
      }
    }
    return db;
  } catch (error) {
    console.error("Failed to read database file, loading fallback structure:", error);
    return DEFAULT_DATABASE;
  }
}

// Helper: Save database to disk
function writeDB(db: Database) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write database file:", error);
  }
}

// Active Server-Sent Events subscribers
let sseClients: { id: number; res: express.Response }[] = [];
let clientIndex = 0;

function broadcastEvent(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach((client) => {
    client.res.write(`data: ${payload}\n\n`);
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // SSE Real-time updates subscription endpoint
  app.get("/api/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    res.write("retry: 5000\n\n");

    const myId = ++clientIndex;
    sseClients.push({ id: myId, res });
    console.log(`SSE subscriber joined. Total clients active: ${sseClients.length}`);

    req.on("close", () => {
      sseClients = sseClients.filter((client) => client.id !== myId);
      console.log(`SSE subscriber disconnected. Remaining clients: ${sseClients.length}`);
    });
  });

  // API Route: Authentication
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === (email || "").toLowerCase() && u.passwordHash === password
    );

    if (user) {
      res.json({
        success: true,
        token: `mock_jwt_session_token_for_${user.id}`,
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      res.status(401).json({ success: false, message: "Email atau password Guru tidak terdaftar!" });
    }
  });

  // API Route: Get Settings (Pengaturan)
  app.get("/api/settings", (req, res) => {
    const db = readDB();
    res.json(db.pengaturan);
  });

  // API Route: Update Settings (Pengaturan)
  app.post("/api/settings", (req, res) => {
    const { jamMasuk, namaSekolah } = req.body;
    if (!jamMasuk || !namaSekolah) {
      return res.status(400).json({ success: false, message: "Jam masuk dan nama sekolah wajib diisi" });
    }
    const db = readDB();
    db.pengaturan = { jamMasuk, namaSekolah };
    writeDB(db);
    res.json({ success: true, settings: db.pengaturan });
  });

  // API Route: Get all Classrooms (Kelas)
  app.get("/api/kelas", (req, res) => {
    const db = readDB();
    if (!db.kelas) {
      const defaultClasses = ["X-MIPA-1", "X-MIPA-2", "X-IPS-1", "X-IPS-2", "XI-MIPA-1", "XI-IPS-1", "XII-IPA-1", "XII-IPA-2"];
      const existingClasses = Array.from(new Set(db.siswa.map((s) => s.kelas))).filter(Boolean);
      db.kelas = Array.from(new Set([...defaultClasses, ...existingClasses])).sort();
      writeDB(db);
    }
    res.json(db.kelas);
  });

  // API Route: Add Class (Kelas)
  app.post("/api/kelas", (req, res) => {
    const { nama } = req.body;
    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: "Nama kelas wajib diisi!" });
    }

    const cleanNama = nama.trim().toUpperCase();
    const db = readDB();
    
    if (!db.kelas) {
      db.kelas = ["X-MIPA-1", "X-MIPA-2", "X-IPS-1", "X-IPS-2", "XI-MIPA-1", "XI-IPS-1", "XII-IPA-1", "XII-IPA-2"];
    }

    if (db.kelas.includes(cleanNama)) {
      return res.status(400).json({ success: false, message: `Kelas ${cleanNama} sudah terdaftar!` });
    }

    db.kelas.push(cleanNama);
    db.kelas.sort();
    writeDB(db);

    broadcastEvent("KELAS_ADDED", { nama: cleanNama });
    res.json({ success: true, kelas: db.kelas });
  });

  // API Route: Delete Class (Kelas)
  app.delete("/api/kelas/:nama", (req, res) => {
    const { nama } = req.params;
    const decodedNama = decodeURIComponent(nama).trim();
    const db = readDB();

    if (!db.kelas) {
      db.kelas = ["X-MIPA-1", "X-MIPA-2", "X-IPS-1", "X-IPS-2", "XI-MIPA-1", "XI-IPS-1", "XII-IPA-1", "XII-IPA-2"];
    }

    const index = db.kelas.indexOf(decodedNama);
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Kelas tidak ditemukan!" });
    }

    // Protect if students still exist in class
    const studentsInClass = db.siswa.filter((s) => s.kelas === decodedNama);
    if (studentsInClass.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Gagal menghapus! Kelas "${decodedNama}" masih memiliki ${studentsInClass.length} siswa aktif. Silakan kosongkan siswa di kelas tersebut terlebih dahulu.`
      });
    }

    db.kelas.splice(index, 1);
    writeDB(db);

    broadcastEvent("KELAS_DELETED", { nama: decodedNama });
    res.json({ success: true, kelas: db.kelas });
  });

  // API Route: Get all Subjects (Mata Pelajaran)
  app.get("/api/mapel", (req, res) => {
    const db = readDB();
    res.json(db.mapel || []);
  });

  // API Route: Add Subject (Mata Pelajaran)
  app.post("/api/mapel", (req, res) => {
    const { nama } = req.body;
    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: "Nama mata pelajaran wajib diisi!" });
    }

    const cleanNama = nama.trim();
    const db = readDB();
    const mapelList = (db.mapel || []) as Mapel[];
    
    // case-insensitive check
    if (mapelList.some(m => m.nama.toLowerCase() === cleanNama.toLowerCase())) {
      return res.status(400).json({ success: false, message: `Mata pelajaran ${cleanNama} sudah terdaftar!` });
    }

    const newMapel: Mapel = { nama: cleanNama, aktif: true };
    db.mapel = [...mapelList, newMapel].sort((a, b) => a.nama.localeCompare(b.nama));
    writeDB(db);

    broadcastEvent("MAPEL_ADDED", { nama: cleanNama });
    res.json({ success: true, mapel: db.mapel });
  });

  // API Route: Delete Subject (Mata Pelajaran)
  app.delete("/api/mapel/:nama", (req, res) => {
    const { nama } = req.params;
    const decodedNama = decodeURIComponent(nama).trim();
    const db = readDB();

    const mapelList = (db.mapel || []) as Mapel[];
    const index = mapelList.findIndex(m => m.nama.toLowerCase() === decodedNama.toLowerCase());
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Mata pelajaran tidak ditemukan!" });
    }

    // Protect if some logs still use this subject
    const logsWithMapel = db.absensi.filter(a => (a.mapel || "Matematika").toLowerCase() === decodedNama.toLowerCase());
    if (logsWithMapel.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Gagal menghapus! Mata pelajaran "${decodedNama}" masih memiliki ${logsWithMapel.length} riwayat absensi tercatat.`
      });
    }

    mapelList.splice(index, 1);
    db.mapel = mapelList;
    writeDB(db);

    broadcastEvent("MAPEL_DELETED", { nama: decodedNama });
    res.json({ success: true, mapel: db.mapel });
  });

  // API Route: Toggle Subject Active Status
  app.post("/api/mapel/toggle", (req, res) => {
    const { nama, aktif } = req.body;
    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: "Nama mata pelajaran wajib diisi!" });
    }

    const db = readDB();
    const mapelList = (db.mapel || []) as Mapel[];
    const cleanNama = nama.trim();
    const item = mapelList.find(m => m.nama.toLowerCase() === cleanNama.toLowerCase());
    if (!item) {
      return res.status(404).json({ success: false, message: "Mata pelajaran tidak ditemukan!" });
    }

    item.aktif = !!aktif;
    db.mapel = mapelList;
    writeDB(db);

    broadcastEvent("MAPEL_TOGGLED", { nama: item.nama, aktif: item.aktif });
    res.json({ success: true, mapel: db.mapel });
  });

  // API Route: Get all Students (Siswa)
  app.get("/api/siswa", (req, res) => {
    const db = readDB();
    res.json(db.siswa);
  });

  // API Route: Add single Student
  app.post("/api/siswa", (req, res) => {
    const { nama, kelas, nis } = req.body;
    if (!nama || !kelas || !nis) {
      return res.status(400).json({ success: false, message: "Mohon isi komplit Nama, Kelas, dan NIS siswa!" });
    }

    const db = readDB();
    // Validate duplicate NIS
    if (db.siswa.some((s) => s.nis === nis)) {
      return res.status(400).json({ success: false, message: `NIS ${nis} sudah terdaftar dengan siswa lain!` });
    }

    const newSiswa: Siswa = {
      id: `sis_${Date.now()}`,
      nama,
      kelas,
      nis,
      qrCodeData: `ABS-${nis}`,
    };

    db.siswa.push(newSiswa);
    writeDB(db);

    broadcastEvent("SISWA_ADDED", newSiswa);
    res.json({ success: true, siswa: newSiswa });
  });

  // API Route: Delete Student
  app.delete("/api/siswa/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const originalCount = db.siswa.length;
    db.siswa = db.siswa.filter((s) => s.id !== id);

    // Also optionally keep attendance records or delete them
    db.absensi = db.absensi.filter((a) => a.siswaId !== id);

    if (db.siswa.length === originalCount) {
      return res.status(404).json({ success: false, message: "Siswa tidak ditemukan!" });
    }

    writeDB(db);
    broadcastEvent("SISWA_DELETED", { id });
    res.json({ success: true, id });
  });

  // API Route: Bulk Import Students
  app.post("/api/siswa/import", (req, res) => {
    const { list } = req.body; // Expects array of { nama, kelas, nis }
    if (!Array.isArray(list)) {
      return res.status(400).json({ success: false, message: "Data format tidak valid (harus array!)" });
    }

    const db = readDB();
    let imported = 0;
    let skipped = 0;

    list.forEach((item: any) => {
      const { nama, kelas, nis } = item;
      if (!nama || !kelas || !nis) {
        skipped++;
        return;
      }

      // Check if NIS already exists in DB or current upload
      const cleanNis = String(nis).trim();
      const duplicate = db.siswa.some((s) => s.nis === cleanNis);
      if (duplicate) {
        skipped++;
        return;
      }

      db.siswa.push({
        id: `sis_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        nama: String(nama).trim(),
        kelas: String(kelas).trim(),
        nis: cleanNis,
        qrCodeData: `ABS-${cleanNis}`,
      });
      imported++;
    });

    writeDB(db);
    broadcastEvent("SISWA_IMPORTED", { imported });
    res.json({ success: true, message: `Berhasil import ${imported} siswa. Skip ${skipped} siswa (karena duplikat/data kurang).` });
  });

  // API Route: Reset All Database (Re-populate templates)
  app.post("/api/siswa/reset-all", (req, res) => {
    const db = { ...DEFAULT_DATABASE };
    const today = new Date().toISOString().split("T")[0];
    db.absensi = [
      { id: "abs_1", siswaId: "sis_1", tanggal: today, jam: "07:02:15", status: "Hadir" },
      { id: "abs_2", siswaId: "sis_2", tanggal: today, jam: "07:05:43", status: "Hadir" },
      { id: "abs_3", siswaId: "sis_5", tanggal: today, jam: "07:23:12", status: "Terlambat" },
      { id: "abs_4", siswaId: "sis_6", tanggal: today, jam: "07:35:00", status: "Terlambat" },
      { id: "abs_5", siswaId: "sis_9", tanggal: today, jam: "06:58:32", status: "Hadir" },
    ];
    writeDB(db);
    broadcastEvent("DATABASE_RESET", null);
    res.json({ success: true, message: "Database kembali ke pengaturan default pabrik." });
  });

  // API Route: Serve student QR code dynamically
  app.get("/api/siswa/:id/qr", async (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const s = db.siswa.find((siswa) => siswa.id === id);
    if (!s) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }

    try {
      // Dynamic clean QR generator response
      const dataUrl = await qrCode.toDataURL(s.qrCodeData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0f172a", // Slate 900
          light: "#ffffff",
        },
      });
      // Pipe it out as a responsive base64 response or directly binary image
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(500).json({ error: "Invalid QR generation" });
      }

      const buffer = Buffer.from(matches[2], 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      });
      res.end(buffer);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate QR Code" });
    }
  });

  // API Route: Get attendance logs (Absensi)
  app.get("/api/absensi", (req, res) => {
    const db = readDB();
    res.json(db.absensi);
  });

  // API Route: Delete/Clear attendance history
  app.delete("/api/absensi/clear", (req, res) => {
    const db = readDB();
    db.absensi = [];
    writeDB(db);
    broadcastEvent("ABSENSI_CLEARED", null);
    res.json({ success: true });
  });

  // API Route: Validate & Scan QR Code
  app.post("/api/scan", (req, res) => {
    const { qrData, forcedTime, mapel } = req.body;
    if (!qrData) {
      return res.status(400).json({ success: false, message: "Data QR-Code kosong!" });
    }

    const db = readDB();
    // Determine active subject
    let activeMapel = "Matematika";
    if (mapel) {
      activeMapel = mapel;
    } else if (db.mapel && db.mapel.length > 0) {
      const first = db.mapel[0];
      activeMapel = typeof first === "string" ? first : first.nama;
    }

    // Verify if subject is active
    if (db.mapel) {
      const foundItem = db.mapel.find((m) => {
        const mName = typeof m === "string" ? m : m.nama;
        return mName.toLowerCase() === activeMapel.toLowerCase();
      });
      if (foundItem && typeof foundItem !== "string" && !foundItem.aktif) {
        return res.status(400).json({ success: false, message: `Scan gagal! Pelajaran "${activeMapel}" sedang dinonaktifkan.` });
      }
    }

    // 1. Search matching student by qrCodeData
    const student = db.siswa.find((s) => s.qrCodeData === qrData || s.nis === qrData);
    if (!student) {
      return res.status(404).json({ success: false, message: "Scan gagal! QR-Code rusak atau siswa tidak terdaftar!" });
    }

    // 2. Identify dates and times
    // We can simulate dates dynamically or use standard sever date
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Time computations
    let hoursStr = String(now.getHours()).padStart(2, "0");
    let minsStr = String(now.getMinutes()).padStart(2, "0");
    let secsStr = String(now.getSeconds()).padStart(2, "0");
    let jamStr = `${hoursStr}:${minsStr}:${secsStr}`;

    // If simulated check for scanning (used in testing if required)
    if (forcedTime) {
      jamStr = forcedTime; // format "HH:MM:SS"
    }

    // 3. Anti-double scan (cannot scan twice in the exact same day for the exact same subject)
    const alreadyScanned = db.absensi.some(
      (a) => a.siswaId === student.id && a.tanggal === todayStr && (a.mapel || "Matematika") === activeMapel
    );

    if (alreadyScanned) {
      const pastLog = db.absensi.find(
        (a) => a.siswaId === student.id && a.tanggal === todayStr && (a.mapel || "Matematika") === activeMapel
      );
      return res.json({
        success: false,
        message: `${student.nama} sudah absensi untuk mapel ${activeMapel} hari ini pada jam ${pastLog?.jam}. Mencegah double scan!`,
        student,
      });
    }

    // 4. Determine Status (Hadir / Terlambat)
    // jamMasuk is formatted as "HH:MM" -> e.g. "07:15"
    const limitParts = db.pengaturan.jamMasuk.split(":");
    const limitHour = parseInt(limitParts[0]);
    const limitMin = parseInt(limitParts[1]);

    const scanParts = jamStr.split(":");
    const scanHour = parseInt(scanParts[0]);
    const scanMin = parseInt(scanParts[1]);

    let status: "Hadir" | "Terlambat" = "Hadir";
    if (scanHour > limitHour || (scanHour === limitHour && scanMin > limitMin)) {
      status = "Terlambat";
    }

    // 5. Create absolute persistent ledger entry
    const newLog: Absensi = {
      id: `abs_${Date.now()}`,
      siswaId: student.id,
      tanggal: todayStr,
      jam: jamStr,
      status: status,
      mapel: activeMapel,
    };

    db.absensi.push(newLog);
    writeDB(db);

    // 6. Broadcast to SSE Stream (For instant UI layout update on Guru's Dashboard and Scanner page!)
    broadcastEvent("SCAN_SUCCESS", {
      student,
      attendance: newLog,
    });

    res.json({
      success: true,
      message: `${student.nama} (${student.kelas}) berhasil absensi untuk pelajaran ${activeMapel}!`,
      student,
      attendance: newLog,
    });
  });

  // API Route: Get Summary Stats
  app.get("/api/stats", (req, res) => {
    const db = readDB();
    const todayStr = new Date().toISOString().split("T")[0];

    const todayAbsensi = db.absensi.filter((a) => a.tanggal === todayStr);
    const totalSiswa = db.siswa.length;
    const hadir = todayAbsensi.filter((a) => a.status === "Hadir").length;
    const terlambat = todayAbsensi.filter((a) => a.status === "Terlambat").length;
    const totalHadir = hadir + terlambat;
    const belumHadir = Math.max(0, totalSiswa - totalHadir);

    res.json({
      totalSiswa,
      hadir,
      terlambat,
      belumHadir,
      todayStr,
    });
  });

  // Vite Integration context check
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ABSENSI-SERVER] Live and listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
